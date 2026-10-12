// ============================================
// Cerebro 🧠 (Fase 1): neuronas. Una neurona es un objeto aparte (no toca los mapas): título, descripción breve,
// un texto que se edita y se resalta igual que en Leer o Escribir, un nivel de abarcamiento (1 muy general a 5 muy
// específico) y vínculos a Mapas o a conceptos (Fichas o Ramas), de ida y de vuelta (la ficha también las muestra).
//   - A la izquierda (en el celu, arriba y plegable) la lista de tus neuronas, la última editada primero.
//   - Arriba, la tira de "Abiertas": lo último que viste en esta pestaña del navegador (neuronas y mapas).
// Dirección: #cerebro?n=<neurona>&modo=marcar
// ============================================
import * as d from "../datos.js?v=67446a5e85";
import { TOPES, ABARCAMIENTO, PREFIJO } from "../config.js?v=67446a5e85";
import { esc, vacio, aviso } from "../ui.js?v=67446a5e85";
import { cuandoFue } from "../fechas.js?v=67446a5e85";
import { montarLector } from "./lector.js?v=67446a5e85";

const MODOS = { escribir: "✏️ Escribir", marcar: "🖍 Marcar" };
const dir = (id, modo = "escribir") => `#cerebro?n=${encodeURIComponent(id)}${modo === "marcar" ? "&modo=marcar" : ""}`;

// ---------- "Abiertas": lo último visto en Cerebro, en esta pestaña del navegador ----------
const CLAVE_ABIERTAS = `${PREFIJO}-cerebro-abiertas`;
const TOPE_ABIERTAS = 8;

function leerAbiertas() {
    try {
        const l = JSON.parse(sessionStorage.getItem(CLAVE_ABIERTAS) ?? "[]");
        return Array.isArray(l) ? l : [];
    } catch {
        return [];
    }
}

function marcarAbierta(tipo, id, etiqueta) {
    const l = leerAbiertas().filter((x) => !(x.tipo === tipo && x.id === id));
    l.unshift({ tipo, id, etiqueta });
    try {
        sessionStorage.setItem(CLAVE_ABIERTAS, JSON.stringify(l.slice(0, TOPE_ABIERTAS)));
    } catch {
        // sin guardado: la tira de abiertas no se recuerda, pero la pantalla sigue andando
    }
}

function cerrarAbierta(tipo, id) {
    try {
        sessionStorage.setItem(CLAVE_ABIERTAS, JSON.stringify(leerAbiertas().filter((x) => !(x.tipo === tipo && x.id === id))));
    } catch {
        // nada: no había guardado
    }
}

function tiraAbiertas(actualId) {
    const abiertas = leerAbiertas();
    if (!abiertas.length) return "";
    return `
        <nav class="cerebro__abiertas" aria-label="Abiertas">
            ${abiertas.map((a) => `
                <span class="cerebro__pestana ${a.tipo === "neurona" && a.id === actualId ? "cerebro__pestana--actual" : ""}">
                    <a href="${esc(a.tipo === "neurona" ? dir(a.id) : `#estudio?m=${encodeURIComponent(a.id)}`)}">${a.tipo === "neurona" ? "🧠" : "🗺️"} ${esc(a.etiqueta)}</a>
                    <button class="cerebro__pestana-cerrar" type="button" data-cerrar-abierta="${esc(a.tipo)}:${esc(a.id)}" aria-label="Sacar de abiertas">✕</button>
                </span>`).join("")}
        </nav>`;
}

// ---------- Vínculos: mapas y conceptos elegibles, y cómo se ven ----------

function nivelDe(conceptos, c) {
    let n = 0;
    let actual = c;
    while (actual?.padre) {
        actual = conceptos.find((x) => x.id === actual.padre);
        n++;
    }
    return n;
}

