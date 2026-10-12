// Leer: la pestaña de lectura.
//   - Sin capítulo elegido (#leer): tus libros, con "Seguir leyendo" donde quedaste.
//   - Un capítulo (#leer?m=<mapa>&c=<concepto>[&p=<párrafo>]): el texto, con lo que resaltaste pintado.
//     Al seleccionar una palabra u oración aparece un menú: Diccionario (Wikcionario, gratis), resaltar en azul, rojo o
//     verde, Explicar (la IA lo dice con otras palabras; 1 del cupo) y Nota. Tocar un resaltado abre su panel: la
//     explicación (si la pediste), el color, tu nota y "Quitar".
import * as d from "../datos.js?v=b86f2e9674";
import * as ia from "../ia.js?v=b86f2e9674";
import { buscarPalabra } from "../diccionario.js?v=b86f2e9674";
import { COLORES_RESALTADO, COSTOS_IA, PREFIJO, TOPES } from "../config.js?v=b86f2e9674";
import { esc, vacio, aviso } from "../ui.js?v=b86f2e9674";

const CLAVE_ULTIMO = `${PREFIJO}-ultimo-leido`;

function ultimoLeido() {
    try {
        return JSON.parse(localStorage.getItem(CLAVE_ULTIMO) ?? "{}") ?? {};
    } catch {
        return {};
    }
}

function anotarLeido(mapaId, conceptoId) {
    try {
        localStorage.setItem(CLAVE_ULTIMO, JSON.stringify({ ...ultimoLeido(), [mapaId]: conceptoId }));
    } catch {
        // sin guardado: no se recuerda dónde quedaste
    }
}

const dirLeer = (m, c) => `#leer?m=${encodeURIComponent(m)}&c=${encodeURIComponent(c)}`;

export function vistaLeer(cont, { redibujar }) {
    const p = new URLSearchParams(location.hash.split("?")[1] ?? "");
    if (!p.get("m") || !p.get("c")) return tusLibros(cont);
    return capitulo(cont, { mapaId: p.get("m"), conceptoId: p.get("c"), marcado: Number.parseInt(p.get("p") ?? "", 10), redibujar });
}

// ---------- Tus libros ----------

function tusLibros(cont) {
    const libros = d.listarMapas().filter((m) => m.modo === "libro");
    const ultimo = ultimoLeido();
    cont.innerHTML = `
        <h1>Leer</h1>
        ${libros.length ? `<ul class="lista">${libros.map((m) => {
            const { conceptos } = d.leerMapa(m.id);
            const caps = conceptos.filter((c) => Number.isInteger(c.capitulo)).sort((a, b) => a.capitulo - b.capitulo);
            const seguir = caps.find((c) => c.id === ultimo[m.id]) ?? caps[0];
            return `
            <li class="tarjeta libro-tarjeta">
                <strong>📖 ${esc(m.tema)}</strong>
                <span class="ayuda">${caps.length} capítulos · ${m.avance.aprendidos} aprendidos</span>
                ${seguir ? `<p><a class="boton" href="${esc(dirLeer(m.id, seguir.id))}">${ultimo[m.id] ? "Seguir leyendo" : "Empezar"}: ${esc(seguir.titulo)}</a></p>` : ""}
            </li>`;
        }).join("")}</ul>`
        : vacio("Todavía no subiste libros", "En Inicio, \"Estudiar un libro (EPUB)\". Hay miles gratis y legales en Project Gutenberg.")}
        <p><a href="#inicio">Subir un libro</a></p>`;
}

// ---------- Un capítulo ----------

