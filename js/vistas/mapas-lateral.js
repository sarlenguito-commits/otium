// ============================================
// "Tus mapas", el lateral de Estudio: todos los mapas (sin los archivados), para cambiar de uno a otro sin pasar por
// Inicio, renombrarlos o archivarlos (nada se borra), y "+ Mapa nuevo" con las dos opciones de Inicio: un tema
// (arranca vacío; el árbol se pide desde Estudio) o un libro EPUB. Plegable: en la compu arranca abierto y en el
// celu cerrado; lo que la persona elija se recuerda en este navegador.
// Mismo patrón que notas-ficha.js: seccionMapas() dibuja y manejarMapas() atiende clics y envíos.
// ============================================
import * as d from "../datos.js?v=ceaa36c8f6";
import { MODOS, TOPES, FUNCIONES, PREFIJO } from "../config.js?v=ceaa36c8f6";
import { esc, aviso, intentar } from "../ui.js?v=ceaa36c8f6";
import { cuandoFue } from "../fechas.js?v=ceaa36c8f6";
import { leerEpub } from "../epub.js?v=ceaa36c8f6";

const CLAVE_PLEGADO = `${PREFIJO}-mapas-lado`;
// Qué formulario está abierto, mientras la página esté abierta: "renombrar:<id>", "archivar:<id>" o "nuevo"
const abiertos = new Set();

const aEstudio = (id) => `#estudio?m=${encodeURIComponent(id)}`;

function plegadoGuardado() {
    try {
        return localStorage.getItem(CLAVE_PLEGADO);
    } catch {
        return null;
    }
}

export function guardarPlegado(abierto) {
    try {
        localStorage.setItem(CLAVE_PLEGADO, abierto ? "abierto" : "cerrado");
    } catch {
        // sin guardado: la próxima vez arranca como siempre
    }
}

/** ¿Arranca abierto? Lo elegido antes; si no, abierto en la compu y cerrado en el celu. Con un formulario abierto, sí. */
export function arrancaAbierto() {
    if (abiertos.size) return true;
    const guardado = plegadoGuardado();
    if (guardado) return guardado === "abierto";
    return matchMedia("(min-width: 768px)").matches;
}

export function seccionMapas(mapaId) {
    const mapas = d.listarMapas();
    return `
        <aside class="estudio__mapas">
            <details class="mapas-lado" data-mapas-lado ${arrancaAbierto() ? "open" : ""}>
                <summary>Tus mapas (${mapas.length})</summary>
                ${abiertos.has("nuevo") ? formularioNuevo() : `<button class="boton boton--chico mapas-lado__nuevo" data-mapa-nuevo>+ Mapa nuevo</button>`}
                <ul class="mapas-lado__lista">${mapas.map((m) => fila(m, m.id === mapaId)).join("")}</ul>
            </details>
        </aside>`;
}

function fila(m, actual) {
    if (abiertos.has(`renombrar:${m.id}`)) {
        return `
            <li class="mapas-lado__item">
                <form class="formulario mapas-lado__form" data-renombrar-mapa="${esc(m.id)}">
                    <label>Nuevo nombre
                        <input name="tema" maxlength="${TOPES.tema}" value="${esc(m.tema)}" required>
                    </label>
                    <div class="acciones">
                        <button class="boton boton--chico" type="submit">Guardar</button>
                        <button class="boton boton--chico" type="button" data-mapa-cancelar="renombrar:${esc(m.id)}">Cancelar</button>
                    </div>
                </form>
            </li>`;
    }
    if (abiertos.has(`archivar:${m.id}`)) {
        return `
            <li class="mapas-lado__item">
                <form class="formulario mapas-lado__form" data-archivar-mapa="${esc(m.id)}">
                    <p class="ayuda">Archivar "${esc(m.tema)}": sale de la lista pero no se borra (queda guardado con sus fichas y repasos).</p>
                    <label>¿Por qué lo archivás?
                        <input name="motivo" maxlength="${TOPES.motivo}" placeholder="Por ejemplo: ya lo terminé" required>
                    </label>
                    <div class="acciones">
                        <button class="boton boton--chico boton--quitar" type="submit">Archivar</button>
                        <button class="boton boton--chico" type="button" data-mapa-cancelar="archivar:${esc(m.id)}">Cancelar</button>
                    </div>
                </form>
            </li>`;
    }
    return `
        <li class="mapas-lado__item ${actual ? "mapas-lado__item--actual" : ""}">
            <a class="mapas-lado__link" href="${esc(aEstudio(m.id))}" ${actual ? 'aria-current="page"' : ""}>
                <strong>${esc(m.tema)}</strong>
                <span class="ayuda">${esc(MODOS[m.modo])} · ${m.avance.aprendidos} de ${m.avance.total} · ${esc(cuandoFue(m.usado))}</span>
            </a>
            <span class="mapas-lado__botones">
                <button class="mapas-lado__icono" type="button" data-mapa-renombrar="${esc(m.id)}" aria-label="Cambiar el nombre de ${esc(m.tema)}" title="Cambiar el nombre">✏️</button>
                <button class="mapas-lado__icono" type="button" data-mapa-archivar="${esc(m.id)}" aria-label="Archivar ${esc(m.tema)}" title="Archivar (no se borra)">🗄️</button>
            </span>
        </li>`;
}