/** { mapas: [{id, tema}], porId: Map<"tipo:id", etiqueta>, opciones: [{tema, items:[{value, etiqueta}]}] } */
function vinculosDisponibles() {
    const mapas = d.listarMapas();
    const porId = new Map();
    const opciones = mapas.map((m) => {
        const { conceptos } = d.leerMapa(m.id);
        porId.set(`mapa:${m.id}`, m.tema);
        const items = [{ value: `mapa:${m.id}`, etiqueta: `${m.tema} (todo el mapa)` }];
        for (const c of conceptos.filter((x) => x.padre)) {
            const etiqueta = `${"— ".repeat(nivelDe(conceptos, c))}${c.titulo}`;
            porId.set(`concepto:${c.id}`, c.titulo);
            items.push({ value: `concepto:${c.id}`, etiqueta });
        }
        return { tema: m.tema, items };
    });
    return { porId, opciones };
}

const dirVinculo = (v) => (v.tipo === "mapa" ? `#estudio?m=${encodeURIComponent(v.id)}` : `#estudio?c=${encodeURIComponent(v.id)}&v=ficha`);

/** Para Estudio: las neuronas vinculadas a este concepto o a su mapa ("Neuronas que la usan"). */
export function seccionNeuronas(x) {
    const propias = [...d.neuronasDeVinculo("concepto", x.id), ...(x.padre ? [] : d.neuronasDeVinculo("mapa", x.mapa))];
    if (!propias.length) return "";
    return `
        <section class="neuronas-de-ficha" aria-label="Neuronas que la usan">
            <h3>🧠 Neuronas que la usan</h3>
            <p>${propias.map((n) => `<a href="${esc(dir(n.id))}">${esc(n.titulo)}</a>`).join(" · ")}</p>
        </section>`;
}

