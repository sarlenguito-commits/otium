// ============================================
// Escribir: la escritura libre.
//   - A la izquierda (en el celu, arriba y plegable) la lista de tus escritos, el último editado primero.
//   - Cada escrito: título, a qué mapa pertenece (o suelto) y dos modos:
//       ✏️ Escribir: el texto, que se guarda solo mientras escribís.
//       🖍 Marcar: el mismo texto con las funciones de Leer (diccionario, resaltar, Explicar, nota; ver lector.js).
//     Si el escrito es de un mapa, un resaltado puede ir a las "Notas personales" de una ficha de ese mapa.
// Dirección: #escribir?e=<escrito>&modo=marcar[&p=<párrafo>]
// ============================================
import * as d from "../datos.js?v=9aef454a4b";
import { TOPES } from "../config.js?v=9aef454a4b";
import { esc, vacio, aviso } from "../ui.js?v=9aef454a4b";
import { cuandoFue } from "../fechas.js?v=9aef454a4b";
import { montarLector } from "./lector.js?v=9aef454a4b";

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
            <p class="ayuda" data-estado>Se guarda solo mientras escribís.</p>`
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
