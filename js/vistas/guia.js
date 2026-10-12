// Guía de 2 minutos: cómo sacarle el jugo a OTIUM, para alguien que la abre por primera vez.
// Se basa en lo que está mejor probado para aprender: recordar sin mirar y repasar espaciado.
import { COSTOS_IA } from "../config.js?v=0c5d6339d6";
import { PREFIJO } from "../config.js?v=0c5d6339d6";

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
                <li><strong>Constancia antes que maratón:</strong> la meta es de días por semana (Ajustes). Un repaso de 5
                    minutos ya cuenta.</li>
                <li><strong>El temporizador</strong> (⏱ en Estudio) es opcional: 25 minutos de foco y 5 de descanso, o
                    modo flow si estás enganchado.</li>
                <li><strong>La IA se puede equivocar.</strong> Fijate las marcas "dudoso" y los links "para verificar".
                    Si algo está mal, tocá "⚠️ Esto está mal": le avisa a Esteban y podés rehacer la ficha.</li>
            </ul>
        </div>

        <div class="tarjeta guia">
            <h2>Tu IA de hoy</h2>
            <p>Hay un cupo por día que se renueva a la medianoche. Una ficha nueva usa ${ficha}; cada corrección,
               "Contalo" o vuelta de Feynman usa 1. Rinde más gastarlo en comprobar lo que ya abriste que en abrir
               fichas nuevas. Cuando se termina, el repaso sigue andando igual.</p>
        </div>

        <p><a class="boton" href="#inicio">Empezar</a> <a class="boton boton--chico" href="#contale">Contale a Esteban qué te pareció</a></p>`;
}
