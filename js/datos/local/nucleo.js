// ============================================
// Modo prueba, lo común: guardar y leer en el navegador (localStorage) con el prefijo de la app, la semilla, avisar
// los cambios y exigir().
// ============================================
import { PREFIJO, VERSION_DATOS } from "../../config.js?v=91f4100bf5";
import { crearSemilla } from "../../datos-prueba.js?v=91f4100bf5";

let prefijo = PREFIJO;
const oyentes = new Set();
const clave = (nombre) => `${prefijo}-${nombre}`;

/** Las pruebas usan otro prefijo para no tocar los datos de la demo. */
export function usarPrefijo(nuevo = PREFIJO) {
    prefijo = nuevo;
}

function leer(nombre, porDefecto) {
    try {
        const t = localStorage.getItem(clave(nombre));
        return t ? JSON.parse(t) : porDefecto;
    } catch {
        return porDefecto; // navegador sin guardado (modo privado estricto) o dato roto
    }
}

function guardar(nombre, valor) {
    try {
        if (valor === null) localStorage.removeItem(clave(nombre));
        else localStorage.setItem(clave(nombre), JSON.stringify(valor));
        return true;
    } catch {
        return false;
    }
}

/** Corta si no se cumple: la capa de datos lo usa para permisos y estados (el mensaje se le muestra a la persona). */
export function exigir(condicion, mensaje) {
    if (!condicion) throw new Error(mensaje);
}

/** Todos los datos. Si no hay, o cambió VERSION_DATOS, arranca con la semilla. Cada llamada trae una copia nueva. */
export function leerTodo() {
    const datos = leer("datos", null);
    if (datos?.version === VERSION_DATOS) {
        // Listas que se sumaron después: si faltan, se completan vacías (los datos de antes siguen intactos)
        for (const lista of ["resaltados", "escritos", "notas"]) if (!Array.isArray(datos[lista])) datos[lista] = [];
        return datos;
    }
    const nuevos = { version: VERSION_DATOS, ...crearSemilla() };
    guardar("datos", nuevos);
    return nuevos;
}

export function guardarTodo(datos, que = "datos") {
    exigir(guardar("datos", datos), "No se pudo guardar: el navegador no deja (¿modo privado o sin lugar?).");
    avisar(que);
}

function avisar(que) {
    oyentes.forEach((fn) => {
        try {
            fn(que);
        } catch (e) {
            console.error(e);
        }
    });
}

/** Escuchar los cambios ("tareas", "todo"…). Devuelve la función para dejar de escuchar. */
export function alCambiar(fn) {
    oyentes.add(fn);
    return () => oyentes.delete(fn);
}

/** Vuelve a los datos de ejemplo y sin sesión (solo existe en modo prueba). */
export function reiniciarDatos() {
    guardar("datos", null);
    guardar("sesion", null);
    leerTodo();
    avisar("todo");
}

export const idNuevo = (letra) => `${letra}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/** Datos grandes que van aparte de los de siempre (por ejemplo, el texto de un libro). */
export const leerAparte = (nombre, porDefecto) => leer(nombre, porDefecto);
export const guardarAparte = (nombre, valor) => guardar(nombre, valor);

export const leerSesion = () => leer("sesion", null);
export const guardarSesion = (id) => guardar("sesion", id ?? null);

// ---------- Errores inesperados (se anotan solos y se ven en "Acerca de") ----------
const TOPE_ERRORES = 20;

export function anotarError(mensaje) {
    const lista = leer("errores", []);
    lista.unshift({ mensaje: String(mensaje ?? "").slice(0, 200), cuando: Date.now(), donde: location.hash.slice(0, 40) });
    guardar("errores", lista.slice(0, TOPE_ERRORES));
}

export const leerErrores = () => leer("errores", []);
export const borrarErrores = () => guardar("errores", null);
