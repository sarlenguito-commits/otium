// ============================================
// Arranque: errores anotados, cabecera, menú y RUTAS (una pantalla por archivo en js/vistas/).
// Pantalla nueva = un archivo en vistas/ + una línea en RUTAS.
// ============================================
import * as d from "./datos.js?v=3f84cb5f35";
import * as ia from "./ia.js?v=3f84cb5f35";
import { NOMBRE_APP, PREFIJO } from "./config.js?v=3f84cb5f35";
import { $, esc } from "./ui.js?v=3f84cb5f35";
import { vistaInicio } from "./vistas/inicio.js?v=3f84cb5f35";
import { vistaAcerca } from "./vistas/acerca.js?v=3f84cb5f35";
import { vistaEstudio } from "./vistas/estudio.js?v=3f84cb5f35";
import { vistaRepaso } from "./vistas/repaso.js?v=3f84cb5f35";
import { vistaAjustes } from "./vistas/ajustes.js?v=3f84cb5f35";
import { puedeEstudiar } from "./permisos.js?v=3f84cb5f35";
import { dibujarTemporizador } from "./temporizador.js?v=3f84cb5f35";
import { vistaBienvenida, bienvenidaVista } from "./vistas/bienvenida.js?v=3f84cb5f35";
import { vistaGuia } from "./vistas/guia.js?v=3f84cb5f35";
import { vistaContale } from "./vistas/contale.js?v=3f84cb5f35";
import { vistaLeer } from "./vistas/leer.js?v=3f84cb5f35";
import { vistaEscribir } from "./vistas/escribir.js?v=3f84cb5f35";
import { vistaCerebro } from "./vistas/cerebro.js?v=3f84cb5f35";
import { vistaNovedades } from "./vistas/novedades.js?v=3f84cb5f35";
import { vistaPrivacidad } from "./vistas/privacidad.js?v=3f84cb5f35";
import { vistaUso } from "./vistas/uso.js?v=3f84cb5f35";
import { prepararInstalacion } from "./instalar.js?v=3f84cb5f35";

// Instalable: service worker y el aviso del navegador (antes que nada: el aviso puede llegar enseguida)
prepararInstalacion();

// Errores que nadie atajó: se anotan solos (se ven en "Acerca de"); si no, nunca nos enteramos.
addEventListener("error", (e) => e.message && d.anotarError(e.message));
addEventListener("unhandledrejection", (e) => d.anotarError(e.reason?.message ?? String(e.reason ?? "")));

if (document.documentElement.dataset.prefijo !== PREFIJO) {
    console.warn(`data-prefijo del index.html ("${document.documentElement.dataset.prefijo}") no es PREFIJO de config.js ("${PREFIJO}")`);
}

// Link con el token adentro (?token=...): se guarda solo, así quien lo abre no tiene que pegarlo a mano en
// Bienvenida o Ajustes. Se borra de la URL enseguida para que no quede pegado ahí (historial, compartir el link).
const tokenDelLink = new URLSearchParams(location.search).get("token");
if (tokenDelLink) {
    try {
        ia.guardarConexion({ token: tokenDelLink });
    } catch {
        // formato raro: se ignora: queda la carga manual de siempre en Bienvenida o Ajustes
    }
    history.replaceState(null, "", location.pathname + location.hash);
}

// puede(usuario): quién la ve (una función de permisos.js). menu: si va en el menú de abajo (máximo 4 o 5).
// ancho: "completo" para las pantallas que usan todo el ancho de la compu (Estudio, partida en dos).
const RUTAS = {
    inicio: { titulo: "Inicio", vista: vistaInicio, menu: true },
    estudio: { titulo: "Estudio", vista: vistaEstudio, menu: true, puede: puedeEstudiar, ancho: "completo" },
    leer: { titulo: "Leer", vista: vistaLeer, menu: true, puede: puedeEstudiar },
    escribir: { titulo: "Escribir", vista: vistaEscribir, menu: true, puede: puedeEstudiar, ancho: "completo" },
    repaso: { titulo: "Repaso", vista: vistaRepaso, menu: true, puede: puedeEstudiar },
    cerebro: { titulo: "Cerebro 🧠", vista: vistaCerebro, menu: true, puede: puedeEstudiar, ancho: "completo" },
    // Ajustes: la ruedita de arriba (el menú de abajo queda para lo de todos los días)
    ajustes: { titulo: "Ajustes", vista: vistaAjustes, puede: puedeEstudiar },
    acerca: { titulo: "Acerca de", vista: vistaAcerca },
    bienvenida: { titulo: "Bienvenida", vista: vistaBienvenida },
    guia: { titulo: "Guía", vista: vistaGuia },
    contale: { titulo: "Contale a Esteban", vista: vistaContale },
    novedades: { titulo: "Novedades", vista: vistaNovedades },
    privacidad: { titulo: "Privacidad y términos", vista: vistaPrivacidad },
    uso: { titulo: "(!) Uso de la IA", vista: vistaUso, puede: puedeEstudiar },
};

