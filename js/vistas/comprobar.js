// ============================================
// "Comprobá que lo sabés", dentro de la ficha (Estudio):
//   - Preguntas: escribís tu respuesta y la IA la corrige (bien / más o menos / mal, con una pista si falta algo).
//     Si la mayoría sale bien, el concepto pasa a aprendido y sus preguntas entran al repaso espaciado.
//   - Contalo (active recall): se tapa la ficha, la explicás con tus palabras y la IA te dice qué estuvo bien,
//     qué faltó (con una pista) y si confundiste algo.
//   - Feynman: se tapa la ficha y se lo explicás a un chico de 7 años (o a una abuela de 80). La IA hace de ese
//     personaje y pregunta cuando algo no se entiende (hasta 3 veces); al final sale del personaje y te dice qué
//     entendiste de verdad y cuál es el hueco.
// Lo que respondés queda en memoria mientras la página esté abierta (no se guarda: es práctica).
// ============================================
import * as d from "../datos.js?v=b86f2e9674";
import * as ia from "../ia.js?v=b86f2e9674";
import { COSTOS_IA, TOPES, PERSONAJES } from "../config.js?v=b86f2e9674";
import { esc, aviso } from "../ui.js?v=b86f2e9674";

const VEREDICTOS = { bien: "✅ Bien", masomenos: "🟡 Más o menos", mal: "🔴 Todavía no" };

// conceptoId → { respuestas: { [i]: { texto, resultado } }, contalo: { abierto, texto, resultado } }
const memoria = new Map();
const de = (id) => {
    if (!memoria.has(id)) {
        memoria.set(id, {
            respuestas: {},
            contalo: { abierto: false, texto: "", resultado: null },
            feynman: { abierto: false, personaje: "chico", turnos: [], cierre: null, borrador: "" },
        });
    }
    return memoria.get(id);
};

/** ¿Está tapada la ficha porque estás haciendo "contalo" o "feynman"? */
export const contaloAbierto = (id) => de(id).contalo.abierto || de(id).feynman.abierto;

// ---------- Lo que se ve ----------

export function seccionComprobar(x) {
    const f = x.ficha;
    const m = de(x.id);
    const conIA = ia.conectada();
    return `
        <section class="comprobar">
            <h3>Comprobá que lo sabés</h3>
            ${conIA
                ? `<div class="acciones">
                       <button class="boton boton--chico" data-contalo="abrir">🗣️ Contalo con tus palabras</button>
                       <button class="boton boton--chico" data-feynman="abrir">🧒 Feynman: explicáselo a un chico</button>
                       <span class="ayuda">tapan la ficha · usan ${COSTOS_IA.contalo} por vuelta</span>
                   </div>`
                : `<p class="ayuda">Con la IA conectada (Ajustes) te corrige las respuestas y podés hacer "Contalo".</p>`}
            ${m.contalo.resultado ? tarjetaContalo(x, m.contalo.resultado) : ""}
            ${m.feynman.cierre ? tarjetaFeynman(x, m.feynman) : ""}
            <ol class="ficha__preguntas">${f.preguntas.map((p, i) => pregunta(p, i, m.respuestas[i], conIA)).join("")}</ol>
        </section>`;
}

function pregunta(p, i, r, conIA) {
    const esperada = `<details><summary>Ver la respuesta esperada</summary><p>${esc(p.respuesta)}</p></details>`;
    if (r?.resultado) {
        const v = r.resultado;
        return `
            <li class="pregunta pregunta--${esc(v.veredicto)}">${esc(p.pregunta)}
                <p class="pregunta__tuya"><strong>Tu respuesta:</strong> ${esc(r.texto)}</p>
                <p class="veredicto veredicto--${esc(v.veredicto)}">${VEREDICTOS[v.veredicto]}</p>
                <p>${esc(v.comentario)}</p>
                ${v.pista ? `<p class="pista"><strong>Pista:</strong> ${esc(v.pista)}</p>` : ""}
                ${esperada}
                <button class="boton boton--chico" data-reintentar="${i}">Responder de nuevo</button>
            </li>`;
    }
    return `
        <li class="pregunta">${esc(p.pregunta)}
            ${conIA ? `
            <form class="pregunta__form" data-responder="${i}">
                <label class="visualmente-oculto" for="resp-${i}">Tu respuesta</label>
                <textarea id="resp-${i}" name="respuesta" rows="2" maxlength="${TOPES.respuestaUsuario}" placeholder="Respondé sin mirar la ficha…" required>${esc(r?.texto ?? "")}</textarea>
                <button class="boton boton--chico" type="submit">Corregir (usa ${COSTOS_IA.corregir})</button>
            </form>` : ""}
            ${esperada}
        </li>`;
}

