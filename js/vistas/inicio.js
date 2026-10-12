// Pantalla de inicio: repasos de hoy, la racha de la semana, seguir donde quedaste, "aprender algo nuevo" y tus mapas.
import * as d from "../datos.js?v=d337193a0e";
import { MODOS, TOPES, FUNCIONES } from "../config.js?v=d337193a0e";
import { esc, vacio, intentar, aviso } from "../ui.js?v=d337193a0e";
import * as ia from "../ia.js?v=d337193a0e";
import { armarRamas } from "../acciones-ia.js?v=d337193a0e";
import { resumenCupo } from "../recomendacion.js?v=d337193a0e";
import { guiaVista } from "./guia.js?v=d337193a0e";
import { cuandoFue, fechaLocalISO } from "../fechas.js?v=d337193a0e";
import { textoRacha } from "./repaso.js?v=d337193a0e";

const aEstudio = (id) => `#estudio?m=${encodeURIComponent(id)}`;

export function vistaInicio(cont, { usuario }) {
    const mapas = d.listarMapas();
    const ultimo = mapas[0];
    const { pendientes } = d.resumenRepaso();
    const racha = d.rachaSemanal();
    const modos = Object.entries(MODOS).filter(([clave]) => clave !== "libre" || FUNCIONES.modoLibre);
    cont.innerHTML = `
        <h1>Hola${usuario.nombre ? `, ${esc(usuario.nombre)}` : ""}</h1>
        ${guiaVista() ? "" : `<p class="aviso-guia">¿Primera vez? <a href="#guia">Mirá la guía de 2 minutos</a> para sacarle el jugo.</p>`}
        <div class="tarjeta hoy">
            <p class="hoy__repasos">${pendientes
                ? `Repasos de hoy: <strong>${pendientes}</strong> <a class="boton" href="#repaso">Repasar</a>`
                : "No hay repasos pendientes hoy."}</p>
            <p class="racha-linea">${esc(textoRacha(racha))}</p>
        </div>
        ${tarjetaIA()}
        ${ultimo ? `<p><a class="boton" href="${esc(aEstudio(ultimo.id))}">Seguir con "${esc(ultimo.tema)}"</a></p>` : ""}

        <h2>Aprender algo nuevo</h2>
        <form class="tarjeta formulario" data-nuevo>
            <label>¿Qué querés aprender?
                <input name="tema" maxlength="${TOPES.tema}" placeholder="Por ejemplo: bases de la psicología" required>
            </label>
            <fieldset class="opciones">
                <legend>¿Cómo?</legend>
                ${modos.map(([clave, nombre], i) => `
                    <label class="opcion"><input type="radio" name="modo" value="${esc(clave)}" ${i === 0 ? "checked" : ""}>
                        <span><strong>${esc(nombre)}</strong> · ${clave === "guiado" ? "la app te arma el árbol y vas eligiendo ramas" : "charlás y los conceptos se cuelgan solos del mapa"}</span>
                    </label>`).join("")}
            </fieldset>
            <button class="boton" type="submit">Empezar</button>
        </form>

        <h2>Tus mapas</h2>
        ${mapas.length
            ? `<ul class="lista">${mapas.map((m) => `
                <li>
                    <a class="tarjeta mapa-tarjeta" href="${esc(aEstudio(m.id))}">
                        <strong>${esc(m.tema)}</strong>
                        <span class="mapa-tarjeta__meta">${esc(MODOS[m.modo])} · ${m.avance.aprendidos} de ${m.avance.total} conceptos aprendidos · ${esc(cuandoFue(m.usado))}</span>
                        <progress class="progreso" max="${Math.max(m.avance.total, 1)}" value="${m.avance.aprendidos}" aria-hidden="true"></progress>
                    </a>
                </li>`).join("")}</ul>`
            : vacio("Primeros pasos", "Todavía no hay mapas. Escribí arriba qué querés aprender.")}
        <p class="pie-inicio"><a href="#guia">Guía de 2 minutos</a> · <a href="#contale">💬 Contale a Esteban</a></p>`;

    // El cupo de hoy se pregunta siempre al entrar a Inicio (no gasta nada): así el porcentaje está al día
    if (ia.conectada()) {
        ia.pedirCupo().then(() => { const lugar = cont.querySelector("[data-tarjeta-ia]"); if (lugar) lugar.outerHTML = tarjetaIA(); }).catch(() => {});
    }

    cont.addEventListener("submit", async (e) => {
        e.preventDefault();
        const form = e.target;
        const creado = intentar(() => d.crearMapa({ tema: form.elements.tema.value, modo: form.elements.modo.value }), "Mapa creado");
        if (!creado) return;
        // En modo guiado, si la IA está conectada, arranca armando el primer nivel del árbol
        if (creado.mapa.modo === "guiado" && ia.conectada()) {
            const boton = form.querySelector("[type=submit]");
            boton.disabled = true;
            boton.textContent = "Armando el árbol…";
            try {
                await armarRamas(creado.raiz.id);
            } catch (err) {
                aviso(`${err.message} Podés pedir las ramas desde Estudio.`, "error");
            }
        }
        location.hash = aEstudio(creado.mapa.id);
    });
}

/** "Tu IA de hoy": plan, porcentaje y recomendación (o cómo conectarla). */
function tarjetaIA() {
    if (!ia.conectada()) return `<p class="ayuda" data-tarjeta-ia>La IA no está conectada en este navegador: cargá el token en <a href="#ajustes">Ajustes</a>.</p>`;
    const c = ia.ultimoCupo();
    if (!c || c.dia !== fechaLocalISO()) return `<div class="tarjeta" data-tarjeta-ia><p class="ayuda">Tu IA de hoy: consultando…</p></div>`;
    const r = resumenCupo(c);
    return `
        <div class="tarjeta tu-ia" data-tarjeta-ia>
            <p class="tu-ia__titulo"><strong>Tu IA de hoy</strong>${r.plan ? ` · plan ${esc(r.plan)}` : ""} · ${r.usado} de ${r.total} (${r.pct} %)</p>
            <progress class="progreso" max="${r.total || 1}" value="${r.usado}" aria-hidden="true"></progress>
            <p class="ayuda">${esc(r.texto)}</p>
        </div>`;
}