// Lo que se puede ver antes de completar la bienvenida (la privacidad hay que poder leerla antes de aceptar)
const ANTES_DE_LA_BIENVENIDA = new Set(["bienvenida", "privacidad"]);

const principal = $("#principal");

function rutaActual(usuario) {
    const nombre = location.hash.slice(1).split("?")[0] || "inicio";
    const ruta = RUTAS[nombre];
    return ruta && (!ruta.puede || ruta.puede(usuario)) ? nombre : "inicio";
}

function dibujarSinUsuario() {
    $("#cabecera").innerHTML = `<span class="cabecera__nombre">${esc(NOMBRE_APP)}</span>`;
    $("#menu").innerHTML = "";
    document.title = NOMBRE_APP;
    principal.innerHTML = `<p class="error">No se encontró a nadie para usar la app. Probá volver a los datos de ejemplo desde "Acerca de".</p>`;
}

function dibujarCabecera(usuario, nombreRuta) {
    $("#cabecera").innerHTML = `
        <span class="cabecera__nombre">${esc(NOMBRE_APP)}</span>
        <span id="temporizador" class="cabecera__temporizador"></span>
        <button class="boton boton--chico" data-accion="tema" aria-label="Tema: cambiar entre claro y oscuro">Tema</button>
        <a class="boton boton--chico cabecera__ajustes" href="#ajustes" aria-label="Ajustes" title="Ajustes" ${nombreRuta === "ajustes" ? 'aria-current="page"' : ""}>⚙</a>`;
    $("#menu").innerHTML = Object.entries(RUTAS)
        .filter(([, r]) => r.menu && (!r.puede || r.puede(usuario)))
        .map(([n, r]) => `<a href="#${n}" ${n === nombreRuta ? 'aria-current="page"' : ""}>${esc(r.titulo)}</a>`)
        .join("");
    dibujarTemporizador();
}

// Lo que la pantalla anterior pidió hacer antes de irse (por ejemplo, Escribir guarda lo último que se tipeó)
let alSalirDeLaPantalla = null;

async function dibujar() {
    if (alSalirDeLaPantalla) {
        const salir = alSalirDeLaPantalla;
        alSalirDeLaPantalla = null;
        try {
            salir();
        } catch (e) {
            d.anotarError(e.message);
        }
    }
    const usuario = d.usuarioActual();
    if (!usuario) return dibujarSinUsuario();
    // La primera vez, la bienvenida (y vuelve ahí hasta completarla)
    if (!bienvenidaVista() && !ANTES_DE_LA_BIENVENIDA.has(location.hash.slice(1).split("?")[0])) {
        location.hash = "#bienvenida";
        return;
    }
    const nombre = rutaActual(usuario);
    const ruta = RUTAS[nombre];
    document.title = `${ruta.titulo} · ${NOMBRE_APP}`;
    dibujarCabecera(usuario, nombre);
    principal.dataset.ancho = ruta.ancho ?? "";
    // Cada pantalla recibe una hoja nueva: así lo que escucha (clics, envíos) se va con ella y no se acumula
    const hoja = document.createElement("div");
    principal.replaceChildren(hoja);
    try {
        await ruta.vista(hoja, { usuario, redibujar: dibujar, alSalir: (fn) => (alSalirDeLaPantalla = fn) });
    } catch (e) {
        d.anotarError(e.message);
        principal.innerHTML = `<p class="error">Algo falló al mostrar esta pantalla: ${esc(e.message)}</p>`;
    }
}

document.addEventListener("click", (e) => {
    const accion = e.target.closest("[data-accion]")?.dataset.accion;
    if (accion === "tema") window.cambiarTema?.();
});

addEventListener("hashchange", dibujar);
// Otra pestaña de la app cambió algo: se vuelve a dibujar
addEventListener("storage", (e) => e.key?.startsWith(`${PREFIJO}-`) && !e.key.endsWith("-tema") && dibujar());
d.alCambiar((que) => que === "todo" && dibujar());

dibujar();
