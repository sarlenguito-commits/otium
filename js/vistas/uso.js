// ============================================
// "(!) Uso": cuánta IA queda hoy (tuya, de todos y de Google), para cuánto alcanza, cuánto gasta cada cosa y de dónde
// salen los límites (medidos el 12/10/2026 en AI Studio y en el servidor). Para que quien usa OTIUM vaya viendo.
// Los números del día vienen del servidor (/cupo); los "para cuánto alcanza" son estimados (ESTIMADOS).
// ============================================
import * as ia from "../ia.js?v=3f84cb5f35";
import { COSTOS_IA, COSTO_REESCRIBIR, PREFIJO } from "../config.js?v=3f84cb5f35";
import { esc, aviso } from "../ui.js?v=3f84cb5f35";
import { fechaLocalISO } from "../fechas.js?v=3f84cb5f35";
import { calcularUso, ESTIMADOS } from "../recomendacion.js?v=3f84cb5f35";

const QUE_ES = {
    ramas: "Armar las ramas de un tema o de una rama",
    ficha: "Una ficha nueva (más 1 si revisa el escalón de abajo)",
    previos: "Revisar el escalón de abajo",
    charla: "Un mensaje de charla",
    corregir: "Corregir una respuesta",
    contalo: "Contalo",
    feynman: "Cada vuelta de Feynman",
    explicar: "Explicar algo que leíste",
    reescribir: `Reescribir (${COSTO_REESCRIBIR.parrafo} un pedazo o un párrafo, ${COSTO_REESCRIBIR.todo} el texto entero)`,
};

// Inicio muestra el aviso "(!) Uso" hasta que la persona abre esta pantalla una vez (en este navegador)
const CLAVE_VISTO = `${PREFIJO}-uso-visto`;
export function usoVisto() {
    try {
        return localStorage.getItem(CLAVE_VISTO) === "1";
    } catch {
        return true;
    }
}
function marcarVisto() {
    try {
        localStorage.setItem(CLAVE_VISTO, "1");
    } catch {
        // sin guardado: el aviso vuelve a aparecer
    }
}

const pct = (usado, total) => (total ? Math.min(100, Math.round((usado / total) * 100)) : 0);
const barra = (usado, total) => `<progress class="progreso" max="${Math.max(total, 1)}" value="${Math.min(usado, total)}" aria-hidden="true"></progress>`;
const num = (n) => (Number.isFinite(n) ? n.toLocaleString("es-AR") : "—");

