// ============================================
// Resaltados: lo que la persona marca al leer un capítulo (y, más adelante, en sus escritos).
// Cada uno sabe DÓNDE está (el capítulo, el número de párrafo y desde qué letra hasta cuál), su color, una nota
// personal opcional, la explicación de la IA (si la pidió) y, opcionalmente, un título y un vínculo a una ficha.
// No se pisan: en un mismo párrafo, dos resaltados no pueden ocupar las mismas letras.
// ============================================
import { leerTodo, guardarTodo, idNuevo, exigir } from "./nucleo.js?v=db209204dc";
import { usuarioActual } from "./sesion.js?v=db209204dc";
import { limpiarResaltado, limpiarEdicionResaltado } from "../reglas.js?v=db209204dc";
import { puedeEstudiar } from "../../permisos.js?v=db209204dc";
import { TOPES } from "../../config.js?v=db209204dc";

function quien() {
    const u = usuarioActual();
    exigir(u, "No hay nadie usando la app.");
    exigir(puedeEstudiar(u), "No tenés permiso para esto.");
    return u;
}

const delMismoLugar = (a, b) => a.concepto === b.concepto && a.escrito === b.escrito && a.neurona === b.neurona && a.parrafo === b.parrafo;
export const sePisan = (a, b) => delMismoLugar(a, b) && a.inicio < b.fin && b.inicio < a.fin;

/** Marca un pedazo de texto. donde = { concepto } (un capítulo), { escrito } o { neurona } (su propio texto). */
export function crearResaltado(campos) {
    quien();
    const r = limpiarResaltado(campos);
    const datos = leerTodo();
    let enEscrito = () => true;
    if (r.concepto) {
        const c = datos.conceptos.find((x) => x.id === r.concepto);
        exigir(c && Number.isInteger(c.capitulo), "Solo se puede resaltar en un capítulo de un libro.");
        r.mapa = c.mapa;
    } else if (r.escrito) {
        const e = datos.escritos.find((x) => x.id === r.escrito);
        exigir(e, "No existe ese escrito.");
        r.mapa = e.mapa ?? null;
        const parrafos = e.texto.split("\n");
        exigir(parrafos[r.parrafo]?.slice(r.inicio, r.fin) === r.texto, "Eso ya no está así en el escrito: volvé a seleccionarlo.");
        enEscrito = (x) => parrafos[x.parrafo]?.slice(x.inicio, x.fin) === x.texto;
    } else {
        const n = datos.neuronas.find((x) => x.id === r.neurona);
        exigir(n, "No existe esa neurona.");
        r.mapa = null;
        const parrafos = n.texto.split("\n");
        exigir(parrafos[r.parrafo]?.slice(r.inicio, r.fin) === r.texto, "Eso ya no está así en la neurona: volvé a seleccionarlo.");
        enEscrito = (x) => parrafos[x.parrafo]?.slice(x.inicio, x.fin) === x.texto;
    }
    exigir(datos.resaltados.length < TOPES.resaltadosTotal, `Se llegó al máximo de ${TOPES.resaltadosTotal} resaltados.`);
    // En un escrito o una neurona, los resaltados "sueltos" (lo que marcaban ya no está) no ocupan lugar
    const pisado = datos.resaltados.find((x) => sePisan(x, r) && (!(x.escrito || x.neurona) || enEscrito(x)));
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

/** Los resaltados de un capítulo, un escrito o una neurona, en el orden del texto. */
export function resaltadosDe({ concepto = null, escrito = null, neurona = null }) {
    quien();
    return leerTodo().resaltados
        .filter((r) => (concepto ? r.concepto === concepto : escrito ? r.escrito === escrito : r.neurona === neurona))
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
    if (limpio.vinculo) exigir(r.mapa && datos.conceptos.some((c) => c.id === limpio.vinculo && c.mapa === r.mapa), "Esa ficha no existe en este mapa.");
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