function formularioNuevo() {
    const modos = Object.entries(MODOS).filter(([clave]) => clave === "guiado" || (clave === "libre" && FUNCIONES.modoLibre));
    return `
        <div class="tarjeta mapas-lado__nuevo-panel">
            <p class="mapas-lado__titulo"><strong>Mapa nuevo</strong> <button class="boton boton--chico" type="button" data-mapa-cancelar="nuevo">Cancelar</button></p>
            <form class="formulario" data-nuevo-tema>
                <p><strong>🧭 Aprender algo nuevo</strong></p>
                <label>¿Qué querés aprender?
                    <input name="tema" maxlength="${TOPES.tema}" placeholder="Por ejemplo: bases de la psicología" required>
                </label>
                ${modos.length > 1 ? `
                <fieldset class="opciones">
                    <legend>¿Cómo?</legend>
                    ${modos.map(([clave, nombre], i) => `
                        <label class="opcion"><input type="radio" name="modo" value="${esc(clave)}" ${i === 0 ? "checked" : ""}><span>${esc(nombre)}</span></label>`).join("")}
                </fieldset>` : `<input type="hidden" name="modo" value="${esc(modos[0][0])}">`}
                <p class="ayuda">Arranca vacío: después pedís el árbol con "✨ Armar las ramas con IA" o agregás ramas a mano.</p>
                <button class="boton boton--chico" type="submit">Empezar</button>
            </form>
            <form class="formulario" data-nuevo-libro>
                <p><strong>📖 Estudiar un libro (EPUB)</strong></p>
                <label>Elegí el archivo .epub
                    <input name="archivo" type="file" accept=".epub,application/epub+zip" required>
                </label>
                <label class="interruptor">
                    <input type="checkbox" name="acepto" required>
                    <span>Es de dominio público o mío sin DRM, y el capítulo que pida se manda a Google Gemini (plan gratis).</span>
                </label>
                <button class="boton boton--chico" type="submit">Subir el libro</button>
            </form>
        </div>`;
}

/** Clics y envíos del lateral. Devuelve true si eran de acá. */
export async function manejarMapas(e, redibujar) {
    const t = e.target;
    if (e.type === "submit") {
        if (t.matches("[data-renombrar-mapa]")) {
            const id = t.dataset.renombrarMapa;
            if (intentar(() => d.renombrarMapa(id, t.elements.tema.value), "Nombre cambiado")) {
                abiertos.delete(`renombrar:${id}`);
                redibujar();
            }
            return true;
        }
        if (t.matches("[data-archivar-mapa]")) {
            const id = t.dataset.archivarMapa;
            if (intentar(() => d.archivarMapa(id, t.elements.motivo.value), "Mapa archivado")) {
                abiertos.delete(`archivar:${id}`);
                // Si era el mapa abierto, Estudio pasa al primero que quede
                const actual = new URLSearchParams(location.hash.split("?")[1] ?? "").get("m");
                if (actual === id) location.hash = "#estudio";
                else redibujar();
            }
            return true;
        }
        if (t.matches("[data-nuevo-tema]")) {
            const creado = intentar(() => d.crearMapa({ tema: t.elements.tema.value, modo: t.elements.modo.value }), "Mapa creado");
            if (creado) {
                abiertos.delete("nuevo");
                location.hash = aEstudio(creado.mapa.id);
            }
            return true;
        }
        if (t.matches("[data-nuevo-libro]")) {
            const archivo = t.elements.archivo.files?.[0];
            if (!archivo) return true;
            const boton = t.querySelector("[type=submit]");
            boton.disabled = true;
            boton.textContent = "Leyendo el libro…";
            try {
                const libro = await leerEpub(await archivo.arrayBuffer());
                const { mapa } = d.crearMapaLibro(libro);
                aviso(`Listo: "${libro.titulo}", ${libro.capitulos.length} capítulos.`);
                abiertos.delete("nuevo");
                location.hash = aEstudio(mapa.id);
            } catch (err) {
                aviso(err.message, "error");
                boton.disabled = false;
                boton.textContent = "Subir el libro";
            }
            return true;
        }
        return false;
    }
    const renombrar = t.closest?.("[data-mapa-renombrar]")?.dataset.mapaRenombrar;
    const archivar = t.closest?.("[data-mapa-archivar]")?.dataset.mapaArchivar;
    const cancelar = t.closest?.("[data-mapa-cancelar]")?.dataset.mapaCancelar;
    if (renombrar) abiertos.add(`renombrar:${renombrar}`);
    else if (archivar) abiertos.add(`archivar:${archivar}`);
    else if (cancelar) abiertos.delete(cancelar);
    else if (t.closest?.("[data-mapa-nuevo]")) abiertos.add("nuevo");
    else return false;
    redibujar();
    return true;
}
