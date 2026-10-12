// Novedades: qué cambió en cada versión (la lista está en js/novedades.js).
import { NOVEDADES, marcarNovedadesVistas } from "../novedades.js?v=db209204dc";
import { VERSION } from "../config.js?v=db209204dc";
import { esc } from "../ui.js?v=db209204dc";

export function vistaNovedades(cont) {
    marcarNovedadesVistas();
    cont.innerHTML = `
        <h1>Novedades</h1>
        <p class="ayuda">Estás usando la versión ${esc(VERSION)}. Si algo no aparece, recargá la página (en el celu puede tardar unos minutos).</p>
        ${NOVEDADES.map((n) => `
        <section class="tarjeta novedad ${n.version === VERSION ? "novedad--actual" : ""}">
            <h2>Versión ${esc(n.version)} <span class="ayuda">· ${esc(n.fecha)}${n.version === VERSION ? " · la que tenés" : ""}</span></h2>
            <ul>${n.cambios.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
        </section>`).join("")}
        <p><a href="#contale">💬 Contale a Esteban qué te parecen los cambios</a></p>`;
}
