// ============================================
// Reglas de los datos: limpian y controlan cada campo con su tope. Si algo no cumple, tiran un Error con un
// mensaje para mostrarle a la persona. Las usa la capa de datos (y, el día de mañana, la nube).
// ============================================
import { TOPES, MODOS, ESTADOS, CERTEZAS, VIGENCIAS, HABLANTES, RESULTADOS, TEMPORIZADORES } from "../config.js?v=0c5d6339d6";

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
        aviso: texto(f.aviso, { nombre: "el aviso", tope: TOPES.aviso }),
        verificar: lista(f.verificar, { nombre: "los términos para verificar", tope: TOPES.terminosVerificar }).map((t) =>
            texto(t, { nombre: "el término para verificar", tope: TOPES.terminoVerificar, obligatorio: true })),
        preguntas: lista(f.preguntas, { nombre: "las preguntas", tope: TOPES.preguntas }).map((p) => ({
            pregunta: texto(p?.pregunta, { nombre: "la pregunta", tope: TOPES.pregunta, obligatorio: true }),
            respuesta: texto(p?.respuesta, { nombre: "la respuesta esperada", tope: TOPES.respuesta, obligatorio: true }),
        })),
    };
}
