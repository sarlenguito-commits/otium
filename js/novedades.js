// ============================================
// Novedades: lo que cambió en cada versión publicada, en palabras para quien usa la app (no técnicas).
// REGLA: cada vez que se publica, se suma la versión nueva ARRIBA de todo (la misma de VERSION en config.js).
// El detalle técnico va en CAMBIOS.md.
// ============================================
import { VERSION, PREFIJO } from "./config.js?v=43661a5cb5";

export const NOVEDADES = [
    {
        version: "0.8.0",
        fecha: "12/10/2026",
        cambios: [
            "Pestaña nueva: Cerebro 🧠. Creá neuronas (una idea con título, descripción y texto propio) y vinculalas a un Mapa, una Ficha o una Rama, de ida y de vuelta.",
            "El texto de una neurona se resalta igual que en Leer o Escribir, con diccionario, explicar con IA y notas.",
            "Nivel de abarcamiento (1 muy general a 5 muy específico) para cada neurona, y una tira de \"Abiertas\" con lo último que viste.",
            "Es el primer paso de Cerebro: todavía no está el grafo (eso viene en la fase 2).",
        ],
    },
    {
        version: "0.7.1",
        fecha: "12/10/2026",
        cambios: [
            "Si abrís OTIUM desde un link que ya trae el token, queda conectada sola: no hace falta pegarlo a mano en Bienvenida ni en Ajustes.",
        ],
    },
    {
        version: "0.7.0",
        fecha: "12/10/2026",
        cambios: [
            "Reescribir con IA, en Escribir: elegís lo que seleccionaste, el párrafo donde está el cursor o todo el texto, y cómo (\"formal, para mandar por mail\", \"como un poema\", lo que quieras).",
            "Tres pedidos rápidos de un toque: al principio los de base y después tus 3 más usados.",
            "Primero ves la propuesta y decidís: reemplazar, agregar abajo, copiar o descartar. Si reemplazás, podés deshacer.",
            "Cuesta 1 de tu IA del día (un pedazo o un párrafo) o 2 (el texto entero).",
        ],
    },
    {
        version: "0.6.0",
        fecha: "12/10/2026",
        cambios: [
            "Nueva pestaña Escribir: tu escritura libre, con la lista de tus escritos a la izquierda (en el celu, arriba y plegable).",
            "Cada escrito puede ser suelto o de un mapa, y se guarda solo mientras escribís.",
            "Modo Marcar: en tus escritos tenés lo mismo que al leer (diccionario, resaltar, Explicar y nota). Si el escrito es de un mapa, lo que resaltás puede ir a las Notas personales de una ficha.",
            "Si cambiás el texto, los resaltados se mueven con él; si borraste esa parte, quedan aparte con su nota (no se pierden).",
        ],
    },
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
