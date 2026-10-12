// ============================================
// Temporizador opcional: bloques de foco y descanso (25/5, 50/10) o "modo flow" (sin cortes, avisa a los 90 min).
// Se ve arriba, en la cabecera, en todas las pantallas. Sigue aunque recargues (se guarda en el navegador).
// La cuenta está en temporizador-cuenta.js (sin pantalla) para poder probarla con horas fijas.
// No promete que se aprenda más: es una herramienta para no agotarse.
// ============================================
import { PREFIJO, TEMPORIZADORES } from "./config.js?v=c366a4baa6";
import { esc, aviso } from "./ui.js?v=c366a4baa6";
import * as d from "./datos.js?v=c366a4baa6";
import { empezar, calcular, paso, pausar, seguir, minutosAlCortar } from "./temporizador-cuenta.js?v=c366a4baa6";

const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

// ---------- En la pantalla ----------

const CLAVE = `${PREFIJO}-temporizador`;
let reloj = null;

function leer() {
    try {
        const e = JSON.parse(localStorage.getItem(CLAVE) ?? "null");
        const valido = e && Object.hasOwn(TEMPORIZADORES, e.preset) && ["foco", "descanso", "flow"].includes(e.fase) &&
            Number.isFinite(e.desde) && (e.pausadoEn === null || Number.isFinite(e.pausadoEn));
        return valido ? e : null;
    } catch {
        return null;
    }
}

function guardar(estado) {
    try {
        if (estado) localStorage.setItem(CLAVE, JSON.stringify(estado));
        else localStorage.removeItem(CLAVE);
    } catch {
        // sin guardado: el temporizador anda igual mientras la pestaña esté abierta
    }
}

function anotarSesion(minutos, tipo) {
    if (minutos < 1) return;
    try {
        d.registrarSesion({ minutos, tipo });
    } catch (e) {
        d.anotarError(e.message);
    }
}

/** Dibuja el temporizador en la cabecera (si está andando). Lo llama app.js y el reloj, cada segundo. */
export function dibujarTemporizador() {
    const lugar = document.querySelector("#temporizador");
    const estado = leer();
    if (!lugar) return;
    if (!estado) {
        lugar.innerHTML = "";
        return;
    }
    const { van, faltan } = calcular(estado, Date.now());
    const nombres = { foco: "Foco", descanso: "Descanso", flow: "Flow" };
    lugar.innerHTML = `
        <span class="temporizador temporizador--${esc(estado.fase)}">
            <span class="temporizador__fase">${esc(nombres[estado.fase])}${estado.pausadoEn ? " (en pausa)" : ""}</span>
            <span class="temporizador__tiempo" aria-live="off">${mmss(faltan ?? van)}</span>
            ${estado.fase === "descanso" ? `<a href="#repaso">repaso corto</a>` : ""}
            <button class="boton boton--chico" data-temporizador="${estado.pausadoEn ? "seguir" : "pausar"}">${estado.pausadoEn ? "Seguir" : "Pausa"}</button>
            <button class="boton boton--chico" data-temporizador="cortar">Cortar</button>
        </span>`;
}

function tic() {
    const estado = leer();
    if (!estado) {
        clearInterval(reloj);
        reloj = null;
        dibujarTemporizador();
        return;
    }
    const ahora = Date.now();
    const { estado: nuevo, eventos } = paso(estado, ahora);
    if (nuevo !== estado) guardar(nuevo);
    const p = TEMPORIZADORES[estado.preset];
    for (const e of eventos) {
        if (e === "fin-foco") {
            anotarSesion(p.foco, "foco");
            aviso(`¡Descanso! ${p.descanso} minutos. Si querés, un repaso corto.`);
        } else if (e === "fin-descanso") {
            aviso("Volvemos al foco.");
        } else if (e === "aviso-flow") {
            aviso(`Llevás ${p.aviso} minutos. Si seguís en flow, dale; si no, cortá un rato.`);
        }
    }
    dibujarTemporizador();
}

function arrancarReloj() {
    if (!reloj) reloj = setInterval(tic, 1000);
    tic();
}

export function empezarTemporizador(preset) {
    guardar(empezar(preset, Date.now()));
    arrancarReloj();
}

export const temporizadorAndando = () => !!leer();

document.addEventListener("click", (e) => {
    const accion = e.target.closest("[data-temporizador]")?.dataset.temporizador;
    if (!accion) return;
    const estado = leer();
    if (!estado) return;
    const ahora = Date.now();
    if (accion === "pausar") guardar(pausar(estado, ahora));
    if (accion === "seguir") guardar(seguir(estado, ahora));
    if (accion === "cortar") {
        anotarSesion(minutosAlCortar(estado, ahora), estado.fase === "flow" ? "flow" : "foco");
        guardar(null);
        aviso("Temporizador cortado.");
    }
    tic();
});

// Si había uno andando (por ejemplo, después de recargar), sigue
if (leer()) arrancarReloj();
