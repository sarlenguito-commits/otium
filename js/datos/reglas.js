// ============================================
// Reglas de los datos: limpian y controlan cada campo con su tope. Si algo no cumple, tiran un Error con un
// mensaje para mostrarle a la persona. Las usa la capa de datos (y, el día de mañana, la nube).
// ============================================
import { TOPES, MODOS, ESTADOS, CERTEZAS, VIGENCIAS, HABLANTES, RESULTADOS, TEMPORIZADORES, COLORES_RESALTADO, ABARCAMIENTO } from "../config.js?v=ee9afa6f58";

function texto(valor, { nombre, tope, obligatorio = false }) {
    if (valor !== null && valor !== undefined && typeof valor !== "string" && typeof valor !== "number") {
        throw new Error(`${mayuscula(nombre)}: tiene que ser un texto.`);
    }
    const t = String(valor ?? "").trim();
    if (obligatorio && !t) throw new Error(`Falta ${nombre}.`);
    if (t.length > tope) throw new Error(`${mayuscula(nombre)}: hasta ${tope} letras (tiene ${t.length}).`);
    return t;
}

/** Un texto con tope (para quien necesite limpiar un campo suelto, como el servidor). */
export const limpiarTexto = (valor, opciones) => texto(valor, opciones);

const mayuscula = (s) => `${s[0].toUpperCase()}${s.slice(1)}`;

/** Una clave de una lista fija de config.js (Object.hasOwn: así "__proto__" o "toString" no pasan). */
function deLista(valor, lista, nombre) {
    if (typeof valor !== "string" || !Object.hasOwn(lista, valor)) throw new Error(`${mayuscula(nombre)}: no es una opción válida.`);
    return valor;
}

function lista(valor, { nombre, tope }) {
    const l = valor ?? [];
    if (!Array.isArray(l)) throw new Error(`${mayuscula(nombre)}: tiene que ser una lista.`);
    if (l.length > tope) throw new Error(`${mayuscula(nombre)}: hasta ${tope} (hay ${l.length}).`);
    return l;
}

/** Número entero entre min y max. Acepta "12" o " 12 "; rechaza vacío, decimales, letras, NaN e infinito. */
export function entero(valor, { nombre, min, max }) {
    const t = String(valor ?? "").trim();
    const n = /^-?\d+$/.test(t) ? Number(t) : NaN;
    if (!Number.isSafeInteger(n) || n < min || n > max) throw new Error(`${nombre}: un número entero de ${min} a ${max}.`);
    return n;
}

export const limpiarModo = (modo) => deLista(modo, MODOS, "el modo");
export const limpiarEstado = (estado) => deLista(estado, ESTADOS, "el estado");
export const limpiarHablante = (quien) => deLista(quien, HABLANTES, "quién habla");
export const limpiarNombre = (n) => texto(n, { nombre: "el nombre", tope: TOPES.nombre, obligatorio: true });
export const limpiarTema = (tema) => texto(tema, { nombre: "el tema", tope: TOPES.tema, obligatorio: true });
export const limpiarMotivo = (motivo) => texto(motivo, { nombre: "el motivo", tope: TOPES.motivo, obligatorio: true });
export const limpiarMensaje = (t) => texto(t, { nombre: "el mensaje", tope: TOPES.mensaje, obligatorio: true });

export const limpiarResultado = (r) => deLista(r, RESULTADOS, "el resultado");

/** Los ajustes que se cambian (solo los que vienen; los demás quedan como estaban). */
export function limpiarAjustes({ metaSemanal, topeRepasos, temporizador } = {}) {
    const limpios = {};
    if (metaSemanal !== undefined) limpios.metaSemanal = entero(metaSemanal, { nombre: "La meta semanal", min: TOPES.metaSemanalMin, max: TOPES.metaSemanalMax });
    if (topeRepasos !== undefined) limpios.topeRepasos = entero(topeRepasos, { nombre: "El tope de repasos", min: TOPES.topeRepasosMin, max: TOPES.topeRepasosMax });
    if (temporizador !== undefined) limpios.temporizador = deLista(temporizador, TEMPORIZADORES, "el temporizador");
    return limpios;
}