function capitulo(cont, { mapaId, conceptoId, marcado }) {
    let concepto;
    let libro;
    try {
        concepto = d.leerConcepto(conceptoId);
        libro = d.leerLibro(mapaId);
    } catch {
        cont.innerHTML = vacio("No se encontró ese capítulo", "Volvé a Leer y elegilo de la lista.");
        return;
    }
    const cap = libro.capitulos[concepto.capitulo];
    if (!cap || concepto.mapa !== mapaId) {
        cont.innerHTML = vacio("No se encontró ese capítulo", "Volvé a Leer y elegilo de la lista.");
        return;
    }
    anotarLeido(mapaId, conceptoId);
    const { conceptos } = d.leerMapa(mapaId);
    const capitulos = conceptos.filter((c) => Number.isInteger(c.capitulo)).sort((a, b) => a.capitulo - b.capitulo);
    const pos = capitulos.findIndex((c) => c.id === conceptoId);
    const anterior = capitulos[pos - 1];
    const siguiente = capitulos[pos + 1];

    cont.innerHTML = `
        <article class="lectura">
            <p class="lectura__libro">${esc(libro.titulo)}${libro.autor ? ` · ${esc(libro.autor)}` : ""} · capítulo ${pos + 1} de ${capitulos.length}</p>
            <h1>${esc(cap.titulo)}</h1>
            <p class="ayuda lectura__ayuda">Seleccioná una palabra o una oración para buscarla en el diccionario, resaltarla, pedir que te la expliquen o anotar algo.</p>
            <div class="lectura__texto" data-texto></div>
            <nav class="lectura__nav acciones">
                ${anterior ? `<a class="boton boton--chico" href="${esc(dirLeer(mapaId, anterior.id))}">← ${esc(anterior.titulo)}</a>` : ""}
                <a class="boton" href="#estudio?m=${esc(encodeURIComponent(mapaId))}&c=${esc(encodeURIComponent(conceptoId))}&v=ficha">Ir a la ficha de este capítulo</a>
                ${siguiente ? `<a class="boton boton--chico" href="${esc(dirLeer(mapaId, siguiente.id))}">${esc(siguiente.titulo)} →</a>` : ""}
            </nav>
        </article>
        <div class="menu-seleccion" data-menu hidden></div>
        <div class="hoja" data-hoja hidden></div>`;

    const lugar = cont.querySelector("[data-texto]");
    const menu = cont.querySelector("[data-menu]");
    const hoja = cont.querySelector("[data-hoja]");
    let seleccion = null; // { parrafo, inicio, fin, texto, rect }

    function pintar() {
        const resaltados = d.resaltadosDe({ concepto: conceptoId });
        lugar.innerHTML = cap.parrafos.map((t, i) => {
            const propios = resaltados.filter((r) => r.parrafo === i);
            return `<p data-p="${i}" ${i === marcado ? 'class="lectura__marcado" id="marcado"' : ""}>${conResaltados(t, propios)}</p>`;
        }).join("");
    }
    pintar();
    if (Number.isInteger(marcado)) cont.querySelector("#marcado")?.scrollIntoView({ block: "center" });
    else scrollTo(0, 0);

    // ----- Selección → menú -----
    function leerSeleccion() {
        const sel = getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
        const rango = sel.getRangeAt(0);
        const parrafoDe = (nodo) => (nodo.nodeType === 1 ? nodo : nodo.parentElement)?.closest("[data-p]");
        const pIni = parrafoDe(rango.startContainer);
        const pFin = parrafoDe(rango.endContainer);
        if (!pIni || !lugar.contains(pIni)) return null;
        // Solo dentro de un párrafo (el triple clic termina en el comienzo del siguiente: se toma hasta el final)
        const hastaElFinal = pFin !== pIni && rango.endOffset === 0;
        if (pFin !== pIni && !hastaElFinal) return null;
        const antes = document.createRange();
        antes.selectNodeContents(pIni);
        antes.setEnd(rango.startContainer, rango.startOffset);
        const textoP = pIni.textContent;
        let inicio = antes.toString().length;
        let fin = hastaElFinal ? textoP.length : inicio + rango.toString().length;
        while (inicio < fin && /\s/.test(textoP[inicio])) inicio++;
        while (fin > inicio && /\s/.test(textoP[fin - 1])) fin--;
        if (fin <= inicio || fin - inicio > TOPES.resaltadoTexto) return null;
        return { parrafo: Number(pIni.dataset.p), inicio, fin, texto: textoP.slice(inicio, fin), rect: rango.getBoundingClientRect() };
    }

    function mostrarMenu() {
        seleccion = leerSeleccion();
        if (!seleccion) {
            menu.hidden = true;
            return;
        }
        const unaPalabra = !/\s/.test(seleccion.texto) && seleccion.texto.length <= 40;
        menu.innerHTML = `
            ${unaPalabra ? `<button class="boton boton--chico" data-sel="diccionario">📖 Diccionario</button>` : ""}
            ${Object.keys(COLORES_RESALTADO).map((c) => `<button class="punto punto--${c}" data-sel="color" data-color="${c}" aria-label="Resaltar en ${COLORES_RESALTADO[c].toLowerCase()}"></button>`).join("")}
            ${ia.conectada() ? `<button class="boton boton--chico" data-sel="explicar">💡 Explicar</button>` : ""}
            <button class="boton boton--chico" data-sel="nota">📝 Nota</button>`;
        menu.hidden = false;
        // Debajo de lo seleccionado (arriba suele estar el menú del celular); si no entra, arriba
        const r = seleccion.rect;
        const ancho = Math.min(menu.offsetWidth || 280, innerWidth - 16);
        const alto = menu.offsetHeight || 44;
        menu.style.left = `${Math.max(8, Math.min(innerWidth - ancho - 8, r.left + r.width / 2 - ancho / 2))}px`;
        const piso = innerHeight - (document.querySelector("#menu")?.offsetHeight ?? 0); // sin tapar el menú de abajo
        menu.style.top = `${r.bottom + alto + 8 < piso ? r.bottom + 8 : Math.max(8, r.top - alto - 8)}px`;
    }
    // Tocar el menú no tiene que borrar lo seleccionado
    menu.addEventListener("pointerdown", (e) => e.preventDefault());
    const alDesplazar = () => {
        if (!document.body.contains(lugar)) return removeEventListener("scroll", alDesplazar);
        menu.hidden = true;
    };
    addEventListener("scroll", alDesplazar, { passive: true });
    // Con el teclado: Enter sobre un resaltado lo abre
    lugar.addEventListener("keydown", (e) => {
        const marca = e.target.closest?.("[data-resaltado]");
        if (marca && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            hojaResaltado(marca.dataset.resaltado);
        }
    });

    let espera = null;
    const programar = () => {
        clearTimeout(espera);
        espera = setTimeout(mostrarMenu, 200);
    };
    lugar.addEventListener("pointerup", programar);
    lugar.addEventListener("keyup", programar);
    const alCambiarSeleccion = () => {
        if (!document.body.contains(lugar)) return document.removeEventListener("selectionchange", alCambiarSeleccion);
        programar();
    };
    document.addEventListener("selectionchange", alCambiarSeleccion);

    // ----- La hoja de abajo (diccionario, explicación, resaltado) -----
    function abrirHoja(html) {
        hoja.innerHTML = `<button class="hoja__cerrar boton boton--chico" data-hoja-cerrar aria-label="Cerrar">✕</button>${html}`;
        hoja.hidden = false;
        delete hoja.dataset.de; // de qué resaltado es la hoja (solo la del resaltado lo pone)
    }
    const cerrarHoja = () => {
        hoja.hidden = true;
        hoja.innerHTML = "";
        delete hoja.dataset.de;
    };

    function hojaResaltado(id) {
        let r;
        try {
            r = d.leerResaltado(id);
        } catch {
            return cerrarHoja();
        }
        abrirHoja(`
            <p class="hoja__cita"><span class="resaltado resaltado--${esc(r.color)}">${esc(r.texto)}</span></p>
            ${r.explicacion ? `<div class="hoja__explicacion"><strong>💡 En otras palabras:</strong> ${esc(r.explicacion)}</div>` : ""}
            <div class="acciones">
                ${Object.keys(COLORES_RESALTADO).map((c) => `<button class="punto punto--${c} ${c === r.color ? "punto--elegido" : ""}" data-r-color="${c}" aria-label="Pasar a ${COLORES_RESALTADO[c].toLowerCase()}"></button>`).join("")}
                ${!r.explicacion && ia.conectada() ? `<button class="boton boton--chico" data-r-explicar>💡 Explicar (usa ${COSTOS_IA.explicar})</button>` : ""}
                <button class="boton boton--chico boton--quitar" data-r-quitar>Quitar resaltado</button>
            </div>
            <form class="formulario" data-r-nota>
                <label>Tu nota
                    <textarea name="nota" rows="3" maxlength="${TOPES.nota}" placeholder="Una idea, una duda, algo para acordarte…">${esc(r.nota)}</textarea>
                </label>
                <button class="boton boton--chico" type="submit">Guardar nota</button>
            </form>`);
        hoja.dataset.de = id;
    }

    async function explicar(textoAExplicar, parrafo) {
        if (!ia.alcanza(COSTOS_IA.explicar)) throw new Error("No alcanza el cupo de IA de hoy. Mañana se renueva.");
        return (await ia.pedirExplicacion({ concepto: cap.titulo, texto: textoAExplicar, contexto: cap.parrafos[parrafo]?.slice(0, TOPES.contextoExplicar) ?? "", libro: libro.titulo })).explicacion;
    }

    async function diccionario(palabra, parrafo) {
        abrirHoja(`<p class="ayuda">Buscando "${esc(palabra)}" en el diccionario…</p>`);
        try {
            const e = await buscarPalabra(palabra);
            if (!e) {
                abrirHoja(`
                    <p><strong>${esc(palabra)}</strong>: no está en Wikcionario (puede ser una forma conjugada o poco común).</p>
                    ${ia.conectada() ? `<button class="boton boton--chico" data-dic-ia="${esc(palabra)}" data-parrafo="${parrafo}">💡 Explicar con IA (usa ${COSTOS_IA.explicar})</button>` : ""}`);
                return;
            }
            abrirHoja(`
                <h2 class="hoja__titulo">📖 ${esc(e.palabra)}</h2>
                ${e.etimologia ? `<p class="ayuda"><strong>De dónde viene:</strong> ${esc(e.etimologia)}</p>` : ""}
                ${acepciones(e.acepciones)}
                ${e.lema ? `<p><strong>Viene de "${esc(e.lema.palabra)}":</strong></p>${acepciones(e.lema.acepciones)}` : ""}
                <p class="ayuda">Fuente: <a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">Wikcionario ↗</a></p>`);
        } catch (err) {
            abrirHoja(`<p class="error">${esc(err.message)}</p>`);
        }
    }

    // ----- Clics -----
    cont.addEventListener("click", async (e) => {
        const accionSel = e.target.closest("[data-sel]")?.dataset.sel;
        if (accionSel && seleccion) {
            const s = seleccion;
            menu.hidden = true;
            getSelection()?.removeAllRanges();
            try {
                if (accionSel === "diccionario") return await diccionario(s.texto, s.parrafo);
                if (accionSel === "color" || accionSel === "nota") {
                    const color = e.target.closest("[data-color]")?.dataset.color ?? "verde";
                    const r = d.crearResaltado({ concepto: conceptoId, parrafo: s.parrafo, inicio: s.inicio, fin: s.fin, texto: s.texto, color });
                    pintar();
                    if (accionSel === "nota") {
                        hojaResaltado(r.id);
                        hoja.querySelector("textarea")?.focus();
                    }
                    return;
                }
                if (accionSel === "explicar") {
                    // Primero el resaltado (si choca con otro, falla antes de gastar cupo); si la IA falla, se saca
                    const r = d.crearResaltado({ concepto: conceptoId, parrafo: s.parrafo, inicio: s.inicio, fin: s.fin, texto: s.texto, color: "azul" });
                    pintar();
                    abrirHoja(`<p class="ayuda">Pensando cómo decirlo con otras palabras…</p>`);
                    try {
                        d.editarResaltado(r.id, { explicacion: await explicar(s.texto, s.parrafo) });
                    } catch (err) {
                        d.quitarResaltado(r.id);
                        pintar();
                        throw err;
                    }
                    pintar();
                    hojaResaltado(r.id);
                }
            } catch (err) {
                cerrarHoja();
                aviso(err.message, "error");
            }
            return;
        }
        const marca = e.target.closest("[data-resaltado]");
        if (marca && lugar.contains(marca) && getSelection()?.isCollapsed !== false) return hojaResaltado(marca.dataset.resaltado);
        if (e.target.closest("[data-hoja-cerrar]")) return cerrarHoja();
        const id = hoja.dataset.de;
        const nuevoColor = e.target.closest("[data-r-color]")?.dataset.rColor;
        try {
            if (nuevoColor && id) {
                d.editarResaltado(id, { color: nuevoColor });
                pintar();
                return hojaResaltado(id);
            }
            if (e.target.closest("[data-r-quitar]") && id) {
                d.quitarResaltado(id);
                pintar();
                cerrarHoja();
                return aviso("Resaltado quitado");
            }
            if (e.target.closest("[data-r-explicar]") && id) {
                const r = d.leerResaltado(id);
                abrirHoja(`<p class="ayuda">Pensando cómo decirlo con otras palabras…</p>`);
                d.editarResaltado(id, { explicacion: await explicar(r.texto, r.parrafo) });
                return hojaResaltado(id);
            }
            const dicIA = e.target.closest("[data-dic-ia]");
            if (dicIA) {
                abrirHoja(`<p class="ayuda">Pensando cómo explicarlo…</p>`);
                const explicacion = await explicar(dicIA.dataset.dicIa, Number(dicIA.dataset.parrafo));
                return abrirHoja(`<h2 class="hoja__titulo">💡 ${esc(dicIA.dataset.dicIa)}</h2><p>${esc(explicacion)}</p><p class="ayuda">Explicado por la IA según el párrafo (puede equivocarse).</p>`);
            }
        } catch (err) {
            aviso(err.message, "error");
            if (id) hojaResaltado(id);
        }
    });

    cont.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!e.target.matches("[data-r-nota]")) return;
        const id = hoja.dataset.de;
        try {
            d.editarResaltado(id, { nota: e.target.elements.nota.value });
            pintar();
            aviso("Nota guardada");
            hojaResaltado(id);
        } catch (err) {
            aviso(err.message, "error");
        }
    });
}

