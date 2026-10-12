// Bienvenida: la primera vez que alguien abre OTIUM. Qué es, cómo se usa, qué pasa con lo que escribe (privacidad)
// y dónde pega el token que le pasó Esteban. Hasta que no la complete, la app vuelve acá.
import * as d from "../datos.js?v=7ecc487c43";
import * as ia from "../ia.js?v=7ecc487c43";
import { NOMBRE_APP, PREFIJO, TOPES } from "../config.js?v=7ecc487c43";
import { esc, aviso, intentar } from "../ui.js?v=7ecc487c43";

const CLAVE = `${PREFIJO}-bienvenida`;

/** ¿Ya pasó por la bienvenida en este navegador? */
export function bienvenidaVista() {
    try {
        return localStorage.getItem(CLAVE) === "1";
    } catch {
        return true; // sin guardado no se puede recordar: mejor no trabar la app
    }
}

function marcarVista() {
    try {
        localStorage.setItem(CLAVE, "1");
    } catch {
        // sin guardado: se muestra de nuevo la próxima vez
    }
}

export function vistaBienvenida(cont, { usuario }) {
    const conectada = ia.conectada();
    cont.innerHTML = `
        <section class="bienvenida">
            <h1>Bienvenida a ${esc(NOMBRE_APP)}</h1>
            <p class="bienvenida__lema">Aprender cualquier tema de a escalones, con fichas cortas, preguntas y repasos que vuelven solos.</p>

            <div class="tarjeta">
                <h2>Cómo se usa</h2>
                <ol>
                    <li>Escribís qué querés aprender y la IA arma un árbol de ramas.</li>
                    <li>Abrís la rama que quieras y la IA arma su ficha: idea, definición, de dónde viene, autores, un error común y analogías. Si da por sabido algo que no sabés, te ofrece un escalón de abajo 🪜.</li>
                    <li>Comprobás que lo sabés: respondés preguntas sin mirar, lo contás con tus palabras o se lo explicás a un chico de 7 años.</li>
                    <li>Lo aprendido vuelve en el repaso a los 1, 3, 7, 14, 30 y 60 días. El repaso no usa IA: anda siempre.</li>
                </ol>
            </div>

            <div class="tarjeta privacidad__corto">
                <h2>Tu privacidad</h2>
                <ul>
                    <li>Lo que armás y escribís (mapas, fichas, escritos, notas, libros) queda <strong>solo en este navegador</strong>.</li>
                    <li><strong>Lo que le pedís a la IA va a Google</strong> (Gemini, plan gratis): el tema, lo que escribís en la
                        charla, tus respuestas y explicaciones, lo que seleccionás para que te explique, el texto de un capítulo o lo que mandás a reescribir.
                        Google lo usa para mejorar sus productos y <strong>lo pueden leer personas que trabajan para Google</strong>.</li>
                    <li><strong>No le mandes a la IA datos personales, de salud, de trabajo, contraseñas ni nada privado</strong>, tuyo o de otros.</li>
                    <li>La IA se puede equivocar: cada ficha marca cuán segura está y tiene "Esto está mal" para avisar.</li>
                    <li>Es para mayores de 18.</li>
                </ul>
                <p><a href="#privacidad">Leé la privacidad y los términos completos</a> (qué se guarda, dónde, por cuánto tiempo y cómo borrarlo).</p>
            </div>

            <form class="tarjeta formulario" data-bienvenida>
                <label>¿Cómo te llamás?
                    <input name="nombre" maxlength="${TOPES.nombre}" value="${esc(usuario.nombre)}" autocomplete="given-name" required>
                </label>
                ${conectada ? `<p class="ayuda">La IA ya está conectada en este navegador.</p>` : `
                <label>Token que te pasó Esteban
                    <input name="token" type="password" autocomplete="off" spellcheck="false" placeholder="Pegalo acá">
                </label>
                <p class="ayuda">Sin token la app anda igual (mapas, fichas guardadas y repaso), pero la IA no arma nada. Lo podés cargar después en Ajustes.</p>`}
                <label class="interruptor">
                    <input type="checkbox" name="acepto" required>
                    <span>Soy mayor de 18, acepto los términos y entiendo que lo que le mando a la IA lo puede leer gente de Google.</span>
                </label>
                <button class="boton" type="submit">Empezar</button>
            </form>
        </section>`;

    cont.addEventListener("submit", async (e) => {
        e.preventDefault();
        const f = e.target.elements;
        if (!intentar(() => d.cambiarNombre(f.nombre.value))) return;
        const token = f.token?.value.trim();
        if (token) {
            if (!intentar(() => ia.guardarConexion({ token }))) return;
            try {
                const c = await ia.pedirCupo();
                aviso(`IA conectada: plan ${c.plan?.nombre ?? ""}, ${c.total} por día.`);
            } catch (err) {
                aviso(`${err.message} Revisalo en Ajustes.`, "error");
            }
        }
        marcarVista();
        location.hash = "#guia";
    });
}
