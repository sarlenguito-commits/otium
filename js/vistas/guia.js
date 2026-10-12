// Guía de 2 minutos: cómo sacarle el jugo a OTIUM, para alguien que la abre por primera vez.
// Se basa en lo que está mejor probado para aprender: recordar sin mirar y repasar espaciado.
import { COSTOS_IA } from "../config.js?v=c366a4baa6";
import { PREFIJO } from "../config.js?v=c366a4baa6";

const CLAVE = `${PREFIJO}-guia`;

export function guiaVista() {
    try {
        return localStorage.getItem(CLAVE) === "1";
    } catch {
        return true;
    }
}

export function vistaGuia(cont) {
    try {
        localStorage.setItem(CLAVE, "1");
    } catch {
        // sin guardado: el aviso de la guía puede volver a aparecer
    }
    const ficha = COSTOS_IA.ficha + COSTOS_IA.previos;
    cont.innerHTML = `
        <h1>Guía de 2 minutos</h1>
        <p>Cómo sacarle el jugo a OTIUM. La regla de oro: <strong>recordar fija más que releer</strong>.</p>

        <div class="tarjeta guia">
            <h2>Tu rato de estudio (15 a 30 minutos)</h2>
            <ol>
                <li><strong>Primero, el repaso</strong> (pestaña Repaso). Son las preguntas de lo que ya aprendiste, que
                    vuelven solas en el momento justo. Intentá responder <em>antes</em> de mirar la respuesta.</li>
                <li><strong>Después, 1 o 2 fichas nuevas.</strong> En Estudio abrís la rama que te llame y tocás
                    "✨ Armar la ficha". Si dice "🪜 Antes de leer…", marcá "Ya lo sé" o pedí que te lo explique: ese
                    escalón de abajo es para que nada te quede colgado.</li>
                <li><strong>Leé la ficha una vez, con calma.</strong> Mirá el "Ojo, error común" y las analogías.</li>
                <li><strong>Comprobá sin mirar</strong> (abajo de la ficha): respondé las preguntas, o "🗣️ Contalo" con
                    tus palabras, o "🧒 Feynman" (explicáselo a un chico de 7 años). Si te sale, queda aprendido y entra
                    al repaso.</li>
            </ol>
        </div>

        <div class="tarjeta guia">
            <h2>Trucos que ayudan</h2>
            <ul>
                <li><strong>Equivocarse está bien:</strong> el esfuerzo de recordar es lo que hace que quede. Mejor
                    intentar y fallar que leer de nuevo.</li>
                <li><strong>Pocas ramas, bien aprendidas</strong> rinden más que muchas abiertas. No hace falta
                    completar el árbol: abrís lo que te interesa.</li>
                <li><strong>Constancia antes que maratón:</strong> la meta es de días por semana (Ajustes, la ruedita ⚙ de arriba). Un repaso de 5
                    minutos ya cuenta.</li>
                <li><strong>El temporizador</strong> (⏱ en Estudio) es opcional: 25 minutos de foco y 5 de descanso, o
                    modo flow si estás enganchado.</li>
                <li><strong>La IA se puede equivocar.</strong> Fijate las marcas "dudoso" y los links "para verificar".
                    Si algo está mal, tocá "⚠️ Esto está mal": le avisa a Esteban y podés rehacer la ficha.</li>
            </ul>
        </div>

        <div class="tarjeta guia">
            <h2>Estudiar un libro (EPUB)</h2>
            <p>En Inicio, "Estudiar un libro": subís un .epub sin DRM y cada capítulo pasa a ser una rama. Leés el
               capítulo acá mismo (📖), buscás palabras adentro del libro (🔎) y pedís la ficha del capítulo, que la IA arma
               con el texto de ese capítulo. Buena rutina: leer un capítulo, pedir su ficha y comprobar sin mirar.</p>
            <p>Mientras leés (pestaña Leer), seleccioná una palabra u oración: la buscás en el diccionario, la resaltás en
               azul, rojo o verde, pedís que te la expliquen con otras palabras (usa 1) o le dejás una nota. Tocando un
               resaltado ves su explicación y tu nota, le ponés un título y elegís a qué ficha va: en la ficha (Estudio)
               aparece en "Notas personales", junto a "Tu desarrollo", donde armás el capítulo paso a paso con tus palabras.</p>
            <p>En la pestaña Escribir escribís con tus palabras lo que vas aprendiendo (suelto o de un mapa). En "Marcar"
               tenés lo mismo que al leer: diccionario, resaltar, Explicar y notas. Con "✨ Reescribir con IA" pedís otra
               versión de un pedazo, un párrafo o todo (más claro, formal, como poema…): primero la ves y después decidís.
               Libros gratis y legales: <a href="https://www.gutenberg.org/browse/languages/es" target="_blank" rel="noopener noreferrer">Project Gutenberg ↗</a>.</p>
        </div>

        <div class="tarjeta guia">
            <h2>Tu IA de hoy</h2>
            <p>Hay un cupo por día que se renueva a la medianoche. Una ficha nueva usa ${ficha}; cada corrección,
               "Contalo" o vuelta de Feynman usa 1. Rinde más gastarlo en comprobar lo que ya abriste que en abrir
               fichas nuevas. Cuando se termina, el repaso sigue andando igual.</p>
        </div>

        <p><a class="boton" href="#inicio">Empezar</a> <a class="boton boton--chico" href="#contale">Contale a Esteban qué te pareció</a></p>`;
}
