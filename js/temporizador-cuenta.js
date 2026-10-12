// ============================================
// La cuenta del temporizador, sin pantalla (así se prueba con horas fijas): empezar, calcular, paso, pausar,
// seguir y minutosAlCortar. La pantalla está en temporizador.js.
// ============================================
import { TEMPORIZADORES } from "./config.js?v=c366a4baa6";

const MIN = 60 * 1000;

/** Estado nuevo al empezar: foco (o flow) desde ahora. */
export function empezar(preset, ahora) {
    if (!Object.hasOwn(TEMPORIZADORES, preset)) throw new Error("Temporizador desconocido.");
    return { preset, fase: preset === "flow" ? "flow" : "foco", desde: ahora, pausadoEn: null, avisoFlow: false };
}

/** Cuánto va y cuánto falta de la fase (en segundos). En flow no hay "falta". */
export function calcular(estado, ahora) {
    const p = TEMPORIZADORES[estado.preset];
    const hasta = estado.pausadoEn ?? ahora;
    const van = Math.max(0, Math.floor((hasta - estado.desde) / 1000));
    if (estado.fase === "flow") return { van, faltan: null };
    const total = (estado.fase === "foco" ? p.foco : p.descanso) * 60;
    return { van, faltan: Math.max(0, total - van) };
}

/** Avanza el reloj: devuelve el estado nuevo y lo que pasó ("fin-foco", "fin-descanso", "aviso-flow"). */
export function paso(estado, ahora) {
    if (estado.pausadoEn) return { estado, eventos: [] };
    const p = TEMPORIZADORES[estado.preset];
    const { faltan, van } = calcular(estado, ahora);
    if (estado.fase === "flow") {
        if (!estado.avisoFlow && van >= p.aviso * 60) return { estado: { ...estado, avisoFlow: true }, eventos: ["aviso-flow"] };
        return { estado, eventos: [] };
    }
    if (faltan > 0) return { estado, eventos: [] };
    // La fase siguiente arranca cuando terminó esta (no "ahora"): así no se corre si la pestaña estuvo dormida
    const fin = estado.desde + (estado.fase === "foco" ? p.foco : p.descanso) * MIN;
    const siguiente = estado.fase === "foco" ? "descanso" : "foco";
    return { estado: { ...estado, fase: siguiente, desde: Math.min(fin, ahora) }, eventos: [`fin-${estado.fase}`] };
}

export const pausar = (estado, ahora) => (estado.pausadoEn ? estado : { ...estado, pausadoEn: ahora });

export function seguir(estado, ahora) {
    if (!estado.pausadoEn) return estado;
    return { ...estado, desde: estado.desde + (ahora - estado.pausadoEn), pausadoEn: null };
}

/** Minutos de estudio que cuentan al cortar: lo que iba de foco o de flow (no el descanso). */
export function minutosAlCortar(estado, ahora) {
    if (estado.fase === "descanso") return 0;
    return Math.floor(calcular(estado, ahora).van / 60);
}
