// ============================================
// Escritos: la escritura libre (pestaña Escribir). Cada escrito tiene título, texto y, si querés, un mapa al que
// pertenece (así sus resaltados pueden ir a las "Notas personales" de una ficha de ese mapa).
// Se resalta igual que un libro (resaltados con { escrito }). Como el texto cambia al escribir, después de cada
// cambio los resaltados se reubican: si lo que marcaban sigue en el texto, se mueven ahí; si no, quedan "sueltos"
// (no se pintan, pero no se pierden: la pantalla los muestra aparte con su nota).
// ============================================
import { leerTodo, guardarTodo, idNuevo, exigir } from "./nucleo.js?v=db209204dc";
import { usuarioActual } from "./sesion.js?v=db209204dc";
import { limpiarEscrito } from "../reglas.js?v=db209204dc";
import { puedeEstudiar } from "../../permisos.js?v=db209204dc";
import { TOPES } from "../../config.js?v=db209204dc";
import { sePisan } from "./resaltados.js?v=db209204dc";

function quien() {
    const u = usuarioActual();
    exigir(u, "No hay nadie usando la app.");
    exigir(puedeEstudiar(u), "No tenés permiso para esto.");
    return u;
}

const parrafosDe = (texto) => String(texto ?? "").split("\n");

/** ¿El resaltado sigue marcando lo mismo en este texto? */
export const enSuLugar = (r, parrafos) => parrafos[r.parrafo]?.slice(r.inicio, r.fin) === r.texto;

/** Mueve los resaltados de un escrito a donde está ahora lo que marcaban (primero en su párrafo, después en el resto). */
export function reubicar(datos, escrito) {
    const parrafos = parrafosDe(escrito.texto);
    const propios = datos.resaltados.filter((r) => r.escrito === escrito.id);
    const ubicados = propios.filter((r) => enSuLugar(r, parrafos));
    for (const r of propios.filter((x) => !ubicados.includes(x))) {
        const orden = [...new Set([r.parrafo, ...parrafos.keys()])].filter((i) => i < parrafos.length);
        let hallado = null;
        for (const i of orden) {
            for (let k = parrafos[i].indexOf(r.texto); k >= 0 && !hallado; k = parrafos[i].indexOf(r.texto, k + 1)) {
                const lugar = { escrito: r.escrito, concepto: r.concepto, parrafo: i, inicio: k, fin: k + r.texto.length };
                if (!ubicados.some((o) => sePisan(o, lugar))) hallado = lugar;
            }
            if (hallado) break;
        }
        if (hallado) {
            Object.assign(r, { parrafo: hallado.parrafo, inicio: hallado.inicio, fin: hallado.fin });
            ubicados.push(r);
        }
    }
}

/** Los escritos, el último editado primero. */
export function listarEscritos() {
    quien();
    return [...leerTodo().escritos].sort((a, b) => b.editado - a.editado);
}

export function leerEscrito(id) {
    quien();
    const e = leerTodo().escritos.find((x) => x.id === id);
    exigir(e, "No existe ese escrito.");
    return e;
}

function mapaValido(datos, mapa) {
    if (mapa) exigir(datos.mapas.some((m) => m.id === mapa && !m.archivado), "Ese mapa no existe.");
}

export function crearEscrito(campos = {}) {
    quien();
    const limpio = limpiarEscrito(campos);
    const datos = leerTodo();
    mapaValido(datos, limpio.mapa);
    exigir(datos.escritos.length < TOPES.escritosTotal, `Se llegó al máximo de ${TOPES.escritosTotal} escritos.`);
    const ahora = Date.now();
    const nuevo = { id: idNuevo("e"), ...limpio, creado: ahora, editado: ahora };
    datos.escritos.push(nuevo);
    guardarTodo(datos, "escritos");
    return nuevo;
}

/** Cambia el título, el texto o el mapa (solo lo que venga). */
export function editarEscrito(id, campos) {
    quien();
    const limpio = limpiarEscrito(campos, { parcial: true });
    const datos = leerTodo();
    const e = datos.escritos.find((x) => x.id === id);
    exigir(e, "No existe ese escrito.");
    if (limpio.mapa !== undefined) mapaValido(datos, limpio.mapa);
    Object.assign(e, limpio, { editado: Date.now() });
    const propios = datos.resaltados.filter((r) => r.escrito === id);
    if (limpio.texto !== undefined) reubicar(datos, e);
    // Otro mapa: los resaltados pasan a ese mapa y pierden el vínculo con fichas del anterior
    if (limpio.mapa !== undefined) {
        for (const r of propios) {
            if (r.mapa !== e.mapa) r.vinculo = null;
            r.mapa = e.mapa;
        }
    }
    guardarTodo(datos, "escritos");
    return e;
}

/** Saca un escrito y sus resaltados (es contenido de la persona: si lo quita, se va). */
export function quitarEscrito(id) {
    quien();
    const datos = leerTodo();
    const i = datos.escritos.findIndex((x) => x.id === id);
    exigir(i >= 0, "No existe ese escrito.");
    datos.escritos.splice(i, 1);
    datos.resaltados = datos.resaltados.filter((r) => r.escrito !== id);
    guardarTodo(datos, "escritos");
}

/** Los resaltados de un escrito que ya no están en el texto (se editó y lo que marcaban no aparece). */
export function resaltadosSueltos(id) {
    quien();
    const datos = leerTodo();
    const e = datos.escritos.find((x) => x.id === id);
    exigir(e, "No existe ese escrito.");
    const parrafos = parrafosDe(e.texto);
    return datos.resaltados.filter((r) => r.escrito === id && !enSuLugar(r, parrafos));
}