/** La ficha tapada: solo el título y el lugar para explicarla (contalo o feynman). */
export function panelContalo(x) {
    const m = de(x.id);
    if (m.feynman.abierto) return panelFeynman(x, m.feynman);
    return `
        <article class="ficha ficha--contalo">
            <h2>🗣️ Contalo: ${esc(x.titulo)}</h2>
            <p>La ficha está tapada. Explicá con tus palabras lo que entendiste: qué es, de dónde viene y algún ejemplo.
               No importa que sea perfecto: el esfuerzo de recordar es lo que fija.</p>
            <form class="formulario" data-contalo-form>
                <label class="visualmente-oculto" for="explicacion">Tu explicación</label>
                <textarea id="explicacion" name="explicacion" rows="8" maxlength="${TOPES.explicacion}" required>${esc(m.contalo.texto)}</textarea>
                <div class="acciones">
                    <button class="boton" type="submit">Ver cómo me fue (usa ${COSTOS_IA.contalo})</button>
                    <button class="boton boton--chico" type="button" data-contalo="cerrar">Volver a la ficha</button>
                </div>
            </form>
        </article>`;
}

function tarjetaContalo(x, r) {
    return `
        <div class="contalo-resultado contalo-resultado--${esc(r.veredicto)}">
            <p class="veredicto veredicto--${esc(r.veredicto)}">Contalo: ${VEREDICTOS[r.veredicto]}</p>
            ${r.bien ? `<p><strong>Lo que entendiste bien:</strong> ${esc(r.bien)}</p>` : ""}
            ${r.falta ? `<p class="pista"><strong>Te faltó (pista):</strong> ${esc(r.falta)}</p>` : ""}
            ${r.confusion ? `<p><strong>Ojo con esto:</strong> ${esc(r.confusion)}</p>` : ""}
            <div class="acciones">
                <button class="boton boton--chico" data-contalo="abrir">Contarlo de nuevo</button>
                ${r.veredicto === "bien" && x.estado !== "aprendido" ? `<button class="boton boton--chico" data-estado="aprendido">Marcar aprendido</button>` : ""}
            </div>
        </div>`;
}

// ---------- Feynman ----------

