// Ajustes: la conexión con la IA (dirección del servidor y token), la meta semanal, el tope de repasos y el tipo de
// temporizador; "Tus datos" (bajar una copia, importarla y pedirle al navegador que no los borre solo). Abajo, "Acerca de".
import * as d from "../datos.js?v=ee9afa6f58";
import * as ia from "../ia.js?v=ee9afa6f58";
import { TOPES, TEMPORIZADORES, PREFIJO } from "../config.js?v=ee9afa6f58";
import { esc, intentar, aviso } from "../ui.js?v=ee9afa6f58";
import { cuandoFue, fechaLocalISO } from "../fechas.js?v=ee9afa6f58";
import { instalada, sePuedeInstalar, instalar } from "../instalar.js?v=ee9afa6f58";

export function vistaAjustes(cont, { redibujar }) {
    const a = d.leerAjustes();
    const conexion = ia.leerConexion();
    const cupo = ia.ultimoCupo();
    const ultima = d.ultimaCopia();
    cont.innerHTML = `
        <h1>Ajustes</h1>

        <h2>Conexión con la IA</h2>
        <form class="tarjeta formulario" data-conexion>
            <p class="ayuda">${conexion.token
                ? `Conectada${cupo?.plan ? ` · plan ${esc(cupo.plan.nombre)}` : ""}${cupo ? ` · hoy usaste ${cupo.usado} de ${cupo.total} del cupo` : ""}.`
                : "Sin conectar: la app anda igual (mapas, fichas guardadas y repaso), pero la IA no arma ramas ni fichas."}</p>
            <label>Dirección del servidor
                <input name="servidor" value="${esc(conexion.servidor)}" required>
            </label>
            <label>Token de la app ${conexion.token ? "(ya cargado: dejalo vacío para no cambiarlo)" : ""}
                <input name="token" type="password" autocomplete="off" spellcheck="false" placeholder="${conexion.token ? "••••••••" : "Pegalo acá"}">
            </label>
            <p class="ayuda">El token no es la clave de la IA: solo permite que esta app use tu servidor. Queda guardado en este navegador.</p>
            <div class="acciones">
                <button class="boton" type="submit">Guardar y probar</button>
                ${conexion.token ? `<button class="boton boton--chico" type="button" data-desconectar>Desconectar</button>` : ""}
            </div>
        </form>

        <h2>Estudio</h2>
        <form class="tarjeta formulario" data-ajustes>
            <label>Meta de la semana (días con un rato de estudio o repaso)
                <input name="metaSemanal" type="number" inputmode="numeric" min="${TOPES.metaSemanalMin}" max="${TOPES.metaSemanalMax}" value="${a.metaSemanal}" required>
            </label>
            <label>Tope de tarjetas por día (lo que no entra pasa a mañana)
                <input name="topeRepasos" type="number" inputmode="numeric" min="${TOPES.topeRepasosMin}" max="${TOPES.topeRepasosMax}" value="${a.topeRepasos}" required>
            </label>
            <label>Temporizador
                <select name="temporizador">
                    ${Object.entries(TEMPORIZADORES).map(([clave, t]) =>
                        `<option value="${esc(clave)}" ${clave === a.temporizador ? "selected" : ""}>${esc(t.nombre)}</option>`).join("")}
                </select>
            </label>
            <p class="ayuda">El temporizador es opcional: lo prendés desde Estudio. Sirve para no agotarte; no hace aprender más por sí solo.</p>
            <button class="boton" type="submit">Guardar</button>
        </form>

        <h2>Instalar la app</h2>
        <div class="tarjeta">
            ${instalada()
                ? "<p>✅ Estás usando OTIUM instalada. Se abre como una app aparte y anda sin internet (menos la IA).</p>"
                : `<p>Instalada, OTIUM se abre como una app aparte (con su ícono en el escritorio o en el celu) y anda sin
                   internet, salvo la IA. Tus datos siguen siendo los de este navegador.</p>
                   ${sePuedeInstalar()
                       ? `<button class="boton" type="button" data-instalar>📲 Instalar OTIUM</button>`
                       : `<p class="ayuda">Si no ves el botón: en la compu (Chrome, Edge o Brave), el ícono de instalar a la
                          derecha de la barra de direcciones o el menú ⋮ → "Instalar OTIUM"; en Android, menú ⋮ → "Agregar a la
                          pantalla principal"; en iPhone (Safari), Compartir → "Agregar a inicio".</p>`}`}
        </div>

        <h2>Tus datos</h2>
        <div class="tarjeta formulario tus-datos">
            <p>Todo lo tuyo (mapas, fichas, repasos, escritos, notas, neuronas y libros) vive <strong>solo en este
               navegador</strong>. Si se borran los datos del navegador, se pierde. Bajá una copia de vez en cuando y
               guardala donde quieras (por ejemplo, en tu nube).</p>
            <p class="ayuda">${ultima ? `Última copia desde este navegador: ${esc(cuandoFue(ultima))}.` : "Todavía no bajaste ninguna copia desde este navegador."}</p>
            <div class="acciones">
                <button class="boton" type="button" data-exportar>⬇ Bajar una copia</button>
            </div>
            <p class="ayuda">La copia no lleva el token de la IA (cada navegador se conecta por su cuenta).</p>
            <form class="formulario" data-importar>
                <label>Importar una copia (.json)
                    <input name="archivo" type="file" accept=".json,application/json" required>
                </label>
                <p class="ayuda">Ojo: importar <strong>reemplaza todo</strong> lo de este navegador por lo del archivo. Sirve
                   para pasar tus cosas a otra compu o celu, o para volver a una copia.</p>
                <button class="boton boton--chico" type="submit">⬆ Importar</button>
            </form>
            <p class="ayuda" data-proteccion>Protección del navegador: consultando…</p>
        </div>
        <p><a href="#guia">Guía de 2 minutos</a> · <a href="#novedades">Novedades</a> · <a href="#contale">💬 Contale a Esteban</a> · <a href="#privacidad">Privacidad y términos</a> · <a href="#acerca">Acerca de la app y errores anotados</a></p>`;

    mostrarProteccion(cont);

    cont.addEventListener("submit", async (e) => {
        e.preventDefault();
        const form = e.target;
        const f = form.elements;
        if (form.matches("[data-importar]")) {
            await importar(f.archivo.files?.[0]);
            return;
        }
        if (form.matches("[data-ajustes]")) {
            const ok = intentar(() => d.guardarAjustes({ metaSemanal: f.metaSemanal.value, topeRepasos: f.topeRepasos.value, temporizador: f.temporizador.value }), "Ajustes guardados");
            if (ok) redibujar();
            return;
        }
        // Conexión: guardar y probar preguntando el cupo (no gasta nada)
        if (!intentar(() => ia.guardarConexion({ servidor: f.servidor.value, token: f.token.value }))) return;
        f.token.value = "";
        const boton = form.querySelector("[type=submit]");
        boton.disabled = true;
        boton.textContent = "Probando…";
        try {
            const c = await ia.pedirCupo();
            aviso(`Conectada. Hoy usaste ${c.usado} de ${c.total} del cupo de IA.`);
        } catch (err) {
            aviso(err.message, "error");
        }
        redibujar();
    });

    cont.addEventListener("click", async (e) => {
        if (e.target.closest("[data-desconectar]")) {
            ia.borrarToken();
            aviso("Token borrado de este navegador.");
            redibujar();
            return;
        }
        if (e.target.closest("[data-instalar]")) {
            const ok = await instalar();
            if (ok) aviso("¡Listo! OTIUM quedó instalada.");
            redibujar();
            return;
        }
        if (e.target.closest("[data-exportar]")) {
            if (exportar()) redibujar();
            return;
        }
        if (e.target.closest("[data-proteger]")) {
            const ok = await pedirProteccion();
            aviso(ok ? "Listo: el navegador no va a borrar tus datos solo." : "El navegador no lo aceptó por ahora (lo decide él). Bajá copias seguido.", ok ? "ok" : "error");
            mostrarProteccion(cont);
        }
    });
}

