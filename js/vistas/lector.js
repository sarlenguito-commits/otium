// ============================================
// El lector: lo que comparten Leer (un capítulo) y Escribir (modo "Marcar" de un escrito propio).
//   - Al seleccionar una palabra u oración (dentro de un párrafo) aparece un menú: Diccionario (Wikcionario, gratis),
//     resaltar en azul, rojo o verde, Explicar (la IA lo dice con otras palabras; 1 del cupo) y Nota.
//   - Tocar un resaltado abre la hoja de abajo: la explicación (si la pediste), el color, la nota, el título y a qué
//     ficha va (sus "Notas personales" en Estudio).
// montarLector(cont, lugar, opciones) pinta los párrafos en `lugar` y escucha en `cont`. Devuelve { pintar }.
// ============================================
import * as d from "../datos.js?v=b757769159";
import * as ia from "../ia.js?v=b757769159";
import { buscarPalabra } from "../diccionario.js?v=b757769159";
import { COLORES_RESALTADO, COSTOS_IA, TOPES } from "../config.js?v=b757769159";
import { esc, aviso } from "../ui.js?v=b757769159";

/**
 * @param {HTMLElement} cont   la pantalla (ahí se agregan el menú y la hoja, y se escuchan los clics)
 * @param {HTMLElement} lugar  donde van los párrafos
 * @param {object} op
 *   donde: { concepto } o { escrito }         de quién son los resaltados
 *   parrafos: () => string[]                   el texto, párrafo por párrafo (se pide cada vez: puede cambiar)
 *   marcado: número de párrafo a destacar (opcional)
 *   paraIA: () => ({ concepto, libro })        cómo se presenta el texto al pedir "Explicar"
 *   mapaId: el mapa de las fichas (o null)
 *   destinos: { propio: { etiqueta, id, titulo }, fichas: [{ id, etiqueta, titulo }] }
 *             propio: lo que significa "sin vínculo" (el capítulo, o "solo en este escrito"); fichas vacías = sin elegir
 */