const acepciones = (lista) =>
    `<ol class="hoja__acepciones">${lista.map((a) => `<li><span class="ayuda">${esc(a.tipo)}${a.etiqueta ? ` · ${esc(a.etiqueta)}` : ""}</span><br>${esc(a.texto)}</li>`).join("")}</ol>`;

/** Un párrafo con sus resaltados (que no se pisan) como <span>. Todo el texto se escapa. */
export function conResaltados(texto, resaltados) {
    let html = "";
    let ultimo = 0;
    for (const r of [...resaltados].sort((a, b) => a.inicio - b.inicio)) {
        if (r.inicio < ultimo || r.fin > texto.length) continue; // dato raro: no se pinta
        html += esc(texto.slice(ultimo, r.inicio));
        // Los íconos de nota y explicación los pone el CSS: así no se suman al texto (las posiciones quedan exactas)
        const extras = `${r.nota ? " resaltado--con-nota" : ""}${r.explicacion ? " resaltado--explicado" : ""}`;
        html += `<span class="resaltado resaltado--${esc(r.color)}${extras}" data-resaltado="${esc(r.id)}" tabindex="0" role="button" title="${esc(r.nota || r.explicacion || "Resaltado")}">${esc(texto.slice(r.inicio, r.fin))}</span>`;
        ultimo = r.fin;
    }
    return html + esc(texto.slice(ultimo));
}
