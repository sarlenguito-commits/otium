// ============================================
// Libros (EPUB): el texto queda SOLO en este navegador, aparte de los datos del mapa (una clave por libro), así los
// datos de siempre no se vuelven pesados. El libro se convierte en un mapa: la raíz es el libro y cada capítulo es una
// rama. A la IA va solo el capítulo que se pide, recortado (TOPES.textoCapituloIA).
// ============================================
import { leerAparte, guardarAparte, exigir } from "./nucleo.js?v=43661a5cb5";
import { crearMapaConCapitulos, leerConcepto } from "./mapas.js?v=43661a5cb5";
import { TOPES } from "../../config.js?v=43661a5cb5";

const clave = (mapaId) => `libro-${mapaId}`;

/** Guarda el libro leído del EPUB y arma su mapa. Devuelve { mapa, raiz }. */
export function crearMapaLibro({ titulo, autor = "", capitulos }) {
    exigir(Array.isArray(capitulos) && capitulos.length > 0, "El libro no tiene capítulos.");
    exigir(capitulos.length <= TOPES.capitulosPorLibro, `Hasta ${TOPES.capitulosPorLibro} capítulos por libro.`);
    const creado = crearMapaConCapitulos({ tema: titulo, capitulos: capitulos.map((c) => c.titulo) });
    const libro = { titulo: creado.mapa.tema, autor: String(autor ?? "").slice(0, TOPES.autorNombre), capitulos };
    exigir(guardarAparte(clave(creado.mapa.id), libro), "No hay lugar en este navegador para guardar el libro (probá con uno más corto o archivá otro libro).");
    return creado;
}

export function leerLibro(mapaId) {
    const l = leerAparte(clave(mapaId), null);
    exigir(l, "No se encuentra el texto de este libro en este navegador.");
    return l;
}

/** El capítulo de un concepto del libro: { titulo, parrafos } (o null si el concepto no es un capítulo). */
export function capituloDe(conceptoId) {
    const c = leerConcepto(conceptoId);
    if (!Number.isInteger(c.capitulo)) return null;
    return leerLibro(c.mapa).capitulos[c.capitulo] ?? null;
}

/** El texto del capítulo para la IA, recortado al tope (lo primero del capítulo, que es lo que lo presenta). */
export function textoParaIA(conceptoId, tope = TOPES.textoCapituloIA) {
    const cap = capituloDe(conceptoId);
    if (!cap) return "";
    let texto = "";
    for (const p of cap.parrafos) {
        if (texto.length + p.length + 1 > tope) break;
        texto += (texto ? "\n" : "") + p;
    }
    return texto || cap.parrafos[0]?.slice(0, tope) || "";
}

const normalizar = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Busca palabras en el libro (sin importar tildes ni mayúsculas). Devuelve los párrafos donde aparecen todas
 *  (o la mayoría), con su capítulo, los que más coinciden primero. */
export function buscarEnLibro(mapaId, consulta) {
    const palabras = [...new Set(normalizar(consulta).split(/[^a-z0-9ñ]+/).filter((p) => p.length >= 3))].slice(0, 8);
    if (!palabras.length) return [];
    const libro = leerLibro(mapaId);
    const resultados = [];
    libro.capitulos.forEach((cap, ci) => {
        cap.parrafos.forEach((parrafo, pi) => {
            const n = normalizar(parrafo);
            const coinciden = palabras.filter((p) => n.includes(p)).length;
            if (coinciden && coinciden >= Math.ceil(palabras.length / 2)) resultados.push({ capitulo: ci, titulo: cap.titulo, parrafo, indice: pi, coinciden });
        });
    });
    return resultados.sort((a, b) => b.coinciden - a.coinciden || a.capitulo - b.capitulo || a.indice - b.indice).slice(0, TOPES.resultadosBusqueda);
}
