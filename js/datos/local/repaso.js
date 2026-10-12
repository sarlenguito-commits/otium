// ============================================
// Repaso espaciado, racha semanal, sesiones del temporizador y ajustes.
// - Cada concepto que pasa a "aprendido" suma sus preguntas como tarjetas (una sola vez).
// - Las tarjetas vuelven a 1, 3, 7, 14, 30 y 60 días (INTERVALOS), con un tope por día.
// - La racha es semanal y suave: cuenta días con actividad, sin castigo si se corta.
// Las funciones reciben { hoy } para poder probarlas con días fijos (por defecto, hoy de verdad).
// ============================================
import { leerTodo, guardarTodo, idNuevo, exigir } from "./nucleo.js?v=068461cf66";
import { usuarioActual } from "./sesion.js?v=068461cf66";
import { limpiarResultado, limpiarAjustes, limpiarSesion } from "../reglas.js?v=068461cf66";
import { puedeEstudiar } from "../../permisos.js?v=068461cf66";
import { TOPES, INTERVALOS, AJUSTES_INICIALES } from "../../config.js?v=068461cf66";
import { fechaLocalISO, sumarDias, lunesDe } from "../../fechas.js?v=068461cf66";

function quien() {
    const u = usuarioActual();
    exigir(u, "No hay nadie usando la app.");
    exigir(puedeEstudiar(u), "No tenés permiso para esto.");
    return u;
}

const ajustesDe = (datos) => ({ ...AJUSTES_INICIALES, ...(datos.ajustes ?? {}) });

/** Las tarjetas de mapas sin archivar. */
function tarjetasVivas(datos) {
    const vivos = new Set(datos.mapas.filter((m) => !m.archivado).map((m) => m.id));
    return datos.tarjetas.filter((t) => vivos.has(t.mapa));
}

const respondidaEl = (t, dia) => t.historial.some((h) => h.dia === dia);

// ---------- Para la capa de datos (las usa mapas.js, no las pantallas) ----------

/** Suma las preguntas de la ficha (o la del escalón de abajo) como tarjetas, si el concepto todavía no tiene.
 *  Arrancan para mañana. */
export function sumarTarjetas(datos, concepto, hoy) {
    const preguntas = concepto.ficha?.preguntas.length
        ? concepto.ficha.preguntas
        : concepto.escalon ? [{ pregunta: concepto.escalon.pregunta, respuesta: concepto.escalon.esperada }] : [];
    if (!preguntas.length) return [];
    if (datos.tarjetas.some((t) => t.concepto === concepto.id)) return [];
    exigir(datos.tarjetas.length + preguntas.length <= TOPES.tarjetasTotal, `Se llegó al máximo de ${TOPES.tarjetasTotal} tarjetas.`);
    const nuevas = preguntas.map((p) => ({
        id: idNuevo("t"),
        concepto: concepto.id,
        mapa: concepto.mapa,
        pregunta: p.pregunta,
        respuesta: p.respuesta,
        escalon: 0,
        proxima: sumarDias(hoy, INTERVALOS[0]),
        creada: hoy,
        historial: [],
    }));
    datos.tarjetas.push(...nuevas);
    return nuevas;
}

/** Anota que hoy hubo actividad (para la racha). Guarda los últimos días, sin repetir. */
export function anotarDia(datos, hoy) {
    if (datos.dias.includes(hoy)) return;
    datos.dias.push(hoy);
    datos.dias.sort();
    if (datos.dias.length > TOPES.diasGuardados) datos.dias.splice(0, datos.dias.length - TOPES.diasGuardados);
}

// ---------- Repaso ----------

/** Lo que toca repasar hoy: vencidas (la más atrasada primero), hasta el tope del día menos lo ya respondido. */
export function repasosDeHoy({ hoy = fechaLocalISO() } = {}) {
    quien();
    const datos = leerTodo();
    const vivas = tarjetasVivas(datos);
    const yaHoy = vivas.filter((t) => respondidaEl(t, hoy)).length;
    const lugar = Math.max(0, ajustesDe(datos).topeRepasos - yaHoy);
    return vivas
        .filter((t) => t.proxima <= hoy && !respondidaEl(t, hoy))
        .sort((a, b) => a.proxima.localeCompare(b.proxima) || a.creada.localeCompare(b.creada))
        .slice(0, lugar);
}

