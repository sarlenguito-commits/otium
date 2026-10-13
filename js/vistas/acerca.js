// Acerca de: nombre, versión, modo, volver a los datos de ejemplo y los errores que se anotaron solos.
import * as d from "../datos.js?v=dc7e5675b5";
import { NOMBRE_APP, VERSION } from "../config.js?v=dc7e5675b5";
import { puedeReiniciar } from "../permisos.js?v=dc7e5675b5";
import { esc, aviso } from "../ui.js?v=dc7e5675b5";
import { textoFechaHora } from "../fechas.js?v=dc7e5675b5";

export function vistaAcerca(cont, { usuario, redibujar }) {
    const errores = d.leerErrores();
    cont.innerHTML = `
        <h1>Acerca de</h1>
        <div class="tarjeta">
            <p><strong>${esc(NOMBRE_APP)}</strong> · versión ${esc(VERSION)}</p>
            <p>Tus mapas, fichas y repasos quedan solo en este navegador. <a href="#privacidad">Privacidad y términos</a>.</p>
            ${d.modo === "local" && puedeReiniciar(usuario) ? `<button class="boton boton--peligro" data-reiniciar>Borrar todo y volver al ejemplo</button>` : ""}
        </div>
        <div class="tarjeta">
            <h2>Errores anotados</h2>
            ${errores.length ? `
                <ul class="errores">${errores.map((e) => `<li>${esc(textoFechaHora(e.cuando))} · ${esc(e.donde || "#inicio")} · ${esc(e.mensaje)}</li>`).join("")}</ul>
                <button class="boton boton--chico" data-limpiar>Limpiar la lista</button>`
            : "<p>Ninguno. Si algo se rompe, queda anotado acá solo.</p>"}
        </div>`;

    cont.addEventListener("click", (e) => {
        if (e.target.closest("[data-reiniciar]")) {
            if (!confirm("Se borran todos tus mapas, fichas, repasos, escritos, neuronas y libros de este navegador y vuelve el ejemplo. Si los querés guardar, cancelá y bajá una copia en Ajustes. ¿Seguro?")) return;
            d.reiniciarDatos(); // app.js redibuja con los datos de ejemplo
            aviso("Listo: volvió el ejemplo");
        } else if (e.target.closest("[data-limpiar]")) {
            d.borrarErrores();
            redibujar();
        }
    });
}
