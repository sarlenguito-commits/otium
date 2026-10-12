// ============================================
// Escribir: la escritura libre.
//   - A la izquierda (en el celu, arriba y plegable) la lista de tus escritos, el último editado primero.
//   - Cada escrito: título, a qué mapa pertenece (o suelto) y dos modos:
//       ✏️ Escribir: el texto, que se guarda solo mientras escribís.
//       🖍 Marcar: el mismo texto con las funciones de Leer (diccionario, resaltar, Explicar, nota; ver lector.js).
//     Si el escrito es de un mapa, un resaltado puede ir a las "Notas personales" de una ficha de ese mapa.
// Dirección: #escribir?e=<escrito>&modo=marcar[&p=<párrafo>]
// ============================================
import * as d from "../datos.js?v=cbfbfa8738";
import { TOPES, COSTO_REESCRIBIR } from "../config.js?v=cbfbfa8738";
import { esc, vacio, aviso } from "../ui.js?v=cbfbfa8738";
import { cuandoFue } from "../fechas.js?v=cbfbfa8738";
import { montarLector } from "./lector.js?v=cbfbfa8738";
import * as ia from "../ia.js?v=cbfbfa8738";
import { ALCANCES, MAS_IDEAS, pedidosRapidos, anotarUso, rango, reemplazar, agregarAbajo } from "../reescribir.js?v=cbfbfa8738";

const MODOS_ESCRITO = { escribir: "✏️ Escribir", marcar: "🖍 Marcar" };
const dir = (id, modo = "escribir") => `#escribir?e=${encodeURIComponent(id)}${modo === "marcar" ? "&modo=marcar" : ""}`;

