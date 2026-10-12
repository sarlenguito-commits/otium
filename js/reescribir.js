// ============================================
// Reescribir (en Escribir): qué parte del texto se manda y los pedidos rápidos.
//   - Qué parte: lo seleccionado, el párrafo donde está el cursor o todo el texto (rango()).
//   - Pedidos rápidos: las 3 instrucciones que más usaste; mientras no haya 3, se completan con las de base.
//     Se recuerdan solo en este navegador (es una comodidad, no un dato importante).
// ============================================
import { PREFIJO, TOPES } from "./config.js?v=3f84cb5f35";

export const PEDIDOS_BASE = ["Más claro y simple", "Técnico y preciso", "Formal, para mandar por mail"];
export const MAS_IDEAS = ["Más artístico", "Como un poema", "Más corto, sin perder ideas", "Para un chico de 12 años", "Como un tuit"];
export const ALCANCES = { seleccion: "Lo que seleccionaste", parrafo: "El párrafo donde está el cursor", todo: "Todo el texto" };

const CLAVE = `${PREFIJO}-reescrituras`;
const MAX_GUARDADOS = 30;

function leerUsos() {
    try {
        const u = JSON.parse(localStorage.getItem(CLAVE) ?? "{}");
        return u && typeof u === "object" && !Array.isArray(u) ? u : {};
    } catch {
        return {};
    }
}

/** Los 3 pedidos para los botones: los más usados (y, a igual uso, el último), completados con los de base. */
export function pedidosRapidos(usos = leerUsos()) {
    const usados = Object.entries(usos)
        .filter(([t, u]) => t.trim() && Number.isFinite(u?.n))
        .sort(([, a], [, b]) => b.n - a.n || (b.ultimo ?? 0) - (a.ultimo ?? 0))
        .map(([t]) => t);
    const mismo = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
    const lista = usados.slice(0, 3);
    for (const base of PEDIDOS_BASE) if (lista.length < 3 && !lista.some((x) => mismo(x, base))) lista.push(base);
    return lista;
}

/** Suma un uso de una instrucción (se guardan las 30 más usadas). Devuelve los usos nuevos. */
export function anotarUso(instruccion, { usos = leerUsos(), ahora = Date.now(), guardar = true } = {}) {
    const t = String(instruccion ?? "").trim().slice(0, TOPES.instruccionReescribir);
    if (!t) return usos;
    const existente = Object.keys(usos).find((k) => k.toLowerCase() === t.toLowerCase()) ?? t;
    const nuevos = { ...usos, [existente]: { n: (usos[existente]?.n ?? 0) + 1, ultimo: ahora } };
    const recortados = Object.fromEntries(Object.entries(nuevos).sort(([, a], [, b]) => b.n - a.n || b.ultimo - a.ultimo).slice(0, MAX_GUARDADOS));
    if (guardar) {
        try {
            localStorage.setItem(CLAVE, JSON.stringify(recortados));
        } catch {
            // sin guardado: los botones quedan con los de base
        }
    }
    return recortados;
}

/** Qué parte del texto se reescribe: { inicio, fin, texto, contexto } (contexto: el párrafo, si es un pedazo).
 *  inicio/fin: la selección del cuadro (iguales si solo está el cursor). Tira un Error con el motivo si no se puede. */
export function rango(texto, { inicio, fin }, alcance) {
    const parrafoEn = (pos) => {
        const desde = texto.lastIndexOf("\n", pos - 1) + 1;
        const hasta = texto.indexOf("\n", pos);
        return { desde, hasta: hasta < 0 ? texto.length : hasta };
    };
    let r;
    if (alcance === "todo") r = { inicio: 0, fin: texto.length, contexto: "" };
    else if (alcance === "parrafo") {
        const p = parrafoEn(inicio);
        r = { inicio: p.desde, fin: p.hasta, contexto: "" };
    } else if (alcance === "seleccion") {
        if (fin <= inicio) throw new Error("Seleccioná primero el pedazo que querés reescribir.");
        const p = parrafoEn(inicio);
        r = { inicio, fin, contexto: fin <= p.hasta ? texto.slice(p.desde, p.hasta).slice(0, TOPES.contextoExplicar) : "" };
    } else throw new Error("Elegí qué reescribir.");
    // Sin los espacios de las puntas (así el reemplazo no se come los renglones)
    while (r.inicio < r.fin && /\s/.test(texto[r.inicio])) r.inicio++;
    while (r.fin > r.inicio && /\s/.test(texto[r.fin - 1])) r.fin--;
    r.texto = texto.slice(r.inicio, r.fin);
    if (!r.texto) throw new Error(alcance === "parrafo" ? "El cursor está en un renglón vacío: ponelo en el párrafo que querés reescribir." : "No hay texto para reescribir.");
    if (r.texto.length > TOPES.textoReescribir) {
        throw new Error(`Es mucho para una vez (${r.texto.length} letras; hasta ${TOPES.textoReescribir}): reescribilo de a párrafos.`);
    }
    return r;
}

/** El texto con el rango cambiado por lo nuevo. */
export const reemplazar = (texto, r, nuevo) => texto.slice(0, r.inicio) + nuevo + texto.slice(r.fin);

/** El texto con lo nuevo agregado abajo del párrafo donde termina el rango (o al final, si era todo). */
export function agregarAbajo(texto, r, nuevo) {
    const fin = texto.indexOf("\n", r.fin);
    const donde = fin < 0 ? texto.length : fin;
    return `${texto.slice(0, donde)}\n\n${nuevo}${texto.slice(donde)}`;
}
