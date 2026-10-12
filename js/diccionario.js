// ============================================
// Diccionario: Wikcionario en español (el diccionario libre de Wikipedia). Gratis, sin cupo de IA y con fuente real.
// Se pide la entrada en texto plano y se arma: de dónde viene la palabra (etimología) y sus acepciones, por tipo.
// Si la palabra no está (por ejemplo, un verbo conjugado), se prueba en minúscula y en singular; si igual no está,
// la pantalla ofrece "Explicar con IA".
// ============================================
import { TOPES } from "./config.js?v=9aef454a4b";

const API = "https://es.wiktionary.org/w/api.php";
// Secciones que no son acepciones (aunque tengan números)
const NO_SON_ACEPCIONES = /^(Pronunciación|Traducciones|Véase|Locuciones|Refranes|Conjugación|Información|Referencias|Derivad|Relacionad|Compuestos|Parónimos)/;
// Lo que Wikcionario pone cuando falta la etimología
const RELLENO = /^Si puedes,|incorpórala/;

/** Arma la entrada a partir del texto plano de Wikcionario: { etimologia, acepciones: [{ tipo, etiqueta, texto }] }. */
export function parsearWikcionario(extracto, max = 6) {
    const texto = String(extracto ?? "");
    const inicio = texto.search(/^== Español ==\s*$/m);
    if (inicio < 0) return null;
    const resto = texto.slice(inicio).split("\n").slice(1);
    const finSeccion = resto.findIndex((l) => /^== [^=].* ==\s*$/.test(l)); // la próxima lengua
    const lineas = (finSeccion < 0 ? resto : resto.slice(0, finSeccion)).map((l) => l.trim());
    let etimologia = "";
    let tipo = "";
    const acepciones = [];
    for (let i = 0; i < lineas.length && acepciones.length < max; i++) {
        const l = lineas[i];
        if (/^=== Etimología/.test(l)) {
            const siguiente = lineas.slice(i + 1).find((x) => x && !x.startsWith("="));
            if (!etimologia && siguiente && !RELLENO.test(siguiente)) etimologia = siguiente;
            tipo = "";
            continue;
        }
        // "==== Sustantivo femenino ====" o "=== Forma verbal ===" (los verbos conjugados vienen un nivel más arriba)
        const titulo = l.match(/^(={3,4})\s*(.+?)\s*\1$/);
        if (titulo) {
            tipo = NO_SON_ACEPCIONES.test(titulo[2]) ? "" : titulo[2];
            continue;
        }
        const numero = l.match(/^(\d+)(?:\s+(.+))?$/);
        if (numero && tipo) {
            const definicion = lineas.slice(i + 1).find((x) => x);
            if (definicion && !/^\d+(\s|$)/.test(definicion) && !definicion.startsWith("=")) {
                acepciones.push({ tipo, etiqueta: numero[2] ?? "", texto: definicion.slice(0, TOPES.definicion) });
            }
        }
    }
    return acepciones.length ? { etimologia: etimologia.slice(0, TOPES.definicion), acepciones } : null;
}

async function pedirEntrada(palabra, buscar) {
    const u = new URL(API);
    Object.entries({ action: "query", prop: "extracts", titles: palabra, explaintext: "1", format: "json", formatversion: "2", origin: "*" })
        .forEach(([k, v]) => u.searchParams.set(k, v));
    const r = await buscar(u, { signal: AbortSignal.timeout(15_000) });
    if (!r.ok) return null;
    const pagina = (await r.json())?.query?.pages?.[0];
    return pagina && !pagina.missing ? pagina.extract : null;
}

/** Busca una palabra. Devuelve { palabra, etimologia, acepciones, url } o null si Wikcionario no la tiene. */
export async function buscarPalabra(palabra, { buscar = (...a) => fetch(...a) } = {}) {
    const limpia = String(palabra ?? "").trim().replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "").slice(0, 60);
    if (!limpia || /\s/.test(limpia)) return null;
    const minuscula = limpia.toLowerCase();
    const intentos = [...new Set([limpia, minuscula, minuscula.replace(/es$/, ""), minuscula.replace(/s$/, "")])].filter((p) => p.length > 1);
    for (const p of intentos) {
        let extracto;
        try {
            extracto = await pedirEntrada(p, buscar);
        } catch {
            throw new Error("No se pudo consultar el diccionario. ¿Hay internet?");
        }
        const entrada = extracto && parsearWikcionario(extracto);
        if (!entrada) continue;
        const resultado = { palabra: p, ...entrada, url: `https://es.wiktionary.org/wiki/${encodeURIComponent(p)}`, lema: null };
        // "empieza" es una forma de "empezar": se trae también lo que significa la palabra de base
        const base = lemaDe(entrada);
        if (base && base !== p) {
            const deBase = await pedirEntrada(base, buscar).catch(() => null);
            const entradaBase = deBase && parsearWikcionario(deBase, 3);
            if (entradaBase) resultado.lema = { palabra: base, acepciones: entradaBase.acepciones };
        }
        return resultado;
    }
    return null;
}

/** Si todas las acepciones son "Forma …" ("Tercera persona … de empezar."), la palabra de base ("empezar"). */
export function lemaDe(entrada) {
    if (!entrada?.acepciones.length || !entrada.acepciones.every((a) => /^Forma/.test(a.tipo))) return null;
    return entrada.acepciones[0].texto.match(/\bde (\p{L}+)\.?$/u)?.[1]?.toLowerCase() ?? null;
}
