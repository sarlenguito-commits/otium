// ============================================
// La sesión: la app es de una sola persona, así que se entra directo (sin elegir a nadie ni contraseñas).
// ============================================
import { leerTodo, guardarTodo, exigir } from "./nucleo.js?v=d337193a0e";
import { limpiarNombre } from "../reglas.js?v=d337193a0e";

/** La persona que usa la app: la única activa. */
export function usuarioActual() {
    return leerTodo().usuarios.find((u) => u.activo) ?? null;
}

/** Cómo se llama quien usa la app (se pregunta en la bienvenida). */
export function cambiarNombre(nombre) {
    const limpio = limpiarNombre(nombre);
    const datos = leerTodo();
    const u = datos.usuarios.find((x) => x.activo);
    exigir(u, "No hay nadie usando la app.");
    u.nombre = limpio;
    guardarTodo(datos, "usuario");
    return u;
}