/** Un rato de estudio que terminó (foco del temporizador o flow). */
export function limpiarSesion({ minutos, tipo } = {}) {
    return {
        minutos: entero(minutos, { nombre: "Los minutos", min: 1, max: TOPES.minutosSesionMax }),
        tipo: deLista(tipo, { foco: 1, flow: 1 }, "el tipo de sesión"),
    };
}

/** Un escalón de abajo: por qué hace falta, la explicación más corta posible y una pregunta para chequearse. */
export function limpiarEscalon(e = {}) {
    if (typeof e !== "object" || e === null) throw new Error("El escalón tiene que ser un objeto.");
    return {
        porQue: texto(e.porQue, { nombre: "por qué hace falta", tope: TOPES.porQue }),
        explicacion: texto(e.explicacion, { nombre: "la explicación del escalón", tope: TOPES.explicacionEscalon, obligatorio: true }),
        pregunta: texto(e.pregunta, { nombre: "la pregunta del escalón", tope: TOPES.pregunta, obligatorio: true }),
        esperada: texto(e.esperada, { nombre: "la respuesta esperada del escalón", tope: TOPES.respuesta, obligatorio: true }),
    };
}

/** Un resaltado nuevo: dónde (capítulo, escrito o neurona; párrafo, desde-hasta), qué texto y de qué color. */
export function limpiarResaltado(r = {}) {
    const concepto = r.concepto ? texto(r.concepto, { nombre: "el capítulo", tope: 40 }) : null;
    const escrito = r.escrito ? texto(r.escrito, { nombre: "el escrito", tope: 40 }) : null;
    const neurona = r.neurona ? texto(r.neurona, { nombre: "la neurona", tope: 40 }) : null;
    if ([concepto, escrito, neurona].filter(Boolean).length !== 1) throw new Error("El resaltado tiene que estar en un capítulo, un escrito o una neurona.");
    const parrafo = entero(r.parrafo, { nombre: "El párrafo", min: 0, max: TOPES.parrafoMaximo });
    const inicio = entero(r.inicio, { nombre: "El comienzo", min: 0, max: TOPES.letraMaxima });
    const fin = entero(r.fin, { nombre: "El final", min: 1, max: TOPES.letraMaxima });
    if (fin <= inicio) throw new Error("El resaltado no puede estar vacío.");
    return {
        concepto, escrito, neurona, parrafo, inicio, fin,
        texto: texto(r.texto, { nombre: "el texto resaltado", tope: TOPES.resaltadoTexto, obligatorio: true }),
        color: deLista(r.color ?? "azul", COLORES_RESALTADO, "el color"),
        nota: texto(r.nota, { nombre: "la nota", tope: TOPES.nota }),
        titulo: texto(r.titulo, { nombre: "el título de la nota", tope: TOPES.tituloNota }),
        explicacion: r.explicacion ? texto(r.explicacion, { nombre: "la explicación", tope: TOPES.explicacionIA }) : null,
        vinculo: r.vinculo ? texto(r.vinculo, { nombre: "el vínculo", tope: 40 }) : null,
    };
}

/** Un escrito propio (escritura libre). El texto NO se recorta (los espacios y renglones son de quien escribe). */
export function limpiarEscrito(e = {}, { parcial = false } = {}) {
    const limpio = {};
    if (!parcial || e.titulo !== undefined) limpio.titulo = texto(e.titulo, { nombre: "el título", tope: TOPES.tituloEscrito }) || "Sin título";
    if (!parcial || e.texto !== undefined) {
        if (e.texto !== undefined && e.texto !== null && typeof e.texto !== "string") throw new Error("El escrito tiene que ser un texto.");
        const t = String(e.texto ?? "").replace(/\r\n?/g, "\n");
        if (t.length > TOPES.textoEscrito) throw new Error(`El escrito: hasta ${TOPES.textoEscrito} letras (tiene ${t.length}).`);
        limpio.texto = t;
    }
    if (!parcial || e.mapa !== undefined) limpio.mapa = e.mapa ? texto(e.mapa, { nombre: "el mapa", tope: 40 }) : null;
    return limpio;
}