/** Cuántas quedan hoy (ya con el tope) y cuántas respondiste hoy. */
export function resumenRepaso({ hoy = fechaLocalISO() } = {}) {
    quien();
    const datos = leerTodo();
    return {
        pendientes: repasosDeHoy({ hoy }).length,
        respondidas: tarjetasVivas(datos).filter((t) => respondidaEl(t, hoy)).length,
        tope: ajustesDe(datos).topeRepasos,
    };
}

/** "Me salió" sube un escalón, "más o menos" repite el intervalo, "no me salió" vuelve al primero. */
export function responderTarjeta(id, resultado, { hoy = fechaLocalISO() } = {}) {
    quien();
    const r = limpiarResultado(resultado);
    const datos = leerTodo();
    const t = datos.tarjetas.find((x) => x.id === id);
    exigir(t, "No existe esa tarjeta.");
    exigir(tarjetasVivas(datos).includes(t), "Esa tarjeta es de un mapa archivado.");
    exigir(!respondidaEl(t, hoy), "Esa tarjeta ya la repasaste hoy.");
    const ultimo = INTERVALOS.length - 1;
    if (r === "bien") t.escalon = Math.min(t.escalon + 1, ultimo);
    if (r === "mal") t.escalon = 0;
    t.proxima = sumarDias(hoy, INTERVALOS[t.escalon]);
    t.historial.push({ dia: hoy, resultado: r });
    anotarDia(datos, hoy);
    guardarTodo(datos, "repaso");
    return t;
}

// ---------- Racha semanal ----------

/** Días con actividad esta semana (lunes a domingo), la meta, si se cumplió y cuántas semanas seguidas. */
export function rachaSemanal({ hoy = fechaLocalISO() } = {}) {
    quien();
    const datos = leerTodo();
    const meta = ajustesDe(datos).metaSemanal;
    const dias = new Set(datos.dias);
    const diasDeLaSemana = (lunes) => Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i)).filter((d) => dias.has(d)).length;
    const lunes = lunesDe(hoy);
    const estaSemana = diasDeLaSemana(lunes);
    const cumplida = estaSemana >= meta;
    // Semanas anteriores seguidas con la meta cumplida (hasta un año para atrás)
    let seguidas = 0;
    for (let l = sumarDias(lunes, -7), n = 0; n < 53 && diasDeLaSemana(l) >= meta; l = sumarDias(l, -7), n++) seguidas++;
    return { dias: estaSemana, meta, cumplida, semanasSeguidas: seguidas + (cumplida ? 1 : 0), activoHoy: dias.has(hoy) };
}

// ---------- Sesiones del temporizador ----------

export function registrarSesion(campos, { hoy = fechaLocalISO() } = {}) {
    quien();
    const s = limpiarSesion(campos);
    const datos = leerTodo();
    datos.sesiones.push({ id: idNuevo("s"), dia: hoy, ...s, cuando: Date.now() });
    if (datos.sesiones.length > TOPES.sesionesTotal) datos.sesiones.splice(0, datos.sesiones.length - TOPES.sesionesTotal);
    anotarDia(datos, hoy);
    guardarTodo(datos, "sesiones");
    return s;
}

/** Minutos de foco de hoy (suma de las sesiones del temporizador). */
export function minutosDeHoy({ hoy = fechaLocalISO() } = {}) {
    quien();
    return leerTodo().sesiones.filter((s) => s.dia === hoy).reduce((t, s) => t + s.minutos, 0);
}

// ---------- Ajustes ----------

export function leerAjustes() {
    quien();
    return ajustesDe(leerTodo());
}

export function guardarAjustes(campos) {
    quien();
    const limpios = limpiarAjustes(campos);
    const datos = leerTodo();
    datos.ajustes = { ...ajustesDe(datos), ...limpios };
    guardarTodo(datos, "ajustes");
    return datos.ajustes;
}