export function montarLector(cont, lugar, op) {
    cont.insertAdjacentHTML("beforeend", `<div class="menu-seleccion" data-menu hidden></div><div class="hoja" data-hoja hidden></div>`);
    const menu = cont.querySelector("[data-menu]");
    const hoja = cont.querySelector("[data-hoja]");
    let seleccion = null; // { parrafo, inicio, fin, texto, rect }

    function pintar() {
        const resaltados = d.resaltadosDe(op.donde);
        lugar.innerHTML = op.parrafos().map((t, i) => {
            const propios = resaltados.filter((r) => r.parrafo === i);
            return `<p data-p="${i}" ${i === op.marcado ? 'class="lectura__marcado" id="marcado"' : ""}>${conResaltados(t, propios)}</p>`;
        }).join("");
    }

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
        if (pFin !== pIni && !hastaElFinal) {
            aviso("Por ahora se resalta de a un párrafo por vez: seleccioná sin cruzar a otro.", "error");
            return null;
        }
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

    function destino(r) {
        const ficha = d.fichaDe(r);
        if (!ficha) return "";
        const titulo = op.destinos.fichas.find((c) => c.id === ficha)?.titulo ?? op.destinos.propio.titulo ?? "";
        return `<p><a href="${esc(`#estudio?m=${encodeURIComponent(op.mapaId)}&c=${encodeURIComponent(ficha)}&v=ficha`)}">📝 Ver en las notas de "${esc(titulo)}" →</a></p>`;
    }

    function hojaResaltado(id) {
        let r;
        try {
            r = d.leerResaltado(id);
        } catch {
            return cerrarHoja();
        }
        const { propio, fichas } = op.destinos;
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
                <label>Título (así aparece en tus notas)
                    <input name="titulo" maxlength="${TOPES.tituloNota}" value="${esc(r.titulo)}" placeholder="${esc(r.texto.slice(0, 50))}">
                </label>
                ${fichas.length ? `
                <label>Va a las notas de la ficha
                    <select name="vinculo">
                        <option value="">${esc(propio.etiqueta)}</option>
                        ${fichas.filter((c) => c.id !== propio.id).map((c) => `<option value="${esc(c.id)}" ${c.id === r.vinculo ? "selected" : ""}>${esc(c.etiqueta)}</option>`).join("")}
                    </select>
                </label>` : ""}
                <button class="boton boton--chico" type="submit">Guardar</button>
            </form>
            ${destino(r)}`);
        hoja.dataset.de = id;
    }

    async function explicar(textoAExplicar, parrafo) {
        if (!ia.alcanza(COSTOS_IA.explicar)) throw new Error("No alcanza el cupo de IA de hoy. Mañana se renueva.");
        const { concepto, libro = "" } = op.paraIA();
        const contexto = op.parrafos()[parrafo]?.slice(0, TOPES.contextoExplicar) ?? "";
        return (await ia.pedirExplicacion({ concepto, texto: textoAExplicar, contexto, libro })).explicacion;
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
    const nuevo = (s, extra = {}) => d.crearResaltado({ ...op.donde, parrafo: s.parrafo, inicio: s.inicio, fin: s.fin, texto: s.texto, ...extra });
    cont.addEventListener("click", async (e) => {
        const accionSel = e.target.closest("[data-sel]")?.dataset.sel;
        if (accionSel && seleccion) {
            const s = seleccion;
            menu.hidden = true;
            getSelection()?.removeAllRanges();
            try {
                if (accionSel === "diccionario") return await diccionario(s.texto, s.parrafo);
                if (accionSel === "color" || accionSel === "nota") {
                    const r = nuevo(s, { color: e.target.closest("[data-color]")?.dataset.color ?? "verde" });
                    pintar();
                    if (accionSel === "nota") {
                        hojaResaltado(r.id);
                        hoja.querySelector("textarea")?.focus();
                    }
                    return;
                }
                if (accionSel === "explicar") {
                    // Primero el resaltado (si choca con otro, falla antes de gastar cupo); si la IA falla, se saca
                    const r = nuevo(s, { color: "azul" });
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
                pintar();
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
        if (!e.target.matches("[data-r-nota]")) return;
        e.preventDefault();
        const id = hoja.dataset.de;
        try {
            const f = e.target.elements;
            d.editarResaltado(id, { nota: f.nota.value, titulo: f.titulo.value, ...(f.vinculo ? { vinculo: f.vinculo.value || null } : {}) });
            pintar();
            aviso("Guardado");
            hojaResaltado(id);
        } catch (err) {
            aviso(err.message, "error");
        }
    });

    pintar();
    return { pintar };
}

const acepciones = (lista) =>
    `<ol class="hoja__acepciones">${lista.map((a) => `<li><span class="ayuda">${esc(a.tipo)}${a.etiqueta ? ` · ${esc(a.etiqueta)}` : ""}</span><br>${esc(a.texto)}</li>`).join("")}</ol>`;

/** Un párrafo con sus resaltados (que no se pisan) como <span>. Todo el texto se escapa.
 *  Si el texto cambió (un escrito editado) y el resaltado ya no coincide con lo que marcaba, no se pinta. */
export function conResaltados(texto, resaltados) {
    let html = "";
    let ultimo = 0;
    for (const r of [...resaltados].sort((a, b) => a.inicio - b.inicio)) {
        if (r.inicio < ultimo || r.fin > texto.length) continue; // dato raro: no se pinta
        if (r.texto !== undefined && texto.slice(r.inicio, r.fin) !== r.texto) continue;
        html += esc(texto.slice(ultimo, r.inicio));
        // Los íconos de nota y explicación los pone el CSS: así no se suman al texto (las posiciones quedan exactas)
        const extras = `${r.nota ? " resaltado--con-nota" : ""}${r.explicacion ? " resaltado--explicado" : ""}`;
        html += `<span class="resaltado resaltado--${esc(r.color)}${extras}" data-resaltado="${esc(r.id)}" tabindex="0" role="button" title="${esc(r.nota || r.explicacion || "Resaltado")}">${esc(texto.slice(r.inicio, r.fin))}</span>`;
        ultimo = r.fin;
    }
    return html + esc(texto.slice(ultimo));
}