function panelFeynman(x, fy) {
    const quien = PERSONAJES[fy.personaje];
    const empezo = fy.turnos.length > 0;
    const preguntas = fy.turnos.filter((t) => t.quien === "personaje").length;
    return `
        <article class="ficha ficha--contalo ficha--feynman">
            <h2>🧒 Feynman: ${esc(x.titulo)}</h2>
            ${empezo ? "" : `
            <p>Explicáselo a ${esc(quien)}, sin palabras difíciles. Si usás una palabra técnica o saltás un paso, te va a
               preguntar. Si podés explicarlo simple, lo entendiste de verdad.</p>
            <div class="opciones-personaje" role="group" aria-label="A quién se lo explicás">
                ${Object.entries(PERSONAJES).map(([clave, nombre]) =>
                    `<button class="boton boton--chico" data-personaje="${esc(clave)}" ${clave === fy.personaje ? 'aria-pressed="true"' : 'aria-pressed="false"'}>${clave === "chico" ? "🧒" : "👵"} ${esc(nombre)}</button>`).join("")}
            </div>`}
            ${empezo ? `<ol class="charla-feynman">${fy.turnos.map((t) => `
                <li class="mensaje mensaje--${t.quien === "vos" ? "vos" : "app"}"><p>${esc(t.texto)}</p>
                    <span class="mensaje__meta">${t.quien === "vos" ? "Vos" : esc(quien)}</span></li>`).join("")}
            </ol>` : ""}
            <form class="formulario" data-feynman-form>
                <label class="visualmente-oculto" for="feynman-texto">Tu explicación</label>
                <textarea id="feynman-texto" name="texto" rows="${empezo ? 3 : 7}" maxlength="${TOPES.explicacion}" required placeholder="${empezo ? "Contestale…" : "Explicalo como para que lo entienda…"}">${esc(fy.borrador)}</textarea>
                <div class="acciones">
                    <button class="boton" type="submit">${empezo ? "Contestar" : "Explicárselo"} (usa ${COSTOS_IA.feynman})</button>
                    ${empezo ? `<button class="boton boton--chico" type="button" data-feynman="terminar">Terminar y ver cómo me fue (usa ${COSTOS_IA.feynman})</button>` : ""}
                    <button class="boton boton--chico" type="button" data-feynman="cerrar">Volver a la ficha</button>
                </div>
                ${empezo ? `<p class="ayuda">Preguntas: ${preguntas} de ${TOPES.preguntasFeynman}. Después te dice cómo te fue.</p>` : ""}
            </form>
        </article>`;
}

function tarjetaFeynman(x, fy) {
    const c = fy.cierre;
    return `
        <div class="contalo-resultado ${c.hueco ? "" : "contalo-resultado--bien"}">
            <p class="veredicto ${c.hueco ? "" : "veredicto--bien"}">Feynman (${esc(PERSONAJES[fy.personaje])}): ${c.hueco ? "🟡 Casi" : "✅ Se entendió"}</p>
            <p><em>${esc(c.texto)}</em></p>
            <p><strong>Lo que entendiste de verdad:</strong> ${esc(c.entendiste)}</p>
            ${c.hueco ? `<p class="pista"><strong>El hueco:</strong> ${esc(c.hueco)}</p>` : ""}
            <div class="acciones">
                <button class="boton boton--chico" data-feynman="abrir">Explicarlo de nuevo</button>
                ${!c.hueco && x.estado !== "aprendido" ? `<button class="boton boton--chico" data-estado="aprendido">Marcar aprendido</button>` : ""}
            </div>
        </div>`;
}

async function vueltaFeynman(x, fy, { terminar = false } = {}) {
    if (!ia.alcanza(COSTOS_IA.feynman)) return sinCupo();
    const f = x.ficha;
    const r = await ia.pedirFeynman({ concepto: x.titulo, idea: f.idea, definicion: f.definicion, personaje: fy.personaje, turnos: fy.turnos.slice(-TOPES.turnosFeynman), terminar });
    if (r.tipo === "pregunta") {
        fy.turnos.push({ quien: "personaje", texto: r.texto });
    } else {
        fy.cierre = r;
        fy.abierto = false;
    }
}

// ---------- Lo que pasa ----------

