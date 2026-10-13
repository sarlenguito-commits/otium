// ============================================
// "Notas personales", dentro de la ficha (Estudio):
//   - De tu lectura: lo que resaltaste en el libro que va a esta ficha (la de su capítulo o la que elegiste al leer),
//     con tu nota, la explicación de la IA (si la pediste) y el link al lugar exacto del texto.
//   - Tu desarrollo: notas sueltas, numeradas, para armar el capítulo (o el tema) paso a paso con tus palabras.
// Todo se renombra, se edita y se quita; las del desarrollo también se reordenan (↑ ↓).
// ============================================
import * as d from "../datos.js?v=dc7e5675b5";
import { TOPES } from "../config.js?v=dc7e5675b5";
import { esc, aviso } from "../ui.js?v=dc7e5675b5";

// Qué notas tienen el formulario de edición abierto ("r:<id>" o "n:<id>"), mientras la página esté abierta
const editando = new Set();

const dirLeer = (r) => (r.escrito
    ? `#escribir?e=${encodeURIComponent(r.escrito)}&modo=marcar&p=${r.parrafo}`
    : `#leer?m=${encodeURIComponent(r.mapa)}&c=${encodeURIComponent(r.concepto)}&p=${r.parrafo}`);
const recorte = (t, n = 50) => (t.length > n ? `${t.slice(0, n).trimEnd()}…` : t);

export function seccionNotas(x, porId) {
    const { resaltados, sueltas } = d.notasDe(x.id);
    return `
        <section class="notas" aria-label="Notas personales">
            <h3>📝 Notas personales</h3>
            ${resaltados.length ? `
            <h4>De lo que leíste y escribiste</h4>
            <ul class="notas__lista">${resaltados.map((r) => notaResaltado(r, x, porId)).join("")}</ul>` : ""}
            <h4>Tu desarrollo</h4>
            ${sueltas.length
                ? `<ol class="notas__lista notas__lista--pasos">${sueltas.map((n, i) => notaSuelta(n, i, sueltas.length)).join("")}</ol>`
                : `<p class="ayuda">Armá ${Number.isInteger(x.capitulo) ? "el capítulo" : "el tema"} paso a paso con tus palabras: una idea por nota, en el orden en que la contarías.</p>`}
            <form class="formulario notas__nueva" data-nota-nueva>
                <input name="titulo" maxlength="${TOPES.tituloNota}" placeholder="Título del paso (opcional)" aria-label="Título del paso">
                <textarea name="texto" rows="2" maxlength="${TOPES.nota}" placeholder="Con tus palabras…" aria-label="Texto del paso"></textarea>
                <button class="boton boton--chico" type="submit">Sumar paso</button>
            </form>
        </section>`;
}

function notaResaltado(r, x, porId) {
    const otroCapitulo = r.escrito ? "tu escrito" : r.concepto !== x.id ? porId.get(r.concepto)?.titulo : "";
    if (editando.has(`r:${r.id}`)) {
        return `
            <li class="nota">
                <form class="formulario" data-resaltado-form="${esc(r.id)}">
                    <p class="nota__cita"><span class="resaltado resaltado--${esc(r.color)}">${esc(r.texto)}</span></p>
                    <label>Título <input name="titulo" maxlength="${TOPES.tituloNota}" value="${esc(r.titulo)}" placeholder="${esc(recorte(r.texto))}"></label>
                    <label>Tu nota <textarea name="nota" rows="3" maxlength="${TOPES.nota}">${esc(r.nota)}</textarea></label>
                    <div class="acciones">
                        <button class="boton boton--chico" type="submit">Guardar</button>
                        <button class="boton boton--chico" type="button" data-nota-cancelar="r:${esc(r.id)}">Cancelar</button>
                    </div>
                </form>
            </li>`;
    }
    return `
        <li class="nota">
            <strong class="nota__titulo">${esc(r.titulo || recorte(r.texto))}</strong>
            ${r.titulo ? `<p class="nota__cita"><span class="resaltado resaltado--${esc(r.color)}">${esc(r.texto)}</span></p>` : ""}
            ${r.explicacion ? `<p class="nota__explicacion">💡 ${esc(r.explicacion)}</p>` : ""}
            ${r.nota ? `<p class="nota__texto">${esc(r.nota)}</p>` : ""}
            <div class="nota__acciones">
                <a href="${esc(dirLeer(r))}">📖 Ver en el texto${otroCapitulo ? ` (${esc(otroCapitulo)})` : ""}</a>
                <button class="boton boton--chico" data-nota-editar="r:${esc(r.id)}">Editar</button>
            </div>
        </li>`;
}

