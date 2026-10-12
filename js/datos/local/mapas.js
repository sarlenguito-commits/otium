// ============================================
// Los mapas de ramas, sus conceptos (con su ficha) y el chat de cada mapa.
// Cada función que guarda: quién es, exigir() su permiso, limpiar con reglas.js, guardar, dejar historial.
// Nada se borra: un mapa se archiva, y queda cuándo y por qué.
// ============================================
import { leerTodo, guardarTodo, idNuevo, exigir } from "./nucleo.js?v=367750287f";
import { usuarioActual } from "./sesion.js?v=367750287f";
import {
    limpiarTema, limpiarModo, limpiarRama, limpiarEstado, limpiarFicha, limpiarMensaje, limpiarHablante, limpiarMotivo, limpiarEscalon,
} from "../reglas.js?v=367750287f";
import { puedeEstudiar, puedeArchivar } from "../../permisos.js?v=367750287f";
import { TOPES } from "../../config.js?v=367750287f";
import { fechaLocalISO } from "../../fechas.js?v=367750287f";
import { sumarTarjetas, anotarDia } from "./repaso.js?v=367750287f";

function quien(permiso = puedeEstudiar) {
    const u = usuarioActual();
    exigir(u, "No hay nadie usando la app.");
    exigir(permiso(u), "No tenés permiso para esto.");
    return u;
}

function buscarMapa(datos, id) {
    const m = datos.mapas.find((x) => x.id === id);
    exigir(m, "No existe ese mapa.");
    return m;
}

function buscarConcepto(datos, id) {
    const c = datos.conceptos.find((x) => x.id === id);
    exigir(c, "No existe ese concepto.");
    return c;
}

/** Cada cambio en un mapa lo deja como "usado ahora" (así Inicio muestra primero el último). */
function tocar(mapa, ahora) {
    exigir(!mapa.archivado, "Ese mapa está archivado.");
    mapa.usado = ahora;
}

const conceptosDe = (datos, mapaId) => datos.conceptos.filter((c) => c.mapa === mapaId);

/** Cuántos niveles hay desde la raíz hasta este concepto (la raíz es 0). */
function nivel(datos, concepto) {
    let n = 0;
    let actual = concepto;
    while (actual.padre) {
        actual = buscarConcepto(datos, actual.padre);
        n++;
        exigir(n <= TOPES.profundidad + 1, "El mapa tiene un ciclo de ramas.");
    }
    return n;
}

// ---------- Leer ----------

/** Los mapas sin archivar, el último usado primero, con su avance. */
export function listarMapas({ conArchivados = false } = {}) {
    quien();
    const datos = leerTodo();
    return datos.mapas
        .filter((m) => conArchivados || !m.archivado)
        .sort((a, b) => b.usado - a.usado)
        .map((m) => ({ ...m, avance: avanceDe(datos, m.id) }));
}

function avanceDe(datos, mapaId) {
    // La raíz es el tema: no cuenta como concepto a aprender
    const cs = conceptosDe(datos, mapaId).filter((c) => c.padre);
    return { aprendidos: cs.filter((c) => c.estado === "aprendido").length, total: cs.length };
}

/** Un mapa con sus conceptos y su chat (los mensajes, del más viejo al más nuevo). */
export function leerMapa(id) {
    quien();
    const datos = leerTodo();
    const mapa = buscarMapa(datos, id);
    return {
        mapa: { ...mapa, avance: avanceDe(datos, id) },
        conceptos: conceptosDe(datos, id),
        mensajes: datos.mensajes.filter((m) => m.mapa === id).sort((a, b) => a.cuando - b.cuando),
    };
}

export function leerConcepto(id) {
    quien();
    return buscarConcepto(leerTodo(), id);
}

/** Las ramas de un concepto, en el orden en que se agregaron. */
export function ramasDe(conceptoId) {
    quien();
    return leerTodo().conceptos.filter((c) => c.padre === conceptoId).sort((a, b) => a.orden - b.orden);
}

/** Los títulos desde la raíz hasta el concepto (incluido): ["Bases de la psicología", "Conductismo", "…"]. */
export function caminoDe(conceptoId) {
    quien();
    const datos = leerTodo();
    const camino = [];
    for (let c = buscarConcepto(datos, conceptoId); c; c = c.padre ? buscarConcepto(datos, c.padre) : null) {
        camino.unshift(c.titulo);
        exigir(camino.length <= TOPES.profundidad + 1, "El mapa tiene un ciclo de ramas.");
    }
    return camino;
}

/** Los conceptos aprendidos de todos los mapas: sirven para saltear prerrequisitos y armar analogías. */
export function aprendidos() {
    quien();
    const datos = leerTodo();
    const vivos = new Set(datos.mapas.filter((m) => !m.archivado).map((m) => m.id));
    return datos.conceptos.filter((c) => c.estado === "aprendido" && c.padre && vivos.has(c.mapa));
}

// ---------- Guardar ----------

