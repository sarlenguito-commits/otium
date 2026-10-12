// ============================================
// Novedades: lo que cambió en cada versión publicada, en palabras para quien usa la app (no técnicas).
// REGLA: cada vez que se publica, se suma la versión nueva ARRIBA de todo (la misma de VERSION en config.js).
// El detalle técnico va en CAMBIOS.md.
// ============================================
import { VERSION, PREFIJO } from "./config.js?v=91f4100bf5";

export const NOVEDADES = [
    {
        version: "0.5.0",
        fecha: "12/10/2026",
        cambios: [
            "Notas personales en cada ficha de Estudio: ahí aparece lo que resaltaste y anotaste al leer, con su explicación y un link al lugar exacto del texto.",
            "Al tocar un resaltado en Leer le ponés un título y elegís a qué ficha va (la del capítulo, otra o la del libro entero), con un link directo.",
            "\"Tu desarrollo\": sumá pasos con tus palabras para armar el capítulo o el tema paso a paso. Se renombran, se editan, se reordenan con ↑ ↓ y se quitan.",
        ],
    },
    {
        version: "0.4.0",
        fecha: "12/10/2026",
        cambios: [
            "Leer tiene su pestaña abajo: tus libros, con \"Seguir leyendo\" donde quedaste.",
            "Al leer, seleccioná una palabra u oración: diccionario (Wikcionario, gratis), resaltar en azul, rojo o verde, \"Explicar\" (la IA lo dice con otras palabras, usa 1) y notas.",
            "Tocando un resaltado ves su explicación (si la pediste) y tu nota, y le podés cambiar el color o quitarlo.",
            "En Inicio, \"Tus mapas\" se separa en Aprender algo nuevo, Estudiar un libro y Todos, con un buscador por título o palabra clave.",
            "Ajustes ahora es la ruedita ⚙ de arriba.",
        ],
    },
    {
        version: "0.3.1",
        fecha: "11/10/2026",
        cambios: [
            "Esta pantalla de Novedades: acá vas a ver qué cambia en cada versión. Cuando haya algo nuevo, Inicio te avisa.",
        ],
    },
    {
        version: "0.3.0",
        fecha: "11/10/2026",
        cambios: [
            "Estudiar un libro: subís un EPUB (sin DRM) y cada capítulo pasa a ser una rama del mapa.",
            "Leer cada capítulo dentro de la app y buscar palabras en todo el libro (sin importar tildes).",
            "La ficha de un capítulo se arma con el texto de ese capítulo, con su escalón de abajo y preguntas.",
        ],
    },
    {
        version: "0.2.0",
        fecha: "11/10/2026",
        cambios: [
            "Primera versión para probadores: bienvenida, guía de 2 minutos y tu cupo de IA del día con una recomendación de uso.",
            "\"Esto está mal\" en cada ficha (avisa y puede rehacerla) y \"Contale a Esteban\" para comentarios.",
            "Nuevo diseño en tonos cálidos.",
        ],
    },
];

const CLAVE = `${PREFIJO}-novedades-vistas`;

/** ¿Hay una versión nueva que esta persona todavía no vio? (la primera vez no avisa: viene la bienvenida) */
export function hayNovedades() {
    try {
        const vista = localStorage.getItem(CLAVE);
        if (vista === null) {
            localStorage.setItem(CLAVE, VERSION);
            return false;
        }
        return vista !== VERSION;
    } catch {
        return false;
    }
}

export function marcarNovedadesVistas() {
    try {
        localStorage.setItem(CLAVE, VERSION);
    } catch {
        // sin guardado: el aviso puede volver a aparecer
    }
}
