// ============================================
// El cupo de IA del día en palabras: plan, porcentaje y una recomendación de cómo aprovecharlo.
// La idea pedagógica: aprender más no es abrir más fichas, sino recordar lo que ya abriste (lo mejor probado).
// ============================================
import { COSTOS_IA } from "./config.js?v=43661a5cb5";

const FICHA_NUEVA = COSTOS_IA.ficha + COSTOS_IA.previos; // una ficha con su escalón de abajo

/** { plan, pct, quedan, texto } a partir del cupo que devolvió el servidor. */
export function resumenCupo(cupo) {
    const total = Math.max(0, Number(cupo?.total) || 0);
    const usado = Math.min(total, Math.max(0, Number(cupo?.usado) || 0));
    const quedan = total - usado;
    const pct = total ? Math.round((usado / total) * 100) : 100;
    const fichas = Math.floor(quedan / FICHA_NUEVA);
    let texto;
    if (!quedan) {
        texto = "Se terminó la IA de hoy. Buen momento para repasar: el repaso no usa IA. Mañana se renueva.";
    } else if (fichas >= 1) {
        texto = `Te quedan ${quedan}: alcanza para unas ${fichas} ${fichas === 1 ? "ficha nueva" : "fichas nuevas"} (${FICHA_NUEVA} cada una) ` +
            `o ${quedan} comprobaciones (preguntas, contalo o Feynman, 1 cada una). Recomendado: 1 o 2 fichas nuevas por día ` +
            "y el resto para comprobar lo que ya abriste: recordar fija más que leer de más.";
    } else {
        texto = `Te quedan ${quedan}: no alcanza para una ficha nueva, pero sí para ${quedan} ${quedan === 1 ? "comprobación" : "comprobaciones"} ` +
            "(preguntas, contalo o Feynman). Usalas en lo que ya abriste.";
    }
    return { plan: cupo?.plan?.nombre ?? "", usado, total, pct, quedan, texto };
}