/** Mapa nuevo: guarda el mapa y su raíz (el tema), que queda "en curso". */
export function crearMapa({ tema, modo = "guiado" } = {}) {
    const u = quien();
    const datos = leerTodo();
    const vivos = datos.mapas.filter((m) => !m.archivado).length;
    exigir(vivos < TOPES.mapasTotal, `Se llegó al máximo de ${TOPES.mapasTotal} mapas.`);
    const ahora = Date.now();
    const mapa = {
        id: idNuevo("m"),
        tema: limpiarTema(tema),
        modo: limpiarModo(modo),
        creado: { por: u.id, cuando: ahora },
        usado: ahora,
        archivado: null,
        historial: [{ que: "creado", por: u.id, cuando: ahora }],
    };
    const raiz = conceptoNuevo({ mapa: mapa.id, padre: null, titulo: mapa.tema, resumen: "", orden: 0, ahora });
    raiz.estado = "en_curso";
    datos.mapas.push(mapa);
    datos.conceptos.push(raiz);
    guardarTodo(datos, "mapas");
    return { mapa, raiz };
}

function conceptoNuevo({ mapa, padre, titulo, resumen, orden, ahora, escalon = null }) {
    return {
        id: idNuevo("c"),
        mapa,
        padre,
        titulo,
        resumen,
        orden,
        estado: "sin_abrir",
        ficha: null,
        escalon, // si es un "escalón de abajo": { porQue, explicacion, pregunta, esperada }
        previosRevisados: false, // si ya se le preguntó a la IA qué conceptos previos da por sabidos
        prerrequisitos: [],
        aprendido: null,
        creado: ahora,
        historial: [{ que: "agregado", cuando: ahora }],
    };
}

/** Mapa de un libro: la raíz es el libro y cada capítulo es una rama (con su número, "capitulo"). Los capítulos no
 *  tienen el tope de ramas por concepto: un libro puede tener muchos. */
export function crearMapaConCapitulos({ tema, capitulos }) {
    quien();
    exigir(Array.isArray(capitulos) && capitulos.length > 0, "El libro no tiene capítulos.");
    exigir(capitulos.length <= TOPES.capitulosPorLibro, `Hasta ${TOPES.capitulosPorLibro} capítulos por libro.`);
    const titulos = capitulos.map((t, i) => limpiarRama({ titulo: String(t ?? "").trim().slice(0, TOPES.tituloConcepto) || `Parte ${i + 1}` }).titulo);
    const { mapa, raiz } = crearMapa({ tema: String(tema ?? "").trim().slice(0, TOPES.tema) || "Libro sin título", modo: "libro" });
    const datos = leerTodo();
    exigir(conceptosDe(datos, mapa.id).length + titulos.length <= TOPES.conceptosPorMapa, `Un mapa tiene hasta ${TOPES.conceptosPorMapa} conceptos.`);
    const ahora = Date.now();
    titulos.forEach((titulo, i) => {
        const c = conceptoNuevo({ mapa: mapa.id, padre: raiz.id, titulo, resumen: "", orden: i, ahora });
        c.capitulo = i;
        datos.conceptos.push(c);
    });
    guardarTodo(datos, "mapas");
    return { mapa, raiz };
}

/** Cuelga ramas nuevas de un concepto (lo que propone la IA, o en el modo libre lo que apareció en la charla).
 *  Una rama puede traer "escalon" si es un concepto previo con su explicación mínima. */
export function agregarRamas(padreId, ramas) {
    quien();
    exigir(Array.isArray(ramas) && ramas.length > 0, "No hay ramas para agregar.");
    const datos = leerTodo();
    const padre = buscarConcepto(datos, padreId);
    const mapa = buscarMapa(datos, padre.mapa);
    const limpias = ramas.map((r) => ({ ...limpiarRama(r), escalon: r?.escalon ? limpiarEscalon(r.escalon) : null }));
    const hermanas = datos.conceptos.filter((c) => c.padre === padreId);
    exigir(hermanas.length + limpias.length <= TOPES.ramasPorConcepto, `Un concepto tiene hasta ${TOPES.ramasPorConcepto} ramas.`);
    exigir(conceptosDe(datos, mapa.id).length + limpias.length <= TOPES.conceptosPorMapa, `Un mapa tiene hasta ${TOPES.conceptosPorMapa} conceptos.`);
    exigir(nivel(datos, padre) + 1 <= TOPES.profundidad, `El mapa llega hasta ${TOPES.profundidad} niveles: abrí esa rama como un mapa aparte.`);
    const repetida = limpias.find((r) => hermanas.some((h) => h.titulo.toLowerCase() === r.titulo.toLowerCase()));
    exigir(!repetida, `Ya hay una rama "${repetida?.titulo}" ahí.`);
    const ahora = Date.now();
    tocar(mapa, ahora);
    const nuevas = limpias.map((r, i) => conceptoNuevo({ mapa: mapa.id, padre: padreId, ...r, orden: hermanas.length + i, ahora }));
    datos.conceptos.push(...nuevas);
    guardarTodo(datos, "mapas");
    return nuevas;
}

