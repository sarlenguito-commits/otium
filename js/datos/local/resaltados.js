// ============================================
// Resaltados: lo que la persona marca al leer un capítulo (y, más adelante, en sus escritos).
// Cada uno sabe DÓNDE está (el capítulo, el número de párrafo y desde qué letra hasta cuál), su color, una nota
// personal opcional, la explicación de la IA (si la pidió) y, opcionalmente, un título y un vínculo a una ficha.
// No se pisan: en un mismo párrafo, dos resaltados no pueden ocupar las mismas letras.
// ============================================
import { leerTodo, guardarTodo, idNuevo, exigir } from "./nucleo.js?v=91f4100bf5";
import { usuarioActual } from "./sesion.js?v=91f4100bf5";
import { limpiarResaltado, limpiarEdicionResaltado } from "../reglas.js?v=91f4100bf5";
import { puedeEstudiar } from "../../permisos.js?v=91f4100bf5";
import { TOPES } from "../../config.js?v=91f4100bf5";

function quien() {
    const u = usuarioActual();
    exigir(u, "No hay nadie usando la app.");
    exigir(puedeEstudiar(u), "No tenés permiso para esto.");
    return u;
}

const delMismoLugar = (a, b) => a.concepto === b.concepto && a.escrito === b.escrito && a.parrafo === b.parrafo;
const sePisan = (a, b) => delMismoLugar(a, b) && a.inicio < b.fin && b.inicio < a.fin;

/** Marca un pedazo de texto. donde = { concepto } (un capítulo) o { escrito } (un escrito propio, más adelante). */
export function crearResaltado(campos) {
    quien();
    const r = limpiarResaltado(campos);
    const datos = leerTodo();
    if (r.concepto) {
        const c = datos.conceptos.find((x) => x.id === r.concepto);
        exigir(c && Number.isInteger(c.capitulo), "Solo se puede resaltar en un capítulo de un libro.");
        r.mapa = c.mapa;
    }
    exigir(datos.resaltados.length < TOPES.resaltadosTotal, `Se llegó al máximo de ${TOPES.resaltadosTotal} resaltados.`);
    const pisado = datos.resaltados.find((x) => sePisan(x, r));
    exigir(!pisado, "Ya hay un resaltado ahí: tocalo para cambiarle el color o la nota.");
    const ahora = Date.now();
    const nuevo = { id: idNuevo("r"), ...r, creado: ahora, editado: ahora };
    datos.resaltados.push(nuevo);
    guardarTodo(datos, "resaltados");
    return nuevo;
}

export function leerResaltado(id) {
    quien();
    const r = leerTodo().resaltados.find((x) => x.id === id);
    exigir(r, "No existe ese resaltado.");
    return r;
}

/** Los resaltados de un capítulo (o de un escrito), en el orden del texto. */
export function resaltadosDe({ concepto = null, escrito = null }) {
    quien();
    return leerTodo().resaltados
        .filter((r) => (concepto ? r.concepto === concepto : r.escrito === escrito))
        .sort((a, b) => a.parrafo - b.parrafo || a.inicio - b.inicio);
}

/** Cambia el color, la nota, el título, la explicación o el vínculo (solo lo que venga). */
export function editarResaltado(id, cambios) {
    quien();
    const limpio = limpiarEdicionResaltado(cambios);
    const datos = leerTodo();
    const r = datos.resaltados.find((x) => x.id === id);
    exigir(r, "No existe ese resaltado.");
    // El vínculo: una ficha del mismo mapa (el libro); sin vínculo, el resaltado va a la ficha de su capítulo
    if (limpio.vinculo) exigir(datos.conceptos.some((c) => c.id === limpio.vinculo && (!r.mapa || c.mapa === r.mapa)), "Esa ficha no existe en este mapa.");
    Object.assign(r, limpio, { editado: Date.now() });
    guardarTodo(datos, "resaltados");
    return r;
}

/** Saca un resaltado (es contenido de la persona: si lo quita, se va). */
export function quitarResaltado(id) {
    quien();
    const datos = leerTodo();
    const i = datos.resaltados.findIndex((x) => x.id === id);
    exigir(i >= 0, "No existe ese resaltado.");
    datos.resaltados.splice(i, 1);
    guardarTodo(datos, "resaltados");
}
