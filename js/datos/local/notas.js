// ============================================
// Notas personales de una ficha. Son dos cosas:
//   - Lo que resaltaste al leer: cada resaltado aparece en la ficha de su capítulo, o en la que elijas (su "vínculo").
//   - "Tu desarrollo": notas sueltas que escribís en la ficha, en orden (para armar el capítulo o el tema paso a paso).
// Todo se puede renombrar, editar y quitar; las notas sueltas también se reordenan.
// ============================================
import { leerTodo, guardarTodo, idNuevo, exigir } from "./nucleo.js?v=ceaa36c8f6";
import { usuarioActual } from "./sesion.js?v=ceaa36c8f6";
import { limpiarNota } from "../reglas.js?v=ceaa36c8f6";
import { puedeEstudiar } from "../../permisos.js?v=ceaa36c8f6";
import { TOPES } from "../../config.js?v=ceaa36c8f6";

function quien() {
    const u = usuarioActual();
    exigir(u, "No hay nadie usando la app.");
    exigir(puedeEstudiar(u), "No tenés permiso para esto.");
    return u;
}

/** La ficha donde aparece un resaltado: la que eligió la persona o, si no eligió, la de su capítulo. */
export const fichaDe = (r) => r.vinculo ?? r.concepto;

/** Lo que va en "Notas personales" de una ficha: { resaltados (en el orden del texto), sueltas (en su orden) }. */
export function notasDe(conceptoId) {
    quien();
    const datos = leerTodo();
    const capitulo = (id) => datos.conceptos.find((c) => c.id === id)?.capitulo ?? 0;
    return {
        resaltados: datos.resaltados
            .filter((r) => fichaDe(r) === conceptoId)
            .sort((a, b) => !!a.escrito - !!b.escrito || capitulo(a.concepto) - capitulo(b.concepto) || a.parrafo - b.parrafo || a.inicio - b.inicio),
        sueltas: datos.notas.filter((n) => n.concepto === conceptoId),
    };
}

export function crearNota(conceptoId, campos) {
    quien();
    const limpio = limpiarNota(campos);
    const datos = leerTodo();
    const c = datos.conceptos.find((x) => x.id === conceptoId);
    exigir(c, "No existe esa ficha.");
    exigir(datos.notas.length < TOPES.notasTotal, `Se llegó al máximo de ${TOPES.notasTotal} notas.`);
    const ahora = Date.now();
    const nueva = { id: idNuevo("n"), concepto: c.id, mapa: c.mapa, ...limpio, creado: ahora, editado: ahora };
    datos.notas.push(nueva);
    guardarTodo(datos, "notas");
    return nueva;
}

export function editarNota(id, campos) {
    quien();
    const limpio = limpiarNota(campos);
    const datos = leerTodo();
    const n = datos.notas.find((x) => x.id === id);
    exigir(n, "No existe esa nota.");
    Object.assign(n, limpio, { editado: Date.now() });
    guardarTodo(datos, "notas");
    return n;
}

/** Sube (-1) o baja (+1) una nota entre las de su misma ficha. */
export function moverNota(id, paso) {
    quien();
    exigir(paso === -1 || paso === 1, "Solo se mueve de a un lugar.");
    const datos = leerTodo();
    const n = datos.notas.find((x) => x.id === id);
    exigir(n, "No existe esa nota.");
    const hermanas = datos.notas.filter((x) => x.concepto === n.concepto);
    const otra = hermanas[hermanas.indexOf(n) + paso];
    if (!otra) return; // ya está arriba (o abajo) de todo
    const i = datos.notas.indexOf(n);
    const j = datos.notas.indexOf(otra);
    [datos.notas[i], datos.notas[j]] = [otra, n];
    guardarTodo(datos, "notas");
}

export function quitarNota(id) {
    quien();
    const datos = leerTodo();
    const i = datos.notas.findIndex((x) => x.id === id);
    exigir(i >= 0, "No existe esa nota.");
    datos.notas.splice(i, 1);
    guardarTodo(datos, "notas");
}