/** Sin abrir → en curso → aprendido (y puede volver atrás: se puede olvidar). Queda en el historial.
 *  Al pasar a aprendido, sus preguntas entran al repaso espaciado y el día cuenta para la racha. */
export function cambiarEstado(conceptoId, estado, { hoy = fechaLocalISO() } = {}) {
    quien();
    const nuevo = limpiarEstado(estado);
    const datos = leerTodo();
    const c = buscarConcepto(datos, conceptoId);
    if (c.estado === nuevo) return c;
    const ahora = Date.now();
    tocar(buscarMapa(datos, c.mapa), ahora);
    c.estado = nuevo;
    c.aprendido = nuevo === "aprendido" ? ahora : null;
    c.historial.push({ que: `estado: ${nuevo}`, cuando: ahora });
    if (nuevo === "aprendido") {
        sumarTarjetas(datos, c, hoy);
        anotarDia(datos, hoy);
    }
    guardarTodo(datos, "mapas");
    return c;
}

/** Guarda (o reemplaza) la ficha de un concepto. Si había otra, queda en el historial cuándo cambió. */
export function guardarFicha(conceptoId, ficha) {
    quien();
    const limpia = limpiarFicha(ficha);
    const datos = leerTodo();
    const c = buscarConcepto(datos, conceptoId);
    const ahora = Date.now();
    tocar(buscarMapa(datos, c.mapa), ahora);
    c.historial.push({ que: c.ficha ? "ficha corregida" : "ficha nueva", cuando: ahora });
    c.ficha = limpia;
    guardarTodo(datos, "mapas");
    return c;
}

/** Le pone la explicación mínima de escalón a un concepto que ya existía sin ficha ni escalón. */
export function ponerEscalon(conceptoId, escalon) {
    quien();
    const limpio = limpiarEscalon(escalon);
    const datos = leerTodo();
    const c = buscarConcepto(datos, conceptoId);
    exigir(!c.ficha, "Ese concepto ya tiene ficha.");
    c.escalon = limpio;
    guardarTodo(datos, "mapas");
    return c;
}

/** Anota que ya se revisaron los conceptos previos de este concepto (para no volver a gastar cupo en eso). */
export function marcarPreviosRevisados(conceptoId) {
    quien();
    const datos = leerTodo();
    const c = buscarConcepto(datos, conceptoId);
    c.previosRevisados = true;
    guardarTodo(datos, "mapas");
    return c;
}

/** Los conceptos que hay que saber antes (de cualquier mapa). */
export function ponerPrerrequisitos(conceptoId, ids) {
    quien();
    exigir(Array.isArray(ids), "Los prerrequisitos tienen que ser una lista.");
    exigir(ids.length <= TOPES.prerrequisitos, `Hasta ${TOPES.prerrequisitos} prerrequisitos por concepto.`);
    const datos = leerTodo();
    const c = buscarConcepto(datos, conceptoId);
    const unicos = [...new Set(ids)];
    unicos.forEach((id) => {
        exigir(id !== conceptoId, "Un concepto no puede ser prerrequisito de sí mismo.");
        buscarConcepto(datos, id);
    });
    const ahora = Date.now();
    tocar(buscarMapa(datos, c.mapa), ahora);
    c.prerrequisitos = unicos;
    guardarTodo(datos, "mapas");
    return c;
}

/** Un mensaje del chat del mapa (de la app o tuyo), opcionalmente atado a un concepto. */
export function agregarMensaje(mapaId, { quien: hablante, texto, concepto = null } = {}, { hoy = fechaLocalISO() } = {}) {
    quien();
    const datos = leerTodo();
    const mapa = buscarMapa(datos, mapaId);
    const limpio = { quien: limpiarHablante(hablante), texto: limpiarMensaje(texto) };
    if (concepto) exigir(buscarConcepto(datos, concepto).mapa === mapaId, "Ese concepto es de otro mapa.");
    const cuantos = datos.mensajes.filter((m) => m.mapa === mapaId).length;
    exigir(cuantos < TOPES.mensajesPorMapa, `El chat de un mapa guarda hasta ${TOPES.mensajesPorMapa} mensajes.`);
    const ahora = Date.now();
    tocar(mapa, ahora);
    const mensaje = { id: idNuevo("x"), mapa: mapaId, ...limpio, concepto, cuando: ahora };
    datos.mensajes.push(mensaje);
    if (limpio.quien === "vos") anotarDia(datos, hoy); // escribir para aprender también cuenta para la racha
    guardarTodo(datos, "mensajes");
    return mensaje;
}

/** Archivar (nunca borrar): el mapa deja de verse, con cuándo y por qué. */
export function archivarMapa(id, motivo) {
    const u = quien(puedeArchivar);
    const datos = leerTodo();
    const m = buscarMapa(datos, id);
    exigir(!m.archivado, "Ya estaba archivado.");
    const ahora = Date.now();
    m.archivado = { por: u.id, cuando: ahora, motivo: limpiarMotivo(motivo) };
    m.historial.push({ que: "archivado", por: u.id, cuando: ahora });
    guardarTodo(datos, "mapas");
    return m;
}
