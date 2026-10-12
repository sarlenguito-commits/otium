// ============================================
// Ayudas para las pantallas: buscar elementos, escapar texto, avisos y "vacío".
// ============================================

export const $ = (selector, raiz = document) => raiz.querySelector(selector);
export const $$ = (selector, raiz = document) => [...raiz.querySelectorAll(selector)];

/** Escapa texto para meterlo en HTML. SIEMPRE en todo dato que entra a un innerHTML (evita que un nombre trampa
 *  como <img onerror=…> rompa o meta código). */
export function esc(texto) {
    const reemplazos = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return String(texto ?? "").replace(/[&<>"']/g, (c) => reemplazos[c]);
}

/** Cartelito abajo que se va solo. tipo: "ok" o "error". */
export function aviso(texto, tipo = "ok") {
    const caja = $("#avisos");
    if (!caja) return;
    const el = document.createElement("div");
    el.className = `aviso aviso--${tipo}`;
    el.textContent = texto;
    caja.append(el);
    setTimeout(() => el.remove(), tipo === "error" ? 6000 : 3500);
}

/** Lo que se muestra cuando no hay nada ("Primeros pasos"). */
export const vacio = (titulo, texto = "") =>
    `<div class="vacio"><p class="vacio__titulo">${esc(titulo)}</p>${texto ? `<p>${esc(texto)}</p>` : ""}</div>`;

/** Corre algo de la capa de datos: si sale bien muestra el aviso; si falla, el mensaje del error. */
export function intentar(hacer, textoOk) {
    try {
        const r = hacer();
        if (textoOk) aviso(textoOk);
        return r ?? true;
    } catch (e) {
        aviso(e.message, "error");
        return false;
    }
}