export function vistaUso(cont, { redibujar }) {
    cont.className = "uso";
    if (!ia.conectada()) {
        cont.innerHTML = `<h1>(!) Uso de la IA</h1>
            <p>La IA no está conectada en este navegador. Abrí el link que te pasó Esteban o cargá el token en <a href="#ajustes">Ajustes</a>.</p>`;
        return;
    }
    marcarVisto();
    const c = ia.ultimoCupo();
    const deHoy = c && c.dia === fechaLocalISO();
    const g = c?.general;
    const u = calcularUso(c);
    cont.innerHTML = `
        <h1>(!) Uso de la IA</h1>
        <p class="ayuda">Todo es gratis para vos. La IA tiene topes por día porque OTIUM usa el plan gratis de Google. Se renueva a la medianoche (hora de Argentina).</p>

        <div class="tarjeta" data-hoy>
            <h2>Hoy</h2>
            ${!deHoy ? `<p class="ayuda">Consultando al servidor…</p>` : `
            <p><strong>Tu IA</strong>${c.plan?.nombre ? ` (plan ${esc(c.plan.nombre)})` : ""}: ${num(c.usado)} de ${num(c.total)} unidades (${pct(c.usado, c.total)} %)</p>
            ${barra(c.usado, c.total)}
            ${g && g.usado !== null ? `
            <p><strong>Entre todos</strong>: ${num(g.usado)} de ${num(g.total)} unidades (${pct(g.usado, g.total)} %)</p>
            ${barra(g.usado, g.total)}
            <p><strong>Pedidos a Google</strong>: ${num(g.pedidosGoogle)} de ${num(g.limiteGoogle)} (el 70 % de los ${num(g.pedidosGoogleDia)} por día de su plan gratis)</p>
            ${barra(g.pedidosGoogle, g.limiteGoogle)}` : ""}
            <p class="uso__alcanza">Con lo que queda hoy te alcanza para unas <strong>${num(u.fichas)} fichas nuevas</strong>, o <strong>${num(u.mensajes)} mensajes de charla</strong>, o <strong>${num(u.intensas)} ${u.intensas === 1 ? "sesión intensa" : "sesiones intensas"}</strong> (${num(u.tranqui)} tranquis).</p>
            <p class="ayuda">Lo de "entre todos" y lo de Google es compartido: si otros la usan, a vos te queda menos.</p>`}
            <button class="boton boton--chico" type="button" data-actualizar>Actualizar</button>
        </div>

        <h2>Cuánto gasta cada cosa</h2>
        <div class="tarjeta">
            <ul class="uso__costos">
                ${Object.entries(QUE_ES).map(([k, t]) => `<li>${esc(t)}: <strong>${k === "reescribir" ? `${COSTO_REESCRIBIR.parrafo} o ${COSTO_REESCRIBIR.todo}` : COSTOS_IA[k]}</strong></li>`).join("")}
            </ul>
            <p class="ayuda">El repaso, Leer, Escribir, las notas, Cerebro y el diccionario no usan IA: andan siempre.</p>
        </div>

        <h2>¿Cuánto se puede aprender en un día?</h2>
        <div class="tarjeta">
            <ul>
                ${["tranqui", "intensa", "tema", "libro"].map((k) => {
                    const e = ESTIMADOS[k];
                    const nombre = { tranqui: "Una sesión tranqui", intensa: "Una sesión intensa", tema: "Un tema", libro: "Un libro" }[k];
                    return `<li><strong>${nombre}</strong> (${esc(e.que)}): unas ${e.unidades} unidades.</li>`;
                }).join("")}
            </ul>
            <p>Con los topes de hoy (${num(g?.total ?? 400)} unidades y ${num(g?.limiteGoogle ?? 350)} pedidos a Google por día, entre todos) entran unas
               <strong>${Math.min(Math.floor((g?.total ?? 400) / ESTIMADOS.intensa.unidades), Math.floor((g?.limiteGoogle ?? 350) / ESTIMADOS.intensa.pedidos))} sesiones intensas</strong>
               o <strong>${Math.min(Math.floor((g?.total ?? 400) / ESTIMADOS.tranqui.unidades), Math.floor((g?.limiteGoogle ?? 350) / ESTIMADOS.tranqui.pedidos))} tranquis</strong> por día.</p>
            <p class="ayuda">Son estimados: dependen de cuánto charles y de cuántas fichas abras. Un consejo: aprender más no es abrir más fichas, sino comprobar las que ya abriste (preguntas, Contalo, Feynman).</p>
        </div>

        <h2>De dónde salen los límites</h2>
        <div class="tarjeta">
            <ul>
                <li><strong>Google</strong> (plan gratis de Gemini 3.5 Flash-Lite): hasta ${num(g?.porMinutoGoogle ?? 15)} pedidos por minuto y ${num(g?.pedidosGoogleDia ?? 500)} por día. OTIUM usa como mucho el 70 % por día, para tener margen.</li>
                <li><strong>Por minuto</strong>: si varios piden a la vez, puede aparecer "la IA gratis llegó a su límite por ahora". Esperá un minuto y listo.</li>
                <li><strong>El tope de unidades</strong> (${num(g?.total ?? 400)} por día) sale del servidor gratis de Cloudflare, que puede guardar hasta 1000 cosas por día.</li>
                <li><strong>Lo medido</strong> (12/10): el día de más uso hubo 92 pedidos a Google y el minuto más cargado, 11. Un pedido promedio "pesa" unos 1800 tokens de entrada y 580 de salida.</li>
                <li><strong>Si fuera pago</strong>: unas 2 décimas de centavo de dólar por pedido. Para vos es gratis.</li>
            </ul>
        </div>
        <p><a href="#inicio">Volver a Inicio</a></p>`;

    // Siempre se pregunta al entrar (no gasta nada): así los números están al día
    const actualizar = async (avisar) => {
        try {
            await ia.pedirCupo();
            if (document.body.contains(cont)) redibujar();
            else if (avisar) aviso("Actualizado");
        } catch (err) {
            if (avisar) aviso(err.message, "error");
        }
    };
    cont.querySelector("[data-actualizar]")?.addEventListener("click", () => actualizar(true));
    // Una vez por entrada (si el servidor no trajera lo general, no se queda preguntando en círculo)
    if (Date.now() - ultimaConsulta > 10_000) {
        ultimaConsulta = Date.now();
        actualizar(false);
    }
}

let ultimaConsulta = 0;