// ---------- Tus datos ----------

/** Baja la copia como archivo .json. Devuelve true si salió. */
function exportar() {
    try {
        const copia = d.armarRespaldo();
        const archivo = new Blob([JSON.stringify(copia)], { type: "application/json" });
        const url = URL.createObjectURL(archivo);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${PREFIJO}-copia-${fechaLocalISO()}.json`;
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        d.anotarCopia();
        const mb = archivo.size / 1_000_000;
        aviso(`Copia bajada (${mb < 0.1 ? "menos de 0,1" : mb.toFixed(1).replace(".", ",")} MB). Guardala en un lugar seguro.`);
        // Ya que la persona cuida sus datos, se le pide al navegador que tampoco los borre solo (no molesta si no)
        pedirProteccion();
        return true;
    } catch (err) {
        aviso(err.message, "error");
        return false;
    }
}

async function importar(archivo) {
    if (!archivo) return;
    if (archivo.size > TOPES.respaldoBytes) return aviso("El archivo es demasiado grande para ser una copia de OTIUM.", "error");
    let copia;
    try {
        copia = JSON.parse(await archivo.text());
    } catch {
        return aviso("No se pudo leer el archivo: no es una copia de OTIUM.", "error");
    }
    try {
        d.validarRespaldo(copia);
    } catch (err) {
        return aviso(err.message, "error");
    }
    const cuando = typeof copia.fecha === "string" ? copia.fecha.slice(0, 10) : "?";
    if (!confirm(`Importar la copia del ${cuando} REEMPLAZA todo lo de este navegador (mapas, fichas, escritos, neuronas y libros). Si no bajaste una copia de lo de ahora, cancelá y bajala primero. ¿Seguir?`)) return;
    try {
        const r = d.importarRespaldo(copia);
        aviso(`Copia importada: ${r.mapas} ${r.mapas === 1 ? "mapa" : "mapas"}${r.libros ? ` y ${r.libros} ${r.libros === 1 ? "libro" : "libros"}` : ""}.`);
        location.hash = "#inicio";
    } catch (err) {
        aviso(err.message, "error");
    }
}

async function pedirProteccion() {
    try {
        return (await navigator.storage?.persist?.()) === true;
    } catch {
        return false;
    }
}

async function mostrarProteccion(cont) {
    const lugar = cont.querySelector("[data-proteccion]");
    if (!lugar) return;
    let protegido = null;
    try {
        protegido = (await navigator.storage?.persisted?.()) ?? null;
    } catch {
        protegido = null;
    }
    if (!document.body.contains(lugar)) return;
    lugar.innerHTML = protegido === null
        ? "Este navegador no deja pedir protección para los datos: las copias son la forma segura."
        : protegido
            ? "🛡 Protección del navegador: activa (no borra tus datos solo cuando le falta lugar; si vos borrás los datos del navegador, igual se van)."
            : `Protección del navegador: no activa (si le falta lugar, podría borrar tus datos solo). <button class="boton boton--chico" type="button" data-proteger>Pedirla</button>`;
}
