// ============================================
// El cupo de IA del día en palabras: plan, porcentaje y una recomendación de cómo aprovecharlo.
// La idea pedagógica: aprender más no es abrir más fichas, sino recordar lo que ya abriste (lo mejor probado).
// ============================================
import { COSTOS_IA } from "./config.js?v=dc7e5675b5";

const FICHA_NUEVA = COSTOS_IA.ficha + COSTOS_IA.previos; // una ficha con su escalón de abajo

// Cuánto gasta cada cosa, en unidades de cupo y en pedidos a Google (estimados del 12/10, docs\plan-premium.md).
// Una ficha nueva son 2 pedidos (el escalón de abajo y la ficha); una sesión, una mezcla típica.
export const ESTIMADOS = {
    ficha: { unidades: FICHA_NUEVA, pedidos: 2 },
    mensaje: { unidades: COSTOS_IA.charla, pedidos: 1 },
    tranqui: { unidades: 20, pedidos: 16, que: "15 a 30 minutos: 2 fichas nuevas, unas preguntas, un Contalo y algo de charla" },
    intensa: { unidades: 60, pedidos: 45, que: "1 a 2 horas: un tema nuevo, 5 fichas, preguntas, un Feynman y mucha charla" },
    tema: { unidades: 70, pedidos: 50, que: "un tema mediano entero: el árbol con unas 12 fichas y sus preguntas" },
    libro: { unidades: 80, pedidos: 40, que: "un libro de 20 capítulos: la ficha de cada capítulo" },
};

const restante = (total, usado) => (Number.isFinite(Number(total)) && Number.isFinite(Number(usado)) && usado !== null ? Math.max(0, total - usado) : Infinity);

/** Lo que de verdad queda hoy: lo menor entre tu cupo, el tope general (unidades) y los pedidos a Google.
 *  Devuelve { tuyo, unidades, pedidos, fichas, mensajes, tranqui, intensas } (pedidos = Infinity si no se sabe). */
export function calcularUso(cupo) {
    const tuyo = restante(cupo?.total, cupo?.usado);
    const g = cupo?.general ?? {};
    const unidades = Math.min(tuyo, restante(g.total, g.usado));
    const pedidos = restante(g.limiteGoogle, g.pedidosGoogle);
    const cuantas = (e) => {
        const n = Math.min(Math.floor(unidades / e.unidades), Math.floor(pedidos / e.pedidos));
        return Number.isFinite(n) ? Math.max(0, n) : 0; // sin datos del servidor, no se promete nada
    };
    return {
        tuyo: tuyo === Infinity ? 0 : tuyo,
        unidades: unidades === Infinity ? 0 : unidades,
        pedidos,
        fichas: cuantas(ESTIMADOS.ficha),
        mensajes: cuantas(ESTIMADOS.mensaje),
        tranqui: cuantas(ESTIMADOS.tranqui),
        intensas: cuantas(ESTIMADOS.intensa),
    };
}

/** { plan, pct, quedan, texto } a partir del cupo que devolvió el servidor. */
export function resumenCupo(cupo) {
    const total = Math.max(0, Number(cupo?.total) || 0);
    const usado = Math.min(total, Math.max(0, Number(cupo?.usado) || 0));
    // Si el día de todos viene más justo que tu cupo, manda el de todos
    const quedan = Math.min(total - usado, cupo?.general ? calcularUso(cupo).unidades : Infinity);
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