/** Una nota suelta de una ficha ("Tu desarrollo"): título y texto (al menos uno de los dos). */
export function limpiarNota(n = {}) {
    const limpio = {
        titulo: texto(n.titulo, { nombre: "el título de la nota", tope: TOPES.tituloNota }),
        texto: texto(n.texto, { nombre: "la nota", tope: TOPES.nota }),
    };
    if (!limpio.titulo && !limpio.texto) throw new Error("La nota está vacía: escribí un título o el texto.");
    return limpio;
}

/** Un vínculo de una neurona a un Mapa o a un concepto (Ficha o Rama). */
function vinculoNeurona(v) {
    if (typeof v !== "object" || v === null) throw new Error("El vínculo tiene que ser un objeto.");
    return {
        tipo: deLista(v.tipo, { mapa: 1, concepto: 1 }, "el tipo de vínculo"),
        id: texto(v.id, { nombre: "el vínculo", tope: 40, obligatorio: true }),
    };
}

/** Una neurona (Cerebro 🧠): título, descripción breve, texto editable, nivel de abarcamiento y sus vínculos. */
export function limpiarNeurona(n = {}, { parcial = false } = {}) {
    const limpio = {};
    if (!parcial || n.titulo !== undefined) limpio.titulo = texto(n.titulo, { nombre: "el título", tope: TOPES.tituloNeurona }) || "Sin título";
    if (!parcial || n.descripcion !== undefined) limpio.descripcion = texto(n.descripcion, { nombre: "la descripción", tope: TOPES.descripcionNeurona });
    if (!parcial || n.texto !== undefined) {
        if (n.texto !== undefined && n.texto !== null && typeof n.texto !== "string") throw new Error("La neurona tiene que ser un texto.");
        const t = String(n.texto ?? "").replace(/\r\n?/g, "\n");
        if (t.length > TOPES.textoNeurona) throw new Error(`La neurona: hasta ${TOPES.textoNeurona} letras (tiene ${t.length}).`);
        limpio.texto = t;
    }
    if (!parcial || n.abarcamiento !== undefined) {
        limpio.abarcamiento = n.abarcamiento === null || n.abarcamiento === undefined ? null : deLista(String(n.abarcamiento), ABARCAMIENTO, "el abarcamiento");
        if (limpio.abarcamiento !== null) limpio.abarcamiento = Number(limpio.abarcamiento);
    }
    if (!parcial || n.vinculos !== undefined) {
        limpio.vinculos = lista(n.vinculos, { nombre: "los vínculos", tope: TOPES.vinculosPorNeurona }).map(vinculoNeurona);
    }
    return limpio;
}

/** Lo que se puede cambiar de un resaltado (solo lo que viene). */
export function limpiarEdicionResaltado(c = {}) {
    const limpio = {};
    if (c.color !== undefined) limpio.color = deLista(c.color, COLORES_RESALTADO, "el color");
    if (c.nota !== undefined) limpio.nota = texto(c.nota, { nombre: "la nota", tope: TOPES.nota });
    if (c.titulo !== undefined) limpio.titulo = texto(c.titulo, { nombre: "el título de la nota", tope: TOPES.tituloNota });
    if (c.explicacion !== undefined) limpio.explicacion = c.explicacion ? texto(c.explicacion, { nombre: "la explicación", tope: TOPES.explicacionIA }) : null;
    if (c.vinculo !== undefined) limpio.vinculo = c.vinculo ? texto(c.vinculo, { nombre: "el vínculo", tope: 40 }) : null;
    return limpio;
}

/** Una rama nueva del mapa: título obligatorio y una línea opcional de qué es. */
export function limpiarRama({ titulo, resumen = "" } = {}) {
    return {
        titulo: texto(titulo, { nombre: "el título", tope: TOPES.tituloConcepto, obligatorio: true }),
        resumen: texto(resumen, { nombre: "el resumen", tope: TOPES.resumenConcepto }),
    };
}

