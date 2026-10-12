// Repaso: las tarjetas que tocan hoy, una por vez. Primero intentás acordarte (active recall), después mirás la
// respuesta esperada y decís cómo te fue. Hay un tope por día: lo que no entra pasa a mañana, sin mostrar una pila.
import * as d from "../datos.js?v=ceaa36c8f6";
import { RESULTADOS } from "../config.js?v=ceaa36c8f6";
import { esc, vacio, intentar } from "../ui.js?v=ceaa36c8f6";

export function vistaRepaso(cont, { redibujar }) {
    const tarjetas = d.repasosDeHoy();
    const { respondidas } = d.resumenRepaso();
    const racha = d.rachaSemanal();

    if (!tarjetas.length) {
        cont.innerHTML = `
            <h1>Repaso</h1>
            ${vacio(respondidas ? "¡Listo por hoy!" : "Hoy no hay nada para repasar",
                respondidas
                    ? `Repasaste ${respondidas} ${respondidas === 1 ? "tarjeta" : "tarjetas"}. Lo que sigue vuelve solo en los próximos días.`
                    : "Cuando aprendas un concepto, sus preguntas vuelven acá a los 1, 3, 7, 14, 30 y 60 días.")}
            <p class="racha-linea">${esc(textoRacha(racha))}</p>
            <p><a class="boton" href="#estudio">Ir a estudiar</a></p>`;
        return;
    }

    const t = tarjetas[0];
    const concepto = intentar(() => d.leerConcepto(t.concepto));
    cont.innerHTML = `
        <h1>Repaso</h1>
        <p class="repaso__cuenta">${respondidas + 1} de ${respondidas + tarjetas.length} de hoy</p>
        <article class="tarjeta repaso">
            ${concepto ? `<p class="repaso__concepto">${esc(concepto.titulo)}</p>` : ""}
            <h2 class="repaso__pregunta">${esc(t.pregunta)}</h2>
            <form class="formulario" data-mostrar>
                <label>Intentá responder sin mirar (lo que escribas es solo para vos)
                    <textarea name="intento" rows="3" maxlength="1000"></textarea>
                </label>
                <button class="boton" type="submit">Mostrar la respuesta</button>
            </form>
            <div class="repaso__respuesta" hidden>
                <h3>Respuesta esperada</h3>
                <p>${esc(t.respuesta)}</p>
                <p>¿Cómo te fue?</p>
                <div class="acciones">
                    ${Object.entries(RESULTADOS).map(([clave, nombre]) =>
                        `<button class="boton boton--resultado boton--${esc(clave)}" data-resultado="${esc(clave)}">${esc(nombre)}</button>`).join("")}
                </div>
            </div>
        </article>`;

    cont.addEventListener("submit", (e) => {
        e.preventDefault();
        e.target.querySelector("button").hidden = true;
        cont.querySelector(".repaso__respuesta").hidden = false;
        cont.querySelector("[data-resultado]").focus();
    });

    cont.addEventListener("click", (e) => {
        const resultado = e.target.closest("[data-resultado]")?.dataset.resultado;
        if (resultado && intentar(() => d.responderTarjeta(t.id, resultado))) redibujar();
    });
}

/** "2 de 3 días esta semana", sin números grandes ni castigos. */
export function textoRacha({ dias, meta, cumplida, semanasSeguidas }) {
    if (cumplida) return semanasSeguidas >= 2 ? `Meta de la semana cumplida · ${semanasSeguidas} semanas seguidas` : "Meta de la semana cumplida";
    if (dias === 0) return `Esta semana arrancamos de nuevo: la meta es ${meta} ${meta === 1 ? "día" : "días"}.`;
    return `${dias} de ${meta} días esta semana`;
}