export function vistaEscribir(cont, { redibujar, alSalir }) {
    const p = new URLSearchParams(location.hash.split("?")[1] ?? "");
    const escritos = d.listarEscritos();
    const actual = escritos.find((x) => x.id === p.get("e")) ?? null;
    const modo = p.get("modo") === "marcar" ? "marcar" : "escribir";
    const marcado = Number.parseInt(p.get("p") ?? "", 10);
    const mapas = d.listarMapas();
    const temaDe = (id) => mapas.find((m) => m.id === id)?.tema;

    cont.className = "escribir";
    cont.innerHTML = `
        <aside class="escribir__lado">
            <details class="escritos" data-lista ${actual ? "" : "open"}>
                <summary>Tus escritos (${escritos.length})</summary>
                <button class="boton boton--chico escritos__nuevo" data-nuevo-escrito>+ Nuevo escrito</button>
                ${escritos.length ? `<ul class="escritos__lista">${escritos.map((e) => `
                    <li><a href="${esc(dir(e.id))}" ${e.id === actual?.id ? 'aria-current="page"' : ""}>
                        <strong>${esc(e.titulo)}</strong>
                        <span class="ayuda">${esc(temaDe(e.mapa) ?? "Suelto")} · ${esc(cuandoFue(e.editado))}</span>
                    </a></li>`).join("")}</ul>` : ""}
            </details>
        </aside>
        <section class="escribir__principal">
            <p class="ayuda escribir__aviso">🔒 Tus escritos quedan solo en este navegador. A la IA va únicamente lo que
               le pidas explicar, y con el plan gratis Google puede usarlo: no escribas datos personales tuyos ni de otros.</p>
            ${actual ? editor(actual, modo, mapas) : `
                ${vacio(escritos.length ? "Elegí un escrito o empezá uno nuevo" : "Todavía no escribiste nada", "Escribí con tus palabras lo que vas aprendiendo (un resumen, una explicación, una idea suelta). Después lo podés marcar como un libro.")}
                <p><button class="boton" data-nuevo-escrito>+ Nuevo escrito</button></p>`}
        </section>`;

    // En la compu la lista se ve siempre (en el celu arranca plegada si hay un escrito abierto)
    if (matchMedia("(min-width: 768px)").matches) cont.querySelector("[data-lista]").open = true;

    cont.addEventListener("click", (e) => {
        if (e.target.closest("[data-nuevo-escrito]")) {
            try {
                const nuevo = d.crearEscrito({ titulo: "Sin título", mapa: actual?.mapa ?? null });
                location.hash = dir(nuevo.id);
            } catch (err) {
                aviso(err.message, "error");
            }
            return;
        }
        if (e.target.closest("[data-quitar-escrito]") && actual) {
            if (!confirm(`¿Quitar "${actual.titulo}" y sus resaltados? No se puede deshacer.`)) return;
            try {
                d.quitarEscrito(actual.id);
                aviso("Escrito quitado");
                location.hash = "#escribir";
            } catch (err) {
                aviso(err.message, "error");
            }
            return;
        }
        const suelto = e.target.closest("[data-quitar-suelto]")?.dataset.quitarSuelto;
        if (suelto) {
            try {
                d.quitarResaltado(suelto);
                redibujar();
            } catch (err) {
                aviso(err.message, "error");
            }
        }
    });

    if (!actual) return;

    // ----- Título y mapa -----
    const datos = cont.querySelector("[data-escrito-datos]");
    datos.addEventListener("submit", (e) => e.preventDefault());
    datos.addEventListener("change", (e) => {
        try {
            if (e.target.name === "titulo") d.editarEscrito(actual.id, { titulo: e.target.value });
            if (e.target.name === "mapa") {
                d.editarEscrito(actual.id, { mapa: e.target.value || null });
                redibujar();
            }
            aviso("Guardado");
        } catch (err) {
            aviso(err.message, "error");
        }
    });

    if (modo === "escribir") {
        // ----- El texto: se guarda solo (un ratito después de dejar de escribir, y al salir del cuadro) -----
        const area = cont.querySelector("[data-escrito-texto]");
        const estado = cont.querySelector("[data-estado]");
        let espera = null;
        let pendiente = false;
        const guardar = () => {
            clearTimeout(espera);
            if (!pendiente) return;
            try {
                d.editarEscrito(actual.id, { texto: area.value });
                pendiente = false;
                estado.textContent = "Guardado ✓";
            } catch (err) {
                estado.textContent = err.message;
                aviso(err.message, "error");
            }
        };
        area.addEventListener("input", () => {
            pendiente = true;
            estado.textContent = `Guardando… · ${area.value.length} de ${TOPES.textoEscrito} letras`;
            clearTimeout(espera);
            espera = setTimeout(guardar, 700);
        });
        area.addEventListener("change", guardar);
        // Si se cambia de pantalla (o se cierra) antes de que pase el ratito, igual se guarda
        alSalir(guardar);
        const alCerrar = () => (document.body.contains(area) ? guardar() : removeEventListener("pagehide", alCerrar));
        addEventListener("pagehide", alCerrar);
        // Un cambio hecho por la app (reemplazar, deshacer): cuenta como tipeado y se guarda en el momento
        montarReescribir(cont, area, () => {
            area.dispatchEvent(new Event("input"));
            guardar();
        });
        return;
    }

    // ----- Marcar: el lector de Leer sobre el escrito -----
    const conceptos = actual.mapa ? d.leerMapa(actual.mapa).conceptos : [];
    montarLector(cont, cont.querySelector("[data-texto]"), {
        donde: { escrito: actual.id },
        parrafos: () => d.leerEscrito(actual.id).texto.split("\n"),
        marcado,
        paraIA: () => ({ concepto: actual.titulo, libro: "" }),
        mapaId: actual.mapa,
        destinos: {
            propio: { id: null, etiqueta: "Ninguna (queda solo en este escrito)", titulo: "" },
            fichas: conceptos.map((c) => ({ id: c.id, etiqueta: c.padre ? c.titulo : `${c.titulo} (todo el mapa)`, titulo: c.titulo })),
        },
    });
    if (Number.isInteger(marcado)) cont.querySelector("#marcado")?.scrollIntoView({ block: "center" });
}

