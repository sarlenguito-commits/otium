// Leer: la pestaña de lectura.
//   - Sin capítulo elegido (#leer): tus libros, con "Seguir leyendo" donde quedaste.
//   - Un capítulo (#leer?m=<mapa>&c=<concepto>[&p=<párrafo>]): el texto, con lo que resaltaste pintado.
//     El menú al seleccionar (diccionario, resaltar, Explicar, nota) y la hoja de cada resaltado están en lector.js
//     (los comparte con Escribir).
import * as d from "../datos.js?v=b757769159";
import { PREFIJO } from "../config.js?v=b757769159";
import { esc, vacio } from "../ui.js?v=b757769159";
import { montarLector } from "./lector.js?v=b757769159";

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
    const raiz = conceptos.find((c) => !c.padre);
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
        </article>`;

    montarLector(cont, cont.querySelector("[data-texto]"), {
        donde: { concepto: conceptoId },
        parrafos: () => cap.parrafos,
        marcado,
        paraIA: () => ({ concepto: cap.titulo, libro: libro.titulo }),
        mapaId,
        // Fichas a las que se puede mandar un resaltado: el libro entero (la raíz) y cada capítulo, en orden
        destinos: {
            propio: { id: conceptoId, etiqueta: "Este capítulo", titulo: cap.titulo },
            fichas: [
                ...(raiz ? [{ id: raiz.id, etiqueta: `${raiz.titulo} (el libro entero)`, titulo: raiz.titulo }] : []),
                ...capitulos.map((c) => ({ id: c.id, etiqueta: c.titulo, titulo: c.titulo })),
            ],
        },
    });
    if (Number.isInteger(marcado)) cont.querySelector("#marcado")?.scrollIntoView({ block: "center" });
    else scrollTo(0, 0);
}
