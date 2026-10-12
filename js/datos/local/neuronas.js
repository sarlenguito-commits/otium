// ============================================
// Cerebro 🧠: neuronas (Fase 1). Cada neurona es un objeto aparte (no toca los mapas): título, descripción breve,
// texto editable (se resalta igual que un libro o un escrito) y vínculos de ida a Mapas o a conceptos (Fichas o
// Ramas). El vínculo de vuelta (qué neuronas usan un concepto o un mapa) se calcula, no se guarda dos veces.
// Como el texto cambia al editar, los resaltados se reubican igual que en un escrito (ver escritos.js).
// ============================================
import { leerTodo, guardarTodo, idNuevo, exigir } from "./nucleo.js?v=b757769159";
import { usuarioActual } from "./sesion.js?v=b757769159";
import { limpiarNeurona } from "../reglas.js?v=b757769159";
import { puedeEstudiar } from "../../permisos.js?v=b757769159";
import { TOPES } from "../../config.js?v=b757769159";
import { sePisan } from "./resaltados.js?v=b757769159";

function quien() {
    const u = usuarioActual();
    exigir(u, "No hay nadie usando la app.");
    exigir(puedeEstudiar(u), "No tenés permiso para esto.");
    return u;
}

const parrafosDe = (texto) => String(texto ?? "").split("\n");

/** ¿El resaltado sigue marcando lo mismo en este texto? (igual que en escritos.js) */
const enSuLugar = (r, parrafos) => parrafos[r.parrafo]?.slice(r.inicio, r.fin) === r.texto;

/** Mueve los resaltados de una neurona a donde está ahora lo que marcaban, igual que reubicar() en escritos.js. */
function reubicar(datos, neurona) {
    const parrafos = parrafosDe(neurona.texto);
    const propios = datos.resaltados.filter((r) => r.neurona === neurona.id);
    const ubicados = propios.filter((r) => enSuLugar(r, parrafos));
    for (const r of propios.filter((x) => !ubicados.includes(x))) {
        const orden = [...new Set([r.parrafo, ...parrafos.keys()])].filter((i) => i < parrafos.length);
        let hallado = null;
        for (const i of orden) {
            for (let k = parrafos[i].indexOf(r.texto); k >= 0 && !hallado; k = parrafos[i].indexOf(r.texto, k + 1)) {
                const lugar = { neurona: r.neurona, parrafo: i, inicio: k, fin: k + r.texto.length };
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

function vinculoValido(datos, v) {
    if (v.tipo === "mapa") exigir(datos.mapas.some((m) => m.id === v.id && !m.archivado), "Uno de los vínculos apunta a un mapa que no existe.");
    else exigir(datos.conceptos.some((c) => c.id === v.id), "Uno de los vínculos apunta a una ficha o rama que no existe.");
}

/** Las neuronas, la última editada primero. */
export function listarNeuronas() {
    quien();
    return [...leerTodo().neuronas].sort((a, b) => b.editado - a.editado);
}

export function leerNeurona(id) {
    quien();
    const n = leerTodo().neuronas.find((x) => x.id === id);
    exigir(n, "No existe esa neurona.");
    return n;
}

export function crearNeurona(campos = {}) {
    quien();
    const limpio = limpiarNeurona({ vinculos: [], abarcamiento: null, ...campos });
    const datos = leerTodo();
    limpio.vinculos.forEach((v) => vinculoValido(datos, v));
    exigir(datos.neuronas.length < TOPES.neuronasTotal, `Se llegó al máximo de ${TOPES.neuronasTotal} neuronas.`);
    const ahora = Date.now();
    const nueva = { id: idNuevo("ne"), ...limpio, creado: ahora, editado: ahora };
    datos.neuronas.push(nueva);
    guardarTodo(datos, "neuronas");
    return nueva;
}

/** Cambia el título, la descripción, el texto, el abarcamiento o los vínculos (solo lo que venga). */
export function editarNeurona(id, campos) {
    quien();
    const limpio = limpiarNeurona(campos, { parcial: true });
    const datos = leerTodo();
    const n = datos.neuronas.find((x) => x.id === id);
    exigir(n, "No existe esa neurona.");
    if (limpio.vinculos !== undefined) limpio.vinculos.forEach((v) => vinculoValido(datos, v));
    Object.assign(n, limpio, { editado: Date.now() });
    if (limpio.texto !== undefined) reubicar(datos, n);
    guardarTodo(datos, "neuronas");
    return n;
}

/** Agrega un vínculo nuevo (sin repetirlo). */
export function agregarVinculo(id, vinculo) {
    const n = leerNeurona(id);
    if (n.vinculos.some((v) => v.tipo === vinculo.tipo && v.id === vinculo.id)) return n;
    return editarNeurona(id, { vinculos: [...n.vinculos, vinculo] });
}

export function quitarVinculo(id, vinculo) {
    const n = leerNeurona(id);
    return editarNeurona(id, { vinculos: n.vinculos.filter((v) => !(v.tipo === vinculo.tipo && v.id === vinculo.id)) });
}

/** Saca una neurona y sus resaltados (es contenido de la persona: si la quita, se va). */
export function quitarNeurona(id) {
    quien();
    const datos = leerTodo();
    const i = datos.neuronas.findIndex((x) => x.id === id);
    exigir(i >= 0, "No existe esa neurona.");
    datos.neuronas.splice(i, 1);
    datos.resaltados = datos.resaltados.filter((r) => r.neurona !== id);
    guardarTodo(datos, "neuronas");
}

/** Los resaltados de una neurona que ya no están en el texto (se editó y lo que marcaban no aparece). */
export function resaltadosSueltosDeNeurona(id) {
    quien();
    const datos = leerTodo();
    const n = datos.neuronas.find((x) => x.id === id);
    exigir(n, "No existe esa neurona.");
    const parrafos = parrafosDe(n.texto);
    return datos.resaltados.filter((r) => r.neurona === id && !enSuLugar(r, parrafos));
}

/** Las neuronas que están vinculadas a un mapa o a un concepto (para "Neuronas que la usan" en Estudio). */
export function neuronasDeVinculo(tipo, id) {
    quien();
    return leerTodo().neuronas.filter((n) => n.vinculos.some((v) => v.tipo === tipo && v.id === id));
}
