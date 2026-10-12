// ============================================
// Privacidad y términos: qué se guarda, dónde, cuánto tiempo, cómo se borra, qué va a Google (Gemini, plan gratis) y
// las reglas de uso. Se puede leer antes de la bienvenida. Si cambia algo de fondo, se avisa en Novedades.
// Hechos chequeados el 12/10/2026: servidor (servidor/src/index.js: cupo 3 días, comentarios 180 días, no guarda los
// pedidos a la IA) y condiciones de Google para el plan gratis (vigentes desde el 23/03/2026).
// ============================================
import { NOMBRE_APP } from "../config.js?v=ceaa36c8f6";
import { esc } from "../ui.js?v=ceaa36c8f6";

const ACTUALIZADA = "12/10/2026";
const CONDICIONES_GOOGLE = "https://ai.google.dev/gemini-api/terms";
const AAIP = "https://www.argentina.gob.ar/aaip";

const afuera = (url, texto) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(texto)} ↗</a>`;

export function vistaPrivacidad(cont) {
    cont.className = "privacidad";
    cont.innerHTML = `
        <h1>Privacidad y términos</h1>
        <p class="ayuda">${esc(NOMBRE_APP)} es un proyecto personal de Esteban, en prueba y gratis. Última actualización: ${ACTUALIZADA}.</p>

        <div class="tarjeta privacidad__corto">
            <h2>Lo importante, en corto</h2>
            <ul>
                <li>Lo que armás y escribís (mapas, fichas, escritos, notas, neuronas, libros) queda <strong>solo en tu navegador</strong>. Nadie más lo ve, ni Esteban.</li>
                <li><strong>Lo que le pedís a la IA va a Google</strong> (Gemini, en su plan gratis). Google lo usa para mejorar sus productos y <strong>lo pueden leer personas que trabajan para Google</strong>.</li>
                <li>Por eso: <strong>no le mandes a la IA datos personales, de salud, de trabajo, contraseñas ni nada privado</strong>, tuyo o de otros.</li>
                <li>No hay publicidad, ni cookies de seguimiento, ni estadísticas de lo que hacés.</li>
            </ul>
        </div>

        <h2>Qué se guarda y dónde</h2>
        <div class="tarjeta">
            <h3>En tu navegador</h3>
            <p>Tus mapas, fichas, repasos, escritos, notas, neuronas y resaltados; los libros que subís; tu nombre; tus
               ajustes; y el token que conecta la app con la IA. Queda ahí hasta que lo borres. No sale de tu navegador,
               salvo lo que mandes a la IA (abajo) o la copia que bajes vos.</p>

            <h3>En el servidor de ${esc(NOMBRE_APP)} (Cloudflare)</h3>
            <ul>
                <li>Cuánta IA se usó cada día con tu acceso, para el cupo. Se borra solo a los 3 días.</li>
                <li>Los comentarios que mandás con "Contale a Esteban" o "Esto está mal": el texto, el tema y la ficha donde
                    estabas, y el nombre de tu acceso. Los lee Esteban para mejorar la app. Se borran solos a los 180 días.</li>
                <li>Lo que le pedís a la IA pasa por el servidor, pero <strong>no se guarda ahí</strong>: se manda a Google y vuelve.</li>
            </ul>

            <h3>En Google (Gemini, plan gratis)</h3>
            <p>Cada vez que usás la IA se manda lo necesario para ese pedido, y Google recibe también la respuesta:</p>
            <ul>
                <li>el tema y las ramas del mapa (para armar ramas y fichas);</li>
                <li>tus respuestas y explicaciones al comprobar (corregir, Contalo, Feynman);</li>
                <li>lo que seleccionás para que te lo explique, con su párrafo;</li>
                <li>el texto de un capítulo cuando pedís su ficha (recortado);</li>
                <li>lo que mandás a reescribir.</li>
            </ul>
            <p>Según las condiciones de Google para el plan gratis, usa lo que recibe para mejorar sus productos, lo pueden
               leer y anotar revisores humanos (Google dice que antes lo separa de la cuenta) y pide no mandar nada
               sensible, confidencial ni personal. No dice cuánto tiempo lo guarda. Los pedidos salen con la clave de
               ${esc(NOMBRE_APP)}, no con tu cuenta de Google. ${afuera(CONDICIONES_GOOGLE, "Condiciones de Google")}</p>

            <h3>Otros servicios</h3>
            <ul>
                <li>Wikipedia: para chequear una ficha, el servidor busca el nombre del concepto.</li>
                <li>Wikcionario: la palabra que buscás en el diccionario va directo desde tu navegador.</li>
                <li>GitHub Pages (donde está publicada la app) y Cloudflare ven tu dirección de internet (IP) al conectarte,
                    como pasa con cualquier página.</li>
            </ul>
        </div>

        <h2>Para qué se usa</h2>
        <p>Solo para que la app funcione, para controlar el cupo de IA de cada día y para leer tus comentarios y mejorarla.
           No se vende ni se comparte con nadie más.</p>

        <h2>Cómo borrarlo</h2>
        <ul>
            <li><strong>Lo de tu navegador:</strong> en <a href="#acerca">Acerca de</a>, "Borrar todo y volver al ejemplo"
                (mapas, fichas, escritos, neuronas y libros); en <a href="#ajustes">Ajustes</a>, "Desconectar" (el token).
                O borrá los datos de este sitio desde la configuración del navegador: se va todo de una. Si lo querés
                guardar, antes bajá una copia en Ajustes → Tus datos.</li>
            <li><strong>Tus comentarios en el servidor:</strong> pedíselo a Esteban con <a href="#contale">Contale a Esteban</a> y los borra.</li>
            <li><strong>Lo que ya se mandó a Google</strong> no se puede borrar desde ${esc(NOMBRE_APP)}.</li>
        </ul>

        <h2>Tus derechos</h2>
        <p>Por la Ley 25.326 de Protección de Datos Personales podés pedir ver, corregir o borrar tus datos personales.
           Pedilo con <a href="#contale">Contale a Esteban</a>. La Agencia de Acceso a la Información Pública, órgano de
           control de esa ley, atiende las denuncias y reclamos por incumplimientos. ${afuera(AAIP, "AAIP")}</p>

        <h2>Términos de uso</h2>
        <ul>
            <li><strong>Es una versión de prueba y gratis.</strong> Puede cambiar, fallar o dejar de estar disponible, y los
                accesos se pueden dar de baja. Bajá copias de tus datos seguido.</li>
            <li><strong>Para mayores de 18</strong> (lo exige Google para usar su IA).</li>
            <li><strong>La IA se equivoca.</strong> Lo que dice es para estudiar: no es consejo profesional (médico,
                psicológico, legal ni financiero) ni reemplaza a un profesional. No da diagnósticos ni tratamientos
                personales. Verificá lo importante; cada ficha marca cuán segura está y tiene "Esto está mal".</li>
            <li><strong>Libros:</strong> subí solo libros de dominio público o tuyos sin DRM. Cada uno es responsable de lo
                que sube. Los libros quedan en tu navegador y no se comparten con nadie.</li>
            <li><strong>Tu acceso</strong> (el link o el token) es para quien Esteban se lo dio: no lo pases sin preguntarle.
                El cupo de IA es limitado y compartido: usalo con medida.</li>
            <li>No uses la app para nada ilegal ni para dañar a otras personas.</li>
            <li>Se ofrece tal como está, sin garantías. Si estas condiciones cambian, se avisa en <a href="#novedades">Novedades</a>.</li>
        </ul>
        <p><a href="#inicio">Volver a Inicio</a></p>`;
}