function editor(e, modo, mapas) {
    const sueltos = modo === "marcar" ? d.resaltadosSueltos(e.id) : [];
    return `
        <form class="escrito__datos" data-escrito-datos>
            <input name="titulo" class="escrito__titulo" maxlength="${TOPES.tituloEscrito}" value="${esc(e.titulo)}" aria-label="Título del escrito">
            <label class="escrito__mapa">Mapa
                <select name="mapa">
                    <option value="">Suelto (sin mapa)</option>
                    ${mapas.map((m) => `<option value="${esc(m.id)}" ${m.id === e.mapa ? "selected" : ""}>${esc(m.tema)}</option>`).join("")}
                </select>
            </label>
        </form>
        <nav class="pestanas pestanas--siempre" aria-label="Modo">
            ${Object.entries(MODOS_ESCRITO).map(([clave, nombre]) => `<a href="${esc(dir(e.id, clave))}" ${clave === modo ? 'aria-current="page"' : ""}>${nombre}</a>`).join("")}
        </nav>
        ${modo === "escribir" ? `
            <textarea class="escrito__texto" data-escrito-texto maxlength="${TOPES.textoEscrito}" aria-label="Texto del escrito" placeholder="Escribí acá. Un renglón nuevo es un párrafo nuevo.">${esc(e.texto)}</textarea>
            <p class="ayuda" data-estado>Se guarda solo mientras escribís.</p>
            ${panelReescribir()}`
        : e.texto.trim() ? `
            <p class="ayuda">Seleccioná una palabra u oración para buscarla en el diccionario, resaltarla, pedir que te la expliquen o anotar algo.</p>
            <div class="lectura lectura__texto escrito__marcar" data-texto></div>
            ${sueltos.length ? `
            <div class="tarjeta escrito__sueltos">
                <p><strong>Resaltados que ya no están en el texto</strong> (cambiaste esa parte). Quedan acá con su nota:</p>
                <ul>${sueltos.map((r) => `<li>"${esc(r.texto)}"${r.nota ? ` · ${esc(r.nota)}` : ""} <button class="boton boton--chico boton--quitar" data-quitar-suelto="${esc(r.id)}">Quitar</button></li>`).join("")}</ul>
            </div>` : ""}`
        : vacio("Todavía no hay texto", "Pasá a ✏️ Escribir y escribí algo primero.")}
        <div class="acciones">
            <button class="boton boton--chico boton--quitar" data-quitar-escrito>Quitar este escrito</button>
        </div>`;
}

// ---------- Reescribir con IA ----------

function panelReescribir() {
    if (!ia.conectada()) return `<p class="ayuda">✨ Para reescribir con IA, conectala en <a href="#ajustes">Ajustes</a>.</p>`;
    return `
        <details class="tarjeta reescribir" data-reescribir>
            <summary>✨ Reescribir con IA</summary>
            <form class="formulario" data-reescribir-form>
                <fieldset class="opciones">
                    <legend>¿Qué?</legend>
                    ${Object.entries(ALCANCES).map(([clave, nombre]) => `
                        <label class="opcion"><input type="radio" name="alcance" value="${clave}" ${clave === "parrafo" ? "checked" : ""}>
                            <span>${esc(nombre)} <span class="ayuda">(usa ${COSTO_REESCRIBIR[clave]})</span></span></label>`).join("")}
                </fieldset>
                <label>¿Cómo?
                    <input name="instruccion" maxlength="${TOPES.instruccionReescribir}" list="ideas-reescribir" required
                           placeholder="Por ejemplo: formal, para mandar por mail">
                </label>
                <datalist id="ideas-reescribir">${MAS_IDEAS.map((t) => `<option value="${esc(t)}"></option>`).join("")}</datalist>
                <div class="reescribir__rapidos" aria-label="Pedidos rápidos">
                    ${pedidosRapidos().map((t) => `<button class="boton boton--chico" type="button" data-pedido="${esc(t)}">${esc(t)}</button>`).join("")}
                </div>
                <button class="boton" type="submit">Reescribir</button>
            </form>
            <div data-reescrito></div>
        </details>`;
}

