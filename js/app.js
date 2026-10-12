// ============================================
// Arranque: errores anotados, cabecera, menú y RUTAS (una pantalla por archivo en js/vistas/).
// Pantalla nueva = un archivo en vistas/ + una línea en RUTAS.
// ============================================
import * as d from "./datos.js?v=d337193a0e";
import { NOMBRE_APP, PREFIJO } from "./config.js?v=d337193a0e";
import { $, esc } from "./ui.js?v=d337193a0e";
import { vistaInicio } from "./vistas/inicio.js?v=d337193a0e";
import { vistaAcerca } from "./vistas/acerca.js?v=d337193a0e";
import { vistaEstudio } from "./vistas/estudio.js?v=d337193a0e";
import { vistaRepaso } from "./vistas/repaso.js?v=d337193a0e";
import { vistaAjustes } from "./vistas/ajustes.js?v=d337193a0e";
import { puedeEstudiar } from "./permisos.js?v=d337193a0e";
import { dibujarTemporizador } from "./temporizador.js?v=d337193a0e";
import { vistaBienvenida, bienvenidaVista } from "./vistas/bienvenida.js?v=d337193a0e";
import { vistaGuia } from "./vistas/guia.js?v=d337193a0e";
import { vistaContale } from "./vistas/contale.js?v=d337193a0e";

// Errores que nadie atajó: se anotan solos (se ven en "Acerca de"); si no, nunca nos enteramos.
addEventListener("error", (e) => e.message && d.anotarError(e.message));
addEventListener("unhandledrejection", (e) => d.anotarError(e.reason?.message ?? String(e.reason ?? "")));

if (document.documentElement.dataset.prefijo !== PREFIJO) {
    console.warn(`data-prefijo del index.html ("${document.documentElement.dataset.prefijo}") no es PREFIJO de config.js ("${PREFIJO}")`);
}

// puede(usuario): quién la ve (una función de permisos.js). menu: si va en el menú de abajo (máximo 4 o 5).
// ancho: "completo" para las pantallas que usan todo el ancho de la compu (Estudio, partida en dos).
const RUTAS = {
    inicio: { titulo: "Inicio", vista: vistaInicio, menu: true },
    estudio: { titulo: "Estudio", vista: vistaEstudio, menu: true, puede: puedeEstudiar, ancho: "completo" },
    repaso: { titulo: "Repaso", vista: vistaRepaso, menu: true, puede: puedeEstudiar },
    ajustes: { titulo: "Ajustes", vista: vistaAjustes, menu: true, puede: puedeEstudiar },
    acerca: { titulo: "Acerca de", vista: vistaAcerca },
    bienvenida: { titulo: "Bienvenida", vista: vistaBienvenida },
    guia: { titulo: "Guía", vista: vistaGuia },
    contale: { titulo: "Contale a Esteban", vista: vistaContale },
};

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
        <button class="boton boton--chico" data-accion="tema" aria-label="Cambiar entre claro y oscuro">Tema</button>`;
    $("#menu").innerHTML = Object.entries(RUTAS)
        .filter(([, r]) => r.menu && (!r.puede || r.puede(usuario)))
        .map(([n, r]) => `<a href="#${n}" ${n === nombreRuta ? 'aria-current="page"' : ""}>${esc(r.titulo)}</a>`)
        .join("");
    dibujarTemporizador();
}

async function dibujar() {
    const usuario = d.usuarioActual();
    if (!usuario) return dibujarSinUsuario();
    // La primera vez, la bienvenida (y vuelve ahí hasta completarla)
    if (!bienvenidaVista() && location.hash.slice(1).split("?")[0] !== "bienvenida") {
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
        await ruta.vista(hoja, { usuario, redibujar: dibujar });
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