function notaSuelta(n, i, total) {
    if (editando.has(`n:${n.id}`)) {
        return `
            <li class="nota">
                <form class="formulario" data-suelta-form="${esc(n.id)}">
                    <label>Título <input name="titulo" maxlength="${TOPES.tituloNota}" value="${esc(n.titulo)}"></label>
                    <label>Texto <textarea name="texto" rows="4" maxlength="${TOPES.nota}">${esc(n.texto)}</textarea></label>
                    <div class="acciones">
                        <button class="boton boton--chico" type="submit">Guardar</button>
                        <button class="boton boton--chico" type="button" data-nota-cancelar="n:${esc(n.id)}">Cancelar</button>
                        <button class="boton boton--chico boton--quitar" type="button" data-nota-quitar="${esc(n.id)}">Quitar</button>
                    </div>
                </form>
            </li>`;
    }
    return `
        <li class="nota">
            ${n.titulo ? `<strong class="nota__titulo">${esc(n.titulo)}</strong>` : ""}
            ${n.texto ? `<p class="nota__texto">${esc(n.texto)}</p>` : ""}
            <div class="nota__acciones">
                ${i > 0 ? `<button class="boton boton--chico" data-nota-mover="${esc(n.id)}" data-paso="-1" aria-label="Subir este paso">↑</button>` : ""}
                ${i < total - 1 ? `<button class="boton boton--chico" data-nota-mover="${esc(n.id)}" data-paso="1" aria-label="Bajar este paso">↓</button>` : ""}
                <button class="boton boton--chico" data-nota-editar="n:${esc(n.id)}">Editar</button>
            </div>
        </li>`;
}

/** Clics y envíos de la sección. Devuelve true si eran de acá. */
export function manejarNotas(e, x, redibujar) {
    const t = e.target;
    try {
        if (e.type === "submit") {
            if (t.matches("[data-nota-nueva]")) {
                d.crearNota(x.id, { titulo: t.elements.titulo.value, texto: t.elements.texto.value });
                aviso("Paso sumado");
            } else if (t.matches("[data-suelta-form]")) {
                d.editarNota(t.dataset.sueltaForm, { titulo: t.elements.titulo.value, texto: t.elements.texto.value });
                editando.delete(`n:${t.dataset.sueltaForm}`);
                aviso("Nota guardada");
            } else if (t.matches("[data-resaltado-form]")) {
                d.editarResaltado(t.dataset.resaltadoForm, { titulo: t.elements.titulo.value, nota: t.elements.nota.value });
                editando.delete(`r:${t.dataset.resaltadoForm}`);
                aviso("Nota guardada");
            } else return false;
            redibujar();
            return true;
        }
        const abrir = t.closest?.("[data-nota-editar]")?.dataset.notaEditar;
        const cerrar = t.closest?.("[data-nota-cancelar]")?.dataset.notaCancelar;
        const mover = t.closest?.("[data-nota-mover]");
        const quitar = t.closest?.("[data-nota-quitar]")?.dataset.notaQuitar;
        if (abrir) editando.add(abrir);
        else if (cerrar) editando.delete(cerrar);
        else if (mover) d.moverNota(mover.dataset.notaMover, Number(mover.dataset.paso));
        else if (quitar) {
            if (!confirm("¿Quitar esta nota? No se puede deshacer.")) return true;
            d.quitarNota(quitar);
            editando.delete(`n:${quitar}`);
            aviso("Nota quitada");
        } else return false;
        redibujar();
        return true;
    } catch (err) {
        aviso(err.message, "error");
        return true;
    }
}
