// ============================================
// Novedades: lo que cambió en cada versión publicada, en palabras para quien usa la app (no técnicas).
// REGLA: cada vez que se publica, se suma la versión nueva ARRIBA de todo (la misma de VERSION en config.js).
// El detalle técnico va en CAMBIOS.md.
// ============================================
import { VERSION, PREFIJO } from "./config.js?v=4ff97d5a37";

export const NOVEDADES = [
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