/** Atiende clics y envíos de esta sección. Devuelve true si el evento era suyo. */
export async function manejarComprobar(e, x, redibujar) {
    const m = de(x.id);
    const accionContalo = e.target.closest?.("[data-contalo]")?.dataset.contalo;
    if (e.type === "click" && accionContalo) {
        m.contalo.abierto = accionContalo === "abrir";
        if (m.contalo.abierto) m.contalo.resultado = null;
        redibujar();
        return true;
    }
    const accionFeynman = e.target.closest?.("[data-feynman]")?.dataset.feynman;
    if (e.type === "click" && accionFeynman) {
        const fy = m.feynman;
        if (accionFeynman === "abrir") Object.assign(fy, { abierto: true, turnos: [], cierre: null, borrador: "" });
        if (accionFeynman === "cerrar") fy.abierto = false;
        if (accionFeynman === "terminar") {
            ocupado(e.target.closest("form"), "Pensando cómo te fue…");
            try {
                await vueltaFeynman(x, fy, { terminar: true });
            } catch (err) {
                aviso(err.message, "error");
            }
        }
        redibujar();
        return true;
    }
    const personaje = e.target.closest?.("[data-personaje]")?.dataset.personaje;
    if (e.type === "click" && personaje) {
        m.feynman.personaje = personaje;
        redibujar();
        return true;
    }
    const reintentar = e.target.closest?.("[data-reintentar]")?.dataset.reintentar;
    if (e.type === "click" && reintentar !== undefined) {
        m.respuestas[reintentar] = { texto: m.respuestas[reintentar]?.texto ?? "", resultado: null };
        redibujar();
        return true;
    }
    if (e.type !== "submit") return false;
    const form = e.target;

    if (form.matches("[data-contalo-form]")) {
        e.preventDefault();
        const explicacion = form.elements.explicacion.value;
        m.contalo.texto = explicacion;
        if (!ia.alcanza(COSTOS_IA.contalo)) return sinCupo(), true;
        ocupado(form, "Leyendo tu explicación…");
        try {
            const f = x.ficha;
            m.contalo.resultado = await ia.pedirContalo({ concepto: x.titulo, idea: f.idea, definicion: f.definicion, errorComun: f.errorComun, explicacion });
            m.contalo.abierto = false;
        } catch (err) {
            aviso(err.message, "error");
        }
        redibujar();
        return true;
    }

    if (form.matches("[data-feynman-form]")) {
        e.preventDefault();
        const fy = m.feynman;
        const texto = form.elements.texto.value.trim();
        if (!texto) return true;
        fy.turnos.push({ quien: "vos", texto });
        fy.borrador = "";
        ocupado(form, "Pensando…");
        try {
            await vueltaFeynman(x, fy);
        } catch (err) {
            fy.turnos.pop();
            fy.borrador = texto;
            aviso(err.message, "error");
        }
        redibujar();
        return true;
    }

    if (form.matches("[data-responder]")) {
        e.preventDefault();
        const i = Number(form.dataset.responder);
        const p = x.ficha.preguntas[i];
        const texto = form.elements.respuesta.value;
        m.respuestas[i] = { texto, resultado: null };
        if (!ia.alcanza(COSTOS_IA.corregir)) return sinCupo(), true;
        ocupado(form, "Corrigiendo…");
        try {
            m.respuestas[i].resultado = await ia.pedirCorreccion({ concepto: x.titulo, pregunta: p.pregunta, esperada: p.respuesta, respuesta: texto });
            revisarSiLoSabe(x, m);
        } catch (err) {
            aviso(err.message, "error");
        }
        redibujar();
        return true;
    }
    return false;
}

/** Si la mayoría de las preguntas salió bien, el concepto pasa a aprendido (y sus preguntas, al repaso). */
function revisarSiLoSabe(x, m) {
    const total = x.ficha.preguntas.length;
    const bien = Object.values(m.respuestas).filter((r) => r.resultado?.veredicto === "bien").length;
    if (bien * 2 <= total || d.leerConcepto(x.id).estado === "aprendido") return;
    d.cambiarEstado(x.id, "aprendido");
    try {
        d.agregarMensaje(x.mapa, { quien: "app", texto: `Respondiste bien ${bien} de ${total} preguntas de "${x.titulo}": lo marco como aprendido. Sus preguntas van a volver en el repaso, en días cada vez más espaciados.`, concepto: x.id });
    } catch (e) {
        d.anotarError(`Chat: ${e.message}`);
    }
    aviso("¡Lo sabés! Quedó como aprendido y entra al repaso.");
}

function ocupado(form, texto) {
    form.querySelectorAll("button, textarea").forEach((el) => (el.disabled = true));
    const b = form.querySelector("[type=submit]");
    if (b) b.textContent = texto;
}

function sinCupo() {
    aviso("No alcanza el cupo de IA de hoy. El repaso sigue funcionando; mañana se renueva.", "error");
}
