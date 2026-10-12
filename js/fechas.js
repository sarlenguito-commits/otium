// ============================================
// Fechas armadas a mano, en hora local y en 24 h (toLocaleString da distinto en cada navegador).
// ============================================

const dos = (n) => String(n).padStart(2, "0");

/** "2026-10-10" del día local (no toISOString: ese es en hora de Londres y a la noche da el día siguiente). */
export const fechaLocalISO = (d = new Date()) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;

/** "2026-10-10" + 3 → "2026-10-13" (en hora local, a mediodía para que los cambios de horario no muevan el día). */
export function sumarDias(iso, dias) {
    const [a, m, d] = iso.split("-").map(Number);
    return fechaLocalISO(new Date(a, m - 1, d + dias, 12));
}

/** El lunes de la semana de esa fecha ("2026-10-11", domingo → "2026-10-05"). */
export function lunesDe(iso) {
    const [a, m, d] = iso.split("-").map(Number);
    const dia = new Date(a, m - 1, d, 12).getDay(); // 0 domingo … 6 sábado
    return sumarDias(iso, dia === 0 ? -6 : 1 - dia);
}

/** "10/10/2026 19:05" */
export function textoFechaHora(ms) {
    const d = new Date(ms);
    return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()} ${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

/** "recién", "hace 5 min", "hace 3 h", "ayer 18:30" o la fecha. */
export function cuandoFue(ms, ahora = Date.now()) {
    const min = Math.floor((ahora - ms) / 60000);
    if (min < 1) return "recién";
    if (min < 60) return `hace ${min} min`;
    if (min < 12 * 60) return `hace ${Math.floor(min / 60)} h`;
    const ayer = new Date(ahora);
    ayer.setDate(ayer.getDate() - 1);
    const d = new Date(ms);
    if (fechaLocalISO(d) === fechaLocalISO(ayer)) return `ayer ${dos(d.getHours())}:${dos(d.getMinutes())}`;
    return textoFechaHora(ms);
}