const certeza = (c) => deLista(c ?? "dudoso", CERTEZAS, "la certeza");

/** Texto con su marca de certeza (origen, influencias). */
function conCerteza(valor, nombre) {
    const v = valor ?? {};
    return { texto: texto(v.texto, { nombre, tope: TOPES.textoFicha, obligatorio: true }), certeza: certeza(v.certeza) };
}

function analogia(valor, { obligatoria }) {
    if (!valor && !obligatoria) return null;
    const v = valor ?? {};
    return {
        texto: texto(v.texto, { nombre: "la analogía", tope: TOPES.analogia, obligatorio: true }),
        noSeParece: texto(v.noSeParece, { nombre: "en qué no se parece", tope: TOPES.noSeParece, obligatorio: true }),
    };
}

/** De dónde se chequeó la ficha: solo artículos de Wikipedia en español (o nada). */
function fuente(valor) {
    if (!valor) return null;
    const titulo = texto(valor.titulo, { nombre: "el título de la fuente", tope: TOPES.fuenteTitulo, obligatorio: true });
    const url = texto(valor.url, { nombre: "la dirección de la fuente", tope: TOPES.fuenteUrl, obligatorio: true });
    if (!url.startsWith("https://es.wikipedia.org/")) throw new Error("La fuente tiene que ser un artículo de Wikipedia en español.");
    return { titulo, url };
}

/** La ficha completa de un concepto (formato fijo de docs\primera-version.md, sección 5). */
export function limpiarFicha(f = {}) {
    if (typeof f !== "object" || f === null) throw new Error("La ficha tiene que ser un objeto.");
    const v = f.vigencia ?? {};
    return {
        idea: texto(f.idea, { nombre: "la idea", tope: TOPES.idea, obligatorio: true }),
        definicion: texto(f.definicion, { nombre: "la definición", tope: TOPES.definicion, obligatorio: true }),
        origen: conCerteza(f.origen, "el origen"),
        autores: lista(f.autores, { nombre: "los autores", tope: TOPES.autores }).map((a) => ({
            nombre: texto(a?.nombre, { nombre: "el nombre del autor", tope: TOPES.autorNombre, obligatorio: true }),
            dijo: texto(a?.dijo, { nombre: "lo que dijo", tope: TOPES.autorDijo, obligatorio: true }),
            certeza: certeza(a?.certeza),
        })),
        vigencia: {
            estado: deLista(v.estado, VIGENCIAS, "la vigencia"),
            porque: texto(v.porque, { nombre: "el porqué de la vigencia", tope: TOPES.textoFicha, obligatorio: true }),
            certeza: certeza(v.certeza),
        },
        influencias: conCerteza(f.influencias, "las influencias"),
        analogia: analogia(f.analogia, { obligatoria: true }),
        analogiaPropia: analogia(f.analogiaPropia, { obligatoria: false }),
        errorComun: texto(f.errorComun, { nombre: "el error común", tope: TOPES.errorComun }),
        fuente: fuente(f.fuente),
        deLibro: f.deLibro
            ? {
                libro: texto(f.deLibro.libro, { nombre: "el libro", tope: TOPES.tituloLibro, obligatorio: true }),
                capitulo: texto(f.deLibro.capitulo, { nombre: "el capítulo", tope: TOPES.tituloLibro, obligatorio: true }),
            }
            : null,
        aviso: texto(f.aviso, { nombre: "el aviso", tope: TOPES.aviso }),
        verificar: lista(f.verificar, { nombre: "los términos para verificar", tope: TOPES.terminosVerificar }).map((t) =>
            texto(t, { nombre: "el término para verificar", tope: TOPES.terminoVerificar, obligatorio: true })),
        preguntas: lista(f.preguntas, { nombre: "las preguntas", tope: TOPES.preguntas }).map((p) => ({
            pregunta: texto(p?.pregunta, { nombre: "la pregunta", tope: TOPES.pregunta, obligatorio: true }),
            respuesta: texto(p?.respuesta, { nombre: "la respuesta esperada", tope: TOPES.respuesta, obligatorio: true }),
        })),
    };
}
