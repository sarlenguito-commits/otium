// ============================================
// Copia de tus datos: exportar e importar. Todo lo de OTIUM vive solo en el navegador; si se borran los datos del
// navegador, se pierde. La copia es un archivo .json con los datos (mapas, fichas, repasos, escritos, notas,
// neuronas, resaltados) y el texto de los libros. NO lleva el token ni la conexión con la IA (eso es de cada navegador).
// Importar REEMPLAZA todo lo de este navegador por lo del archivo. Si no entra (sin lugar), vuelve todo como estaba.
// ============================================
import { leerTodo, guardarTodo, leerAparte, guardarAparte, nombresAparte, exigir } from "./nucleo.js?v=67446a5e85";
import { usuarioActual } from "./sesion.js?v=67446a5e85";
import { puedeEstudiar } from "../../permisos.js?v=67446a5e85";
import { NOMBRE_APP, VERSION, VERSION_DATOS } from "../../config.js?v=67446a5e85";

const TIPO = "respaldo";
const LIBRO = "libro-";
const ULTIMA = "ultima-copia";
// Las listas que tiene que traer una copia (las demás se completan vacías al leer, como siempre)
const LISTAS = ["usuarios", "mapas", "conceptos", "mensajes", "tarjetas", "dias", "sesiones"];
const OPCIONALES = ["resaltados", "escritos", "notas", "neuronas"];
const CON_ID = ["usuarios", "mapas", "conceptos"];
const ID_VALIDO = /^[A-Za-z0-9_-]{1,40}$/;

function quien() {
    const u = usuarioActual();
    exigir(u, "No hay nadie usando la app.");
    exigir(puedeEstudiar(u), "No tenés permiso para esto.");
    return u;
}

/** Todo lo de este navegador, listo para guardar en un archivo. */
export function armarRespaldo({ ahora = Date.now() } = {}) {
    quien();
    const datos = leerTodo();
    const libros = {};
    for (const m of datos.mapas) {
        const libro = leerAparte(`${LIBRO}${m.id}`, null);
        if (libro) libros[m.id] = libro;
    }
    return { app: NOMBRE_APP, tipo: TIPO, version: VERSION, versionDatos: VERSION_DATOS, fecha: new Date(ahora).toISOString(), datos, libros };
}

const esObjeto = (x) => typeof x === "object" && x !== null && !Array.isArray(x);

/** Controla que el archivo sea una copia de OTIUM que esta versión entiende. Devuelve { datos, libros }. */
export function validarRespaldo(r) {
    exigir(esObjeto(r) && r.app === NOMBRE_APP && r.tipo === TIPO, `El archivo no es una copia de ${NOMBRE_APP}.`);
    exigir(r.versionDatos === VERSION_DATOS, `La copia es de otra versión de los datos (${r.versionDatos}); esta app usa la ${VERSION_DATOS}.`);
    const datos = r.datos;
    exigir(esObjeto(datos), "La copia no trae los datos.");
    for (const lista of LISTAS) exigir(Array.isArray(datos[lista]), `La copia está incompleta (falta "${lista}").`);
    for (const lista of OPCIONALES) exigir(datos[lista] === undefined || Array.isArray(datos[lista]), `La copia está dañada ("${lista}").`);
    for (const lista of [...LISTAS, ...OPCIONALES].filter((l) => l !== "dias")) {
        exigir((datos[lista] ?? []).every(esObjeto), `La copia está dañada ("${lista}").`);
    }
    for (const lista of CON_ID) exigir(datos[lista].every((x) => typeof x.id === "string" && ID_VALIDO.test(x.id)), `La copia está dañada ("${lista}").`);
    exigir(datos.usuarios.some((u) => u.activo && u.rol === "dueno"), "La copia no tiene a nadie para usar la app.");
    exigir(esObjeto(datos.ajustes), "La copia está incompleta (faltan los ajustes).");

    const libros = r.libros ?? {};
    exigir(esObjeto(libros), "Los libros de la copia están dañados.");
    const mapas = new Set(datos.mapas.map((m) => m.id));
    for (const [id, libro] of Object.entries(libros)) {
        exigir(ID_VALIDO.test(id) && mapas.has(id), "La copia trae un libro que no es de ninguno de sus mapas.");
        exigir(esObjeto(libro) && Array.isArray(libro.capitulos)
            && libro.capitulos.every((c) => esObjeto(c) && Array.isArray(c.parrafos) && c.parrafos.every((p) => typeof p === "string")),
        "Un libro de la copia está dañado.");
    }
    return { datos: { ...datos, version: VERSION_DATOS }, libros };
}

/** Reemplaza TODO lo de este navegador por lo de la copia. Si algo no entra, deja todo como estaba y avisa. */
export function importarRespaldo(r) {
    quien();
    const { datos, libros } = validarRespaldo(r);
    const antes = {
        datos: leerAparte("datos", null),
        libros: nombresAparte(LIBRO).map((n) => [n, leerAparte(n, null)]),
    };
    const sacarLibros = () => nombresAparte(LIBRO).forEach((n) => guardarAparte(n, null));
    try {
        sacarLibros();
        for (const [id, libro] of Object.entries(libros)) {
            exigir(guardarAparte(`${LIBRO}${id}`, libro), "sin lugar");
        }
        guardarTodo(datos, "todo");
    } catch {
        sacarLibros();
        antes.libros.forEach(([n, libro]) => guardarAparte(n, libro));
        guardarAparte("datos", antes.datos);
        throw new Error("No hay lugar en este navegador para todo lo de la copia (¿muchos libros?). Quedó todo como estaba.");
    }
    return { mapas: datos.mapas.filter((m) => !m.archivado).length, libros: Object.keys(libros).length };
}

/** Cuándo se bajó la última copia desde este navegador (o null). */
export const ultimaCopia = () => leerAparte(ULTIMA, null);
export const anotarCopia = (ahora = Date.now()) => guardarAparte(ULTIMA, ahora);