/** El panel: arma el pedido con lo elegido, muestra la propuesta y la aplica solo si la persona dice. */
function montarReescribir(cont, area, cambio) {
    const panel = cont.querySelector("[data-reescribir]");
    if (!panel) return;
    const lugar = panel.querySelector("[data-reescrito]");
    let propuesta = null; // { r, nuevo, alcance, instruccion }
    let anterior = null; // el texto antes de aplicar (para "Deshacer")

    function mostrar(extra = "") {
        if (!propuesta) return (lugar.innerHTML = extra);
        lugar.innerHTML = `
            <div class="reescrito">
                <p class="ayuda">Propuesta para ${esc(ALCANCES[propuesta.alcance].toLowerCase())} · "${esc(propuesta.instruccion)}" (la IA puede equivocarse: revisala)</p>
                <div class="reescrito__texto">${esc(propuesta.nuevo)}</div>
                <div class="acciones">
                    <button class="boton boton--chico" type="button" data-aplicar="reemplazar">Reemplazar</button>
                    <button class="boton boton--chico" type="button" data-aplicar="abajo">Agregar abajo</button>
                    <button class="boton boton--chico" type="button" data-aplicar="copiar">Copiar</button>
                    <button class="boton boton--chico" type="button" data-aplicar="descartar">Descartar</button>
                </div>
            </div>${extra}`;
    }

    panel.addEventListener("click", async (e) => {
        const pedido = e.target.closest("[data-pedido]")?.dataset.pedido;
        if (pedido) {
            panel.querySelector("[name=instruccion]").value = pedido;
            return;
        }
        if (e.target.closest("[data-deshacer]") && anterior !== null) {
            area.value = anterior;
            anterior = null;
            cambio();
            lugar.innerHTML = "";
            return aviso("Volvió el texto de antes");
        }
        const accion = e.target.closest("[data-aplicar]")?.dataset.aplicar;
        if (!accion || !propuesta) return;
        if (accion === "descartar") {
            propuesta = null;
            return mostrar();
        }
        if (accion === "copiar") {
            try {
                await navigator.clipboard.writeText(propuesta.nuevo);
                aviso("Copiado");
            } catch {
                aviso("No se pudo copiar: seleccionalo y copialo a mano.", "error");
            }
            return;
        }
        const { r, nuevo } = propuesta;
        if (accion === "reemplazar" && area.value.slice(r.inicio, r.fin) !== r.texto) {
            return aviso("Esa parte cambió mientras tanto: usá \"Agregar abajo\" o \"Copiar\".", "error");
        }
        anterior = area.value;
        area.value = accion === "reemplazar" ? reemplazar(area.value, r, nuevo) : agregarAbajo(area.value, r, nuevo);
        cambio();
        propuesta = null;
        mostrar(`<p class="ayuda">${accion === "reemplazar" ? "Reemplazado" : "Agregado"}. <button class="boton boton--chico" type="button" data-deshacer>Deshacer</button></p>`);
    });

    panel.addEventListener("submit", async (e) => {
        e.preventDefault();
        const form = e.target;
        const alcance = form.elements.alcance.value;
        const instruccion = form.elements.instruccion.value.trim();
        let r;
        try {
            r = rango(area.value, { inicio: area.selectionStart, fin: area.selectionEnd }, alcance);
        } catch (err) {
            return aviso(err.message, "error");
        }
        const costo = COSTO_REESCRIBIR[alcance];
        if (!ia.alcanza(costo)) return aviso("No alcanza el cupo de IA de hoy. Mañana se renueva.", "error");
        const boton = form.querySelector("[type=submit]");
        boton.disabled = true;
        boton.textContent = "Reescribiendo…";
        try {
            const { texto: nuevo } = await ia.pedirReescritura({ alcance, texto: r.texto, instruccion, contexto: r.contexto });
            anotarUso(instruccion);
            propuesta = { r, nuevo, alcance, instruccion };
            anterior = null;
            mostrar();
        } catch (err) {
            aviso(err.message, "error");
        }
        boton.disabled = false;
        boton.textContent = "Reescribir";
    });
}
