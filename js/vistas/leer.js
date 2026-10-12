// Leer un capítulo de un libro (el texto está en este navegador). Dirección: #leer?m=<mapa>&c=<concepto del capítulo>
// Abajo: capítulo anterior / siguiente y volver a la ficha. Si se llega desde el buscador, marca el párrafo (&p=<n>).
import * as d from "../datos.js?v=4ff97d5a37";
import { esc, vacio } from "../ui.js?v=4ff97d5a37";

export function vistaLeer(cont) {
    const p = new URLSearchParams(location.hash.split("?")[1] ?? "");
    const mapaId = p.get("m");
    const conceptoId = p.get("c");
    const marcado = Number.parseInt(p.get("p") ?? "", 10);
    let concepto;
    let libro;
    try {
        concepto = d.leerConcepto(conceptoId);
        libro = d.leerLibro(mapaId);
    } catch {
        cont.innerHTML = vacio("No se encontró ese capítulo", "Volvé a Estudio y elegilo desde el mapa.");
        return;
    }
    const cap = libro.capitulos[concepto.capitulo];
    if (!cap || concepto.mapa !== mapaId) {
        cont.innerHTML = vacio("No se encontró ese capítulo", "Volvé a Estudio y elegilo desde el mapa.");
        return;
    }
    const { conceptos } = d.leerMapa(mapaId);
    const capitulos = conceptos.filter((c) => Number.isInteger(c.capitulo)).sort((a, b) => a.capitulo - b.capitulo);
    const pos = capitulos.findIndex((c) => c.id === conceptoId);
    const ir = (c) => `#leer?m=${encodeURIComponent(mapaId)}&c=${encodeURIComponent(c.id)}`;
    const anterior = capitulos[pos - 1];
    const siguiente = capitulos[pos + 1];

    cont.innerHTML = `
        <article class="lectura">
            <p class="lectura__libro">${esc(libro.titulo)}${libro.autor ? ` · ${esc(libro.autor)}` : ""} · capítulo ${pos + 1} de ${capitulos.length}</p>
            <h1>${esc(cap.titulo)}</h1>
            ${cap.parrafos.map((t, i) => `<p ${i === marcado ? 'class="lectura__marcado" id="marcado"' : ""}>${esc(t)}</p>`).join("")}
            <nav class="lectura__nav acciones">
                ${anterior ? `<a class="boton boton--chico" href="${esc(ir(anterior))}">← ${esc(anterior.titulo)}</a>` : ""}
                <a class="boton" href="#estudio?m=${esc(encodeURIComponent(mapaId))}&c=${esc(encodeURIComponent(conceptoId))}&v=ficha">Ir a la ficha de este capítulo</a>
                ${siguiente ? `<a class="boton boton--chico" href="${esc(ir(siguiente))}">${esc(siguiente.titulo)} →</a>` : ""}
            </nav>
        </article>`;
    if (Number.isInteger(marcado)) cont.querySelector("#marcado")?.scrollIntoView({ block: "center" });
    else scrollTo(0, 0);
}
