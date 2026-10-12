// Ajustes: la conexión con la IA (dirección del servidor y token), la meta semanal, el tope de repasos y el tipo de
// temporizador. Abajo, "Acerca de".
import * as d from "../datos.js?v=db209204dc";
import * as ia from "../ia.js?v=db209204dc";
import { TOPES, TEMPORIZADORES } from "../config.js?v=db209204dc";
import { esc, intentar, aviso } from "../ui.js?v=db209204dc";

export function vistaAjustes(cont, { redibujar }) {
    const a = d.leerAjustes();
    const conexion = ia.leerConexion();
    const cupo = ia.ultimoCupo();
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
        <p><a href="#guia">Guía de 2 minutos</a> · <a href="#novedades">Novedades</a> · <a href="#contale">💬 Contale a Esteban</a> · <a href="#acerca">Acerca de la app y errores anotados</a></p>`;

    cont.addEventListener("submit", async (e) => {
        e.preventDefault();
        const form = e.target;
        const f = form.elements;
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

    cont.addEventListener("click", (e) => {
        if (e.target.closest("[data-desconectar]")) {
            ia.borrarToken();
            aviso("Token borrado de este navegador.");
            redibujar();
        }
    });
}
