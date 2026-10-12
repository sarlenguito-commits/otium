// Pantalla de inicio: repasos de hoy, la racha de la semana, seguir donde quedaste, "aprender algo nuevo" y tus mapas.
import * as d from "../datos.js?v=f718b9a529";
import { MODOS, TOPES, FUNCIONES, PREFIJO } from "../config.js?v=f718b9a529";
import { esc, vacio, intentar, aviso } from "../ui.js?v=f718b9a529";
import * as ia from "../ia.js?v=f718b9a529";
import { armarRamas } from "../acciones-ia.js?v=f718b9a529";
import { resumenCupo } from "../recomendacion.js?v=f718b9a529";
import { guiaVista } from "./guia.js?v=f718b9a529";
import { leerEpub } from "../epub.js?v=f718b9a529";
import { hayNovedades } from "../novedades.js?v=f718b9a529";
import { VERSION } from "../config.js?v=f718b9a529";
import { cuandoFue, fechaLocalISO } from "../fechas.js?v=f718b9a529";
import { textoRacha } from "./repaso.js?v=f718b9a529";

const aEstudio = (id) => `#estudio?m=${encodeURIComponent(id)}`;

// "Tus mapas": qué categoría se ve (se recuerda en este navegador)
const FILTROS = { tema: "🧭 Aprender algo nuevo", libro: "📖 Estudiar un libro", todos: "Todos" };
const CLAVE_FILTRO = `${PREFIJO}-filtro-mapas`;
const tipoDe = (m) => (m.modo === "libro" ? "libro" : "tema");
/** Para buscar sin que importen mayúsculas ni tildes. */
export const normalizar = (t) => String(t ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

function filtroGuardado() {
    try {
        const f = localStorage.getItem(CLAVE_FILTRO);
        return Object.hasOwn(FILTROS, f ?? "") ? f : "todos";
    } catch {
        return "todos";
    }
}

/** Qué mapas se ven: los de la categoría que tengan todas las palabras buscadas en el título o en sus conceptos.
 *  Devuelve [{ id, coincide }] (coincide: el concepto donde se encontró, si no fue en el título). */
export function filtrarMapas(mapas, { filtro = "todos", consulta = "" } = {}) {
    const palabras = normalizar(consulta).split(/\s+/).filter(Boolean);
    return mapas
        .filter((m) => filtro === "todos" || tipoDe(m) === filtro)
        .map((m) => {
            if (!palabras.length) return { id: m.id, coincide: "" };
            const titulo = normalizar(m.tema);
            const conceptos = (m.titulos ?? []).map((t) => [t, normalizar(t)]);
            const todo = `${titulo} ${conceptos.map(([, n]) => n).join(" ")}`;
            if (!palabras.every((p) => todo.includes(p))) return null;
            if (palabras.every((p) => titulo.includes(p))) return { id: m.id, coincide: "" };
            const donde = conceptos.find(([, n]) => palabras.some((p) => n.includes(p) && !titulo.includes(p)));
            return { id: m.id, coincide: donde?.[0] ?? "" };
        })
        .filter(Boolean);
}

export function vistaInicio(cont, { usuario }) {
    const mapas = d.listarMapas({ conTitulos: true });
    const ultimo = mapas[0];
    const { pendientes } = d.resumenRepaso();
    const racha = d.rachaSemanal();
    const modos = Object.entries(MODOS).filter(([clave]) => clave === "guiado" || (clave === "libre" && FUNCIONES.modoLibre));
    cont.innerHTML = `
        <h1>Hola${usuario.nombre ? `, ${esc(usuario.nombre)}` : ""}</h1>
        ${guiaVista() ? "" : `<p class="aviso-guia">¿Primera vez? <a href="#guia">Mirá la guía de 2 minutos</a> para sacarle el jugo.</p>`}
        ${hayNovedades() ? `<p class="aviso-guia">✨ Hay novedades en OTIUM (versión ${esc(VERSION)}). <a href="#novedades">Mirá qué cambió</a>.</p>` : ""}
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

        <h2>Estudiar un libro (EPUB)</h2>
        <form class="tarjeta formulario" data-libro>
            <label>Elegí el archivo .epub
                <input name="archivo" type="file" accept=".epub,application/epub+zip" required>
            </label>
            <p class="ayuda">Cada capítulo pasa a ser una rama del mapa: lo leés acá, buscás palabras adentro y pedís la ficha
               de cada capítulo. El libro queda solo en este navegador; a la IA va solo el capítulo que pidas, recortado.
               ¿Sin libro a mano? Hay miles de dominio público en <a href="https://www.gutenberg.org/browse/languages/es" target="_blank" rel="noopener noreferrer">Project Gutenberg ↗</a>.</p>
            <label class="interruptor">
                <input type="checkbox" name="acepto" required>
                <span>Es un libro de dominio público o mío sin DRM, y entiendo que el texto del capítulo que pida se manda a Google Gemini (plan gratis).</span>
            </label>
            <button class="boton" type="submit">Subir el libro</button>
        </form>

        <h2>Tus mapas</h2>
        ${mapas.length ? `
            <div class="filtro-mapas">
                <div class="filtro-mapas__botones" role="group" aria-label="Qué mapas ver">
                    ${Object.entries(FILTROS).map(([clave, nombre]) => {
                        const cuantos = clave === "todos" ? mapas.length : mapas.filter((m) => tipoDe(m) === clave).length;
                        return `<button class="boton boton--chico" data-filtro="${clave}" aria-pressed="false">${esc(nombre)} (${cuantos})</button>`;
                    }).join("")}
                </div>
                <input type="search" data-buscar-mapa maxlength="60" placeholder="Buscar por título o palabra clave" aria-label="Buscar un mapa por título o palabra clave">
            </div>` : ""}
        ${mapas.length
            ? `<ul class="lista" data-lista-mapas>${mapas.map((m) => `
                <li data-mapa="${esc(m.id)}">
                    <a class="tarjeta mapa-tarjeta" href="${esc(aEstudio(m.id))}">
                        <strong>${esc(m.tema)}</strong>
                        <span class="mapa-tarjeta__meta">${esc(MODOS[m.modo])} · ${m.avance.aprendidos} de ${m.avance.total} conceptos aprendidos · ${esc(cuandoFue(m.usado))}</span>
                        <span class="mapa-tarjeta__coincide" data-coincide hidden></span>
                        <progress class="progreso" max="${Math.max(m.avance.total, 1)}" value="${m.avance.aprendidos}" aria-hidden="true"></progress>
                    </a>
                </li>`).join("")}</ul>
               <p class="ayuda" data-sin-mapas hidden></p>`
            : vacio("Primeros pasos", "Todavía no hay mapas. Escribí arriba qué querés aprender.")}
        <p class="pie-inicio"><a href="#guia">Guía de 2 minutos</a> · <a href="#novedades">Novedades</a> · <a href="#contale">💬 Contale a Esteban</a> · versión ${esc(VERSION)}</p>`;

    // "Tus mapas": categoría + buscador (se filtra en el momento, sin volver a dibujar la pantalla)
    let filtro = filtroGuardado();
    const buscarMapa = cont.querySelector("[data-buscar-mapa]");
    function aplicarFiltro() {
        if (!buscarMapa) return;
        const consulta = buscarMapa.value;
        const visibles = new Map(filtrarMapas(mapas, { filtro, consulta }).map((v) => [v.id, v.coincide]));
        cont.querySelectorAll("[data-filtro]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filtro === filtro)));
        cont.querySelectorAll("[data-mapa]").forEach((li) => {
            li.hidden = !visibles.has(li.dataset.mapa);
            const coincide = li.querySelector("[data-coincide]");
            const donde = visibles.get(li.dataset.mapa);
            coincide.hidden = !donde;
            coincide.textContent = donde ? `Tiene "${donde}"` : "";
        });
        const sinMapas = cont.querySelector("[data-sin-mapas]");
        sinMapas.hidden = visibles.size > 0;
        sinMapas.textContent = consulta.trim()
            ? `Ningún mapa de esta lista tiene "${consulta.trim()}".`
            : filtro === "libro" ? "Todavía no subiste libros." : "Todavía no hay mapas de temas.";
    }
    aplicarFiltro();
    buscarMapa?.addEventListener("input", aplicarFiltro);
    cont.addEventListener("click", (e) => {
        const elegido = e.target.closest("[data-filtro]")?.dataset.filtro;
        if (!elegido) return;
        filtro = elegido;
        try {
            localStorage.setItem(CLAVE_FILTRO, filtro);
        } catch {
            // sin guardado: la próxima vez arranca en "Todos"
        }
        aplicarFiltro();
    });

    // El cupo de hoy se pregunta siempre al entrar a Inicio (no gasta nada): así el porcentaje está al día
    if (ia.conectada()) {
        ia.pedirCupo().then(() => { const lugar = cont.querySelector("[data-tarjeta-ia]"); if (lugar) lugar.outerHTML = tarjetaIA(); }).catch(() => {});
    }

    cont.addEventListener("submit", async (e) => {
        e.preventDefault();
        const form = e.target;
        if (form.matches("[data-libro]")) {
            const archivo = form.elements.archivo.files?.[0];
            if (!archivo) return;
            const boton = form.querySelector("[type=submit]");
            boton.disabled = true;
            boton.textContent = "Leyendo el libro…";
            try {
                const libro = await leerEpub(await archivo.arrayBuffer());
                const { mapa } = d.crearMapaLibro(libro);
                aviso(`Listo: "${libro.titulo}", ${libro.capitulos.length} capítulos.`);
                location.hash = aEstudio(mapa.id);
            } catch (err) {
                aviso(err.message, "error");
                boton.disabled = false;
                boton.textContent = "Subir el libro";
            }
            return;
        }
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