export function vistaCerebro(cont, { redibujar, alSalir }) {
    const p = new URLSearchParams(location.hash.split("?")[1] ?? "");
    const neuronas = d.listarNeuronas();
    const actual = neuronas.find((x) => x.id === p.get("n")) ?? null;
    const modo = p.get("modo") === "marcar" ? "marcar" : "escribir";
    const marcado = Number.parseInt(p.get("p") ?? "", 10);
    if (actual) marcarAbierta("neurona", actual.id, actual.titulo || "Sin título");

    cont.className = "cerebro";
    cont.innerHTML = `
        ${tiraAbiertas(actual?.id)}
        <aside class="cerebro__lado">
            <details class="neuronas" data-lista ${actual ? "" : "open"}>
                <summary>Tus neuronas (${neuronas.length})</summary>
                <button class="boton boton--chico neuronas__nuevo" data-nueva-neurona>+ Nueva neurona</button>
                ${neuronas.length ? `<ul class="neuronas__lista">${neuronas.map((n) => `
                    <li><a href="${esc(dir(n.id))}" ${n.id === actual?.id ? 'aria-current="page"' : ""}>
                        <strong>${esc(n.titulo)}</strong>
                        ${n.descripcion ? `<span class="ayuda">${esc(n.descripcion)}</span>` : ""}
                        <span class="ayuda">${cuandoFue(n.editado)}</span>
                    </a></li>`).join("")}</ul>` : ""}
            </details>
        </aside>
        <section class="cerebro__principal">
            ${actual ? editor(actual, modo) : `
                ${vacio(neuronas.length ? "Elegí una neurona o empezá una nueva" : "Todavía no hay neuronas",
                    "Una neurona es una idea: un título, una descripción corta y un texto que podés desarrollar y resaltar. Podés vincularla a un Mapa, una Ficha o una Rama de Estudio.")}
                <p><button class="boton" data-nueva-neurona>+ Nueva neurona</button></p>`}
        </section>`;

    if (matchMedia("(min-width: 768px)").matches) cont.querySelector("[data-lista]").open = true;

    cont.addEventListener("click", (e) => {
        if (e.target.closest("[data-nueva-neurona]")) {
            try {
                const nueva = d.crearNeurona({ titulo: "Sin título" });
                location.hash = dir(nueva.id);
            } catch (err) {
                aviso(err.message, "error");
            }
            return;
        }
        if (e.target.closest("[data-quitar-neurona]") && actual) {
            if (!confirm(`¿Quitar la neurona "${actual.titulo}" y sus resaltados? No se puede deshacer.`)) return;
            try {
                d.quitarNeurona(actual.id);
                cerrarAbierta("neurona", actual.id);
                aviso("Neurona quitada");
                location.hash = "#cerebro";
            } catch (err) {
                aviso(err.message, "error");
            }
            return;
        }
        const cerrar = e.target.closest("[data-cerrar-abierta]")?.dataset.cerrarAbierta;
        if (cerrar) {
            const [tipo, id] = cerrar.split(":");
            cerrarAbierta(tipo, id);
            redibujar();
            return;
        }
        const quitarVinc = e.target.closest("[data-quitar-vinculo]")?.dataset.quitarVinculo;
        if (quitarVinc && actual) {
            const [tipo, id] = quitarVinc.split(":");
            try {
                d.quitarVinculo(actual.id, { tipo, id });
                redibujar();
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

    const datos = cont.querySelector("[data-neurona-datos]");
    datos.addEventListener("submit", (e) => e.preventDefault());
    datos.addEventListener("change", (e) => {
        try {
            if (e.target.name === "titulo") d.editarNeurona(actual.id, { titulo: e.target.value });
            if (e.target.name === "descripcion") d.editarNeurona(actual.id, { descripcion: e.target.value });
            if (e.target.name === "abarcamiento") d.editarNeurona(actual.id, { abarcamiento: e.target.value || null });
            if (e.target.name === "vinculoNuevo" && e.target.value) {
                const [tipo, id] = e.target.value.split(":");
                d.agregarVinculo(actual.id, { tipo, id });
                e.target.value = "";
                return redibujar();
            }
            aviso("Guardado");
        } catch (err) {
            aviso(err.message, "error");
        }
    });

    if (modo === "escribir") {
        const area = cont.querySelector("[data-neurona-texto]");
        const estado = cont.querySelector("[data-estado]");
        let espera = null;
        let pendiente = false;
        const guardar = () => {
            clearTimeout(espera);
            if (!pendiente) return;
            try {
                d.editarNeurona(actual.id, { texto: area.value });
                pendiente = false;
                estado.textContent = "Guardado ✓";
            } catch (err) {
                estado.textContent = err.message;
                aviso(err.message, "error");
            }
        };
        area.addEventListener("input", () => {
            pendiente = true;
            estado.textContent = `Guardando… · ${area.value.length} de ${TOPES.textoNeurona} letras`;
            clearTimeout(espera);
            espera = setTimeout(guardar, 700);
        });
        area.addEventListener("change", guardar);
        alSalir(guardar);
        const alCerrar = () => (document.body.contains(area) ? guardar() : removeEventListener("pagehide", alCerrar));
        addEventListener("pagehide", alCerrar);
        return;
    }

    // ----- Marcar: el lector de Leer/Escribir sobre el texto de la neurona -----
    montarLector(cont, cont.querySelector("[data-texto]"), {
        donde: { neurona: actual.id },
        parrafos: () => d.leerNeurona(actual.id).texto.split("\n"),
        marcado,
        paraIA: () => ({ concepto: actual.titulo, libro: "" }),
        mapaId: null,
        destinos: { propio: { id: null, etiqueta: "Ninguna", titulo: "" }, fichas: [] },
    });
    if (Number.isInteger(marcado)) cont.querySelector("#marcado")?.scrollIntoView({ block: "center" });
}

function editor(n, modo) {
    const { porId, opciones } = vinculosDisponibles();
    const sueltos = modo === "marcar" ? d.resaltadosSueltosDeNeurona(n.id) : [];
    return `
        <form class="neurona__datos" data-neurona-datos>
            <input name="titulo" class="neurona__titulo" maxlength="${TOPES.tituloNeurona}" value="${esc(n.titulo)}" aria-label="Título de la neurona">
            <input name="descripcion" class="neurona__descripcion" maxlength="${TOPES.descripcionNeurona}" value="${esc(n.descripcion)}" placeholder="Descripción breve (la idea en una línea)" aria-label="Descripción breve">
            <fieldset class="opciones neurona__abarcamiento">
                <legend>Abarcamiento</legend>
                <label class="opcion"><input type="radio" name="abarcamiento" value="" ${n.abarcamiento ? "" : "checked"}><span>Sin definir</span></label>
                ${Object.entries(ABARCAMIENTO).map(([v, etiqueta]) => `
                    <label class="opcion"><input type="radio" name="abarcamiento" value="${v}" ${String(n.abarcamiento) === v ? "checked" : ""}><span>${v} · ${esc(etiqueta)}</span></label>`).join("")}
            </fieldset>
            <div class="neurona__vinculos">
                ${n.vinculos.length ? `<ul class="neurona__vinculos-lista">${n.vinculos.map((v) => `
                    <li><a href="${esc(dirVinculo(v))}">${v.tipo === "mapa" ? "🗺️" : "📝"} ${esc(porId.get(`${v.tipo}:${v.id}`) ?? "(ya no existe)")}</a>
                        <button class="boton boton--chico boton--quitar" type="button" data-quitar-vinculo="${esc(v.tipo)}:${esc(v.id)}" aria-label="Quitar este vínculo">✕</button></li>`).join("")}</ul>` : ""}
                <label class="ayuda">Vincular a un Mapa, Ficha o Rama
                    <select name="vinculoNuevo">
                        <option value="">Elegí uno para agregarlo…</option>
                        ${opciones.map((g) => `<optgroup label="${esc(g.tema)}">${g.items.map((i) => `<option value="${esc(i.value)}">${esc(i.etiqueta)}</option>`).join("")}</optgroup>`).join("")}
                    </select>
                </label>
            </div>
        </form>
        <nav class="pestanas pestanas--siempre" aria-label="Modo">
            ${Object.entries(MODOS).map(([clave, nombre]) => `<a href="${esc(dir(n.id, clave))}" ${clave === modo ? 'aria-current="page"' : ""}>${nombre}</a>`).join("")}
        </nav>
        ${modo === "escribir" ? `
            <textarea class="neurona__texto" data-neurona-texto maxlength="${TOPES.textoNeurona}" aria-label="Texto de la neurona" placeholder="Desarrollá la idea acá. Un renglón nuevo es un párrafo nuevo.">${esc(n.texto)}</textarea>
            <p class="ayuda" data-estado>Se guarda solo mientras escribís.</p>`
        : n.texto.trim() ? `
            <p class="ayuda">Seleccioná una palabra u oración para buscarla en el diccionario, resaltarla, pedir que te la expliquen o anotar algo.</p>
            <div class="lectura lectura__texto neurona__marcar" data-texto></div>
            ${sueltos.length ? `
            <div class="tarjeta neurona__sueltos">
                <p><strong>Resaltados que ya no están en el texto</strong> (cambiaste esa parte). Quedan acá con su nota:</p>
                <ul>${sueltos.map((r) => `<li>"${esc(r.texto)}"${r.nota ? ` · ${esc(r.nota)}` : ""} <button class="boton boton--chico boton--quitar" data-quitar-suelto="${esc(r.id)}">Quitar</button></li>`).join("")}</ul>
            </div>` : ""}`
        : vacio("Todavía no hay texto", "Pasá a ✏️ Escribir y escribí algo primero.")}
        <div class="acciones">
            <button class="boton boton--chico boton--quitar" data-quitar-neurona>Quitar esta neurona</button>
        </div>`;
}
