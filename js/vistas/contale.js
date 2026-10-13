// "Contale a Esteban": un comentario libre que le llega a Esteban (no gasta IA; hasta 20 por día).
import * as ia from "../ia.js?v=dc7e5675b5";
import { TOPES } from "../config.js?v=dc7e5675b5";
import { aviso } from "../ui.js?v=dc7e5675b5";

export function vistaContale(cont) {
    const conectada = ia.conectada();
    cont.innerHTML = `
        <h1>Contale a Esteban</h1>
        <p>Qué te gustó, qué te trabó, qué le falta, qué harías distinto. Todo sirve: OTIUM está en prueba.</p>
        ${conectada ? `
        <form class="tarjeta formulario" data-contale>
            <label>Tu comentario
                <textarea name="texto" rows="6" maxlength="${TOPES.comentario}" required></textarea>
            </label>
            <p class="ayuda">Le llega con tu nombre. No escribas datos privados. No gasta tu cupo de IA.</p>
            <button class="boton" type="submit">Mandar</button>
        </form>` : `<p class="ayuda">Para mandarle comentarios hace falta el token (Ajustes). Si no lo tenés, contale por WhatsApp.</p>`}`;

    cont.addEventListener("submit", async (e) => {
        e.preventDefault();
        const form = e.target;
        const boton = form.querySelector("[type=submit]");
        boton.disabled = true;
        boton.textContent = "Mandando…";
        try {
            await ia.pedirComentario({ tipo: "comentario", texto: form.elements.texto.value });
            aviso("¡Gracias! Le llegó a Esteban.");
            form.elements.texto.value = "";
        } catch (err) {
            aviso(err.message, "error");
        }
        boton.disabled = false;
        boton.textContent = "Mandar";
    });
}
