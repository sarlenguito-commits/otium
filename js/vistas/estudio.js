// Estudio: la pantalla central. En la compu, partida en dos: el chat a la izquierda y, a la derecha, el mapa de
// ramas con la ficha del concepto elegido. En el celu (angosto) son tres pestañas: Chat, Mapa y Ficha.
// Dirección: #estudio?m=<mapa>&c=<concepto>&v=<pestaña del celu>
// La IA arma ramas y fichas (acciones-ia.js); el chat todavía solo guarda lo que escribís (la charla llega con el
// modo libre). Arriba, la barrita del cupo de IA del día.
import * as d from "../datos.js?v=67446a5e85";
import { ESTADOS, CERTEZAS, VIGENCIAS, MODOS, TOPES, TEMPORIZADORES, COSTOS_IA } from "../config.js?v=67446a5e85";
import { esc, vacio, intentar, aviso } from "../ui.js?v=67446a5e85";
import { cuandoFue, fechaLocalISO } from "../fechas.js?v=67446a5e85";
import * as ia from "../ia.js?v=67446a5e85";
import { armarRamas, armarFicha, armarPrevios, charlar } from "../acciones-ia.js?v=67446a5e85";
import { seccionComprobar, panelContalo, contaloAbierto, manejarComprobar } from "./comprobar.js?v=67446a5e85";
import { seccionNotas, manejarNotas } from "./notas-ficha.js?v=67446a5e85";
import { seccionNeuronas } from "./cerebro.js?v=67446a5e85";
import { seccionMapas, manejarMapas, guardarPlegado } from "./mapas-lateral.js?v=67446a5e85";
import { empezarTemporizador, temporizadorAndando } from "../temporizador.js?v=67446a5e85";

// Fichas con el formulario "Esto está mal" abierto (mientras la página esté abierta)
const malAbierto = new Set();
// Última búsqueda en cada libro (mapa → { consulta, resultados })
const busquedas = new Map();

const ICONOS = { sin_abrir: "⚪", en_curso: "🔵", aprendido: "✅" };
const PESTANAS = { chat: "Chat", mapa: "Mapa", ficha: "Ficha" };

function parametros() {
    const p = new URLSearchParams(location.hash.split("?")[1] ?? "");
    return { m: p.get("m"), c: p.get("c"), v: Object.hasOwn(PESTANAS, p.get("v") ?? "") ? p.get("v") : "chat" };
}

const direccion = ({ m, c, v }) => `#estudio?${new URLSearchParams(Object.entries({ m, c, v }).filter(([, x]) => x))}`;

export function vistaEstudio(cont, { redibujar }) {
    const { m, c, v } = parametros();
    const mapas = d.listarMapas();
    const mapaId = mapas.some((x) => x.id === m) ? m : mapas[0]?.id;
    if (!mapaId) {
        cont.className = "estudio estudio--vacio";
        cont.innerHTML = `${seccionMapas(null)}<div class="estudio__vacio">${vacio("Todavía no hay mapas", "Creá uno con \"+ Mapa nuevo\" (un tema o un libro EPUB).")}</div>`;
        montarLateral(cont);
        cont.addEventListener("submit", async (e) => {
            e.preventDefault();
            await manejarMapas(e, redibujar);
        });
        cont.addEventListener("click", (e) => manejarMapas(e, redibujar));
        return;
    }
    const { mapa, conceptos, mensajes } = d.leerMapa(mapaId);
    const porId = new Map(conceptos.map((x) => [x.id, x]));
    const raiz = conceptos.find((x) => !x.padre);
    // Si no se eligió un concepto: el último en curso que tenga ficha, o la raíz
    const elegido = porId.get(c) ?? conceptos.filter((x) => x.estado === "en_curso" && x.ficha).at(-1) ?? raiz;

    cont.className = `estudio estudio--${v}`;
    cont.innerHTML = `
        <header class="estudio__cabecera">
            <h1>${esc(mapa.tema)}</h1>
            <span class="estudio__meta">${esc(MODOS[mapa.modo])} · ${mapa.avance.aprendidos} de ${mapa.avance.total} aprendidos</span>
            <span class="cupo-ia" data-cupo-ia>${textoCupo()}</span>
            ${temporizadorAndando() ? "" : `<button class="boton boton--chico" data-empezar-temporizador>⏱ Temporizador ${esc(TEMPORIZADORES[d.leerAjustes().temporizador].nombre)}</button>`}
        </header>
        ${seccionMapas(mapaId)}
        <nav class="pestanas" aria-label="Partes de la pantalla">
            ${Object.entries(PESTANAS).map(([clave, nombre]) =>
                `<a href="${esc(direccion({ m: mapaId, c: elegido.id, v: clave }))}" ${clave === v ? 'aria-current="page"' : ""}>${esc(nombre)}</a>`).join("")}
        </nav>
        <section class="estudio__chat" aria-label="Chat">${chat(mensajes, porId, mapaId)}</section>
        <section class="estudio__mapa" aria-label="Mapa de ramas">
            <h2 class="visualmente-oculto">Mapa</h2>
            ${mapa.modo === "libro" ? buscador(mapaId) : ""}
            ${arbol(raiz, conceptos, elegido.id, mapaId)}
        </section>
        <section class="estudio__ficha" aria-label="Ficha">${panelConcepto(elegido, porId, mapaId)}</section>`;

    montarLateral(cont);

    // Que el chat arranque mostrando lo último
    const historial = cont.querySelector(".chat__mensajes");
    if (historial) historial.scrollTop = historial.scrollHeight;

    // El cupo de hoy: si no se sabe todavía (o es de otro día), se le pregunta al servidor (no gasta cupo)
    const cupo = ia.ultimoCupo();
    if (ia.conectada() && (!cupo || !cupo.plan || cupo.dia !== fechaLocalISO())) {
        ia.pedirCupo().then(() => { const lugar = cont.querySelector("[data-cupo-ia]"); if (lugar) lugar.innerHTML = textoCupo(); }).catch(() => {});
    }

    cont.addEventListener("submit", async (e) => {
        e.preventDefault(); // antes de cualquier espera: si no, el navegador manda el formulario
        if (await manejarMapas(e, redibujar)) return;
        if (e.target.matches("[data-buscar]")) {
            const consulta = e.target.elements.consulta.value.trim().slice(0, TOPES.busqueda);
            try {
                busquedas.set(mapaId, { consulta, resultados: d.buscarEnLibro(mapaId, consulta) });
            } catch (err) {
                aviso(err.message, "error");
            }
            redibujar();
            return;
        }
        if (manejarNotas(e, elegido, redibujar)) return;
        if (await manejarComprobar(e, elegido, redibujar)) return;
        const form = e.target;
        if (form.matches("[data-enviar]")) {
            const texto = form.elements.texto.value;
            if (!ia.conectada()) {
                if (intentar(() => d.agregarMensaje(mapaId, { quien: "vos", texto }), "Guardado como nota (para charlar con la IA, conectala en Ajustes).")) redibujar();
                return;
            }
            if (!ia.alcanza(COSTOS_IA.charla)) return aviso("No alcanza el cupo de IA de hoy. El repaso sigue funcionando; mañana se renueva.", "error");
            const boton = form.querySelector("[type=submit]");
            boton.disabled = true;
            boton.textContent = "Pensando…";
            form.elements.texto.readOnly = true;
            try {
                const { nuevos } = await charlar(mapaId, texto);
                if (nuevos.length) aviso(`${nuevos.length === 1 ? "Un concepto nuevo" : `${nuevos.length} conceptos nuevos`} en el mapa`);
            } catch (err) {
                aviso(err.message, "error");
            }
            redibujar();
        } else if (form.matches("[data-rama]")) {
            const titulo = form.elements.titulo.value;
            if (intentar(() => d.agregarRamas(elegido.id, [{ titulo }]), "Rama agregada")) redibujar();
        }
    });

    cont.addEventListener("click", async (e) => {
        if (await manejarMapas(e, redibujar)) return;
        if (manejarNotas(e, elegido, redibujar)) return;
        if (await manejarComprobar(e, elegido, redibujar)) return;
        const botonIA = e.target.closest("[data-ia]");
        if (botonIA) {
            const que = botonIA.dataset.ia;
            const costo = COSTOS_IA[que] + (que === "ficha" && necesitaPrevios(d.leerConcepto(elegido.id)) ? COSTOS_IA.previos : 0);
            if (!ia.alcanza(costo)) {
                aviso("No alcanza el cupo de IA de hoy. El repaso sigue funcionando; mañana se renueva.", "error");
                return;
            }
            cont.querySelectorAll("[data-ia]").forEach((b) => (b.disabled = true));
            botonIA.textContent = que === "ficha" ? "Armando la ficha… (unos segundos)" : "Armando las ramas…";
            try {
                if (que === "ficha") {
                    // Primero el escalón de abajo (una sola vez por concepto; los escalones no tienen escalones)
                    if (necesitaPrevios(d.leerConcepto(elegido.id))) {
                        botonIA.textContent = "Viendo qué necesitás saber antes…";
                        try {
                            await armarPrevios(elegido.id);
                        } catch (err) {
                            aviso(`No pude revisar los conceptos previos (${err.message}). Sigo con la ficha.`, "error");
                        }
                        botonIA.textContent = "Armando la ficha… (unos segundos)";
                    }
                    await armarFicha(elegido.id);
                    aviso("Ficha lista");
                } else {
                    const nuevas = await armarRamas(elegido.id);
                    aviso(`${nuevas.length} ramas nuevas`);
                }
                redibujar();
            } catch (err) {
                aviso(err.message, "error");
                redibujar();
            }
            return;
        }
        if (e.target.closest("[data-empezar-temporizador]")) {
            empezarTemporizador(d.leerAjustes().temporizador);
            e.target.closest("[data-empezar-temporizador]").remove();
            return;
        }
        if (e.target.closest("[data-mal]")) {
            if (malAbierto.has(elegido.id)) malAbierto.delete(elegido.id);
            else malAbierto.add(elegido.id);
            redibujar();
            return;
        }
        const accionMal = e.target.closest("[data-mal-accion]")?.dataset.malAccion;
        if (accionMal) {
            const form = e.target.closest("form");
            const motivo = form.elements.motivo.value.trim();
            if (!motivo) {
                aviso("Contá en una línea qué te parece que está mal.", "error");
                return;
            }
            if (accionMal === "rehacer" && !ia.alcanza(COSTOS_IA.ficha)) {
                aviso("No alcanza el cupo de IA de hoy para rehacerla. Mandá solo el aviso.", "error");
                return;
            }
            form.querySelectorAll("button, textarea").forEach((el) => (el.disabled = true));
            try {
                await ia.pedirComentario({ tipo: "error", texto: motivo, concepto: elegido.titulo, mapa: mapa.tema });
                if (accionMal === "rehacer") {
                    e.target.textContent = "Rehaciendo la ficha…";
                    await armarFicha(elegido.id, { correccion: motivo });
                    aviso("Ficha rehecha. ¡Gracias por avisar!");
                } else {
                    aviso("¡Gracias! Le llegó a Esteban.");
                }
                malAbierto.delete(elegido.id);
            } catch (err) {
                aviso(err.message, "error");
            }
            redibujar();
            return;
        }
        const previoSabido = e.target.closest("[data-previo-se]")?.dataset.previoSe;
        if (previoSabido) {
            if (intentar(() => d.cambiarEstado(previoSabido, "aprendido"), "Anotado: ya lo sabés")) redibujar();
            return;
        }
        const estado = e.target.closest("[data-estado]")?.dataset.estado;
        if (estado && intentar(() => d.cambiarEstado(elegido.id, estado), estado === "aprendido" ? "¡Aprendido!" : "Listo")) redibujar();
    });
}

/** El lateral "Tus mapas": si la PERSONA lo pliega o lo abre, se recuerda. Se escucha el clic en el título y no
 *  "toggle", porque el navegador también avisa "toggle" cuando el lateral se dibuja abierto (y quedaba guardado
 *  "abierto" sin que nadie lo tocara: en el celu arrancaba abierto). */
function montarLateral(cont) {
    const lado = cont.querySelector("[data-mapas-lado]");
    lado?.querySelector("summary")?.addEventListener("click", () => setTimeout(() => guardarPlegado(lado.open)));
}

// ---------- Chat ----------

function chat(mensajes, porId, mapaId) {
    return `
        <ol class="chat__mensajes">
            ${mensajes.length ? mensajes.map((x) => `
                <li class="mensaje mensaje--${esc(x.quien)}">
                    <p>${esc(x.texto)}</p>
                    <span class="mensaje__meta">${x.quien === "vos" ? "Vos" : "App"} · ${esc(cuandoFue(x.cuando))}${
                        x.concepto && porId.has(x.concepto)
                            ? ` · <a href="${esc(direccion({ m: mapaId, c: x.concepto, v: "ficha" }))}">${esc(porId.get(x.concepto).titulo)}</a>`
                            : ""}</span>
                </li>`).join("") : `<li>${vacio("La charla empieza acá", "Escribí qué querés aprender o preguntá lo que quieras.")}</li>`}
        </ol>
        <form class="chat__escribir" data-enviar>
            <label class="visualmente-oculto" for="texto-chat">Tu mensaje</label>
            <textarea id="texto-chat" name="texto" rows="2" maxlength="${TOPES.mensaje}" required
                placeholder="${ia.conectada() ? "Preguntá o charlá sobre el tema: los conceptos nuevos se cuelgan solos del mapa…" : "Notas para vos (para charlar con la IA, conectala en Ajustes)…"}"></textarea>
            <button class="boton" type="submit">Enviar</button>
        </form>
        ${ia.conectada() ? `<p class="ayuda chat__aviso">Lo que escribís acá va a la IA (Google, plan gratis): sin datos personales. Cada mensaje usa ${COSTOS_IA.charla} de tu IA del día.</p>` : ""}`;
}

// ---------- Mapa (árbol) ----------

function arbol(raiz, conceptos, elegidoId, mapaId) {
    const hijos = (id) => conceptos.filter((x) => x.padre === id).sort((a, b) => a.orden - b.orden);
    const nodo = (x) => {
        const ramas = hijos(x.id);
        return `
            <li>
                <a class="nodo nodo--${esc(x.estado)}" href="${esc(direccion({ m: mapaId, c: x.id, v: "ficha" }))}"
                   ${x.id === elegidoId ? 'aria-current="true"' : ""} title="${esc(ESTADOS[x.estado])}">
                    <span aria-hidden="true">${ICONOS[x.estado]}</span> ${x.escalon ? '<span title="Escalón de abajo">🪜</span> ' : ""}${esc(x.titulo)}
                    <span class="visualmente-oculto">(${esc(ESTADOS[x.estado])})</span>
                </a>
                ${ramas.length ? `<ul>${ramas.map(nodo).join("")}</ul>` : ""}
            </li>`;
    };
    return `
        <ul class="arbol">${nodo(raiz)}</ul>
        <p class="arbol__leyenda">✅ aprendido · 🔵 en curso · ⚪ sin abrir. Abrís las ramas que quieras, cuando quieras.</p>`;
}

// ---------- Ficha del concepto elegido ----------

const certeza = (c) => `<span class="certeza certeza--${esc(c)}">${esc(CERTEZAS[c] ?? c)}</span>`;

function panelConcepto(x, porId, mapaId) {
    const ramas = [...porId.values()].filter((r) => r.padre === x.id);
    const botonesEstado = `
        <div class="acciones">
            ${x.estado === "sin_abrir" ? `<button class="boton" data-estado="en_curso">Abrir esta rama</button>` : ""}
            ${x.estado === "en_curso" && x.padre ? `<button class="boton" data-estado="aprendido">Ya lo sé: marcar aprendido</button>` : ""}
            ${x.estado === "aprendido" ? `<button class="boton boton--chico" data-estado="en_curso">Volver a repasarlo (en curso)</button>` : ""}
        </div>`;
    const agregarRama = ramas.length < TOPES.ramasPorConcepto ? `
        <form class="agregar-rama" data-rama>
            <label for="titulo-rama">Agregar una rama a mano</label>
            <div class="agregar-rama__fila">
                <input id="titulo-rama" name="titulo" maxlength="${TOPES.tituloConcepto}" placeholder="Por ejemplo: Plagas" required>
                <button class="boton boton--chico" type="submit">Agregar</button>
            </div>
        </form>` : "";

    const listaRamas = ramas.length ? `<p>Ramas: ${ramas.map((r) => `<a href="${esc(direccion({ m: mapaId, c: r.id, v: "ficha" }))}">${esc(r.titulo)}</a>`).join(" · ")}</p>` : "";

    if (!x.ficha && x.escalon) return panelEscalon(x, porId, mapaId, botonesEstado, listaRamas, ramas);

    if (!x.ficha) {
        return `
            <h2><span aria-hidden="true">${ICONOS[x.estado]}</span> ${esc(x.titulo)}</h2>
            ${x.resumen ? `<p class="ficha__idea">${esc(x.resumen)}</p>` : ""}
            ${Number.isInteger(x.capitulo) ? `<p><a class="boton" href="${esc(dirLeer(mapaId, x.id))}">📖 Leer el capítulo</a></p>
            <p class="ayuda">Leelo primero (o mientras tanto) y después pedí la ficha: la IA la arma con el texto del capítulo.</p>` : ""}
            ${x.padre ? vacio("Todavía sin ficha", Number.isInteger(x.capitulo) ? "La ficha resume las ideas de este capítulo, con preguntas para comprobar que lo entendiste." : "Pedile a la IA que la arme: definición, origen, autores, error común, analogías y preguntas.") : ""}
            ${botonesIA(x, ramas)}
            ${x.padre ? seccionNotas(x, porId) : ""}
            ${seccionNeuronas(x)}
            ${listaRamas}
            ${botonesEstado}
            ${agregarRama}`;
    }

    if (contaloAbierto(x.id)) return panelContalo(x);
    const f = x.ficha;
    const previos = x.prerrequisitos.map((id) => porId.get(id) ?? null).filter(Boolean);
    return `
        <article class="ficha">
            <h2><span aria-hidden="true">${ICONOS[x.estado]}</span> ${esc(x.titulo)}</h2>
            ${f.aviso ? `<p class="ficha__aviso">${esc(f.aviso)}</p>` : ""}
            ${antesDeLeer(previos, mapaId)}
            <p class="ficha__idea">${esc(f.idea)}</p>
            ${f.deLibro ? `<p class="ficha__fuente">Armada con el texto del libro <em>${esc(f.deLibro.libro)}</em> · <a href="${esc(dirLeer(mapaId, x.id))}">📖 Leer el capítulo</a></p>` : ""}
            ${f.fuente ? `<p class="ficha__fuente">Chequeada con Wikipedia: <a href="${esc(f.fuente.url)}" target="_blank" rel="noopener noreferrer">${esc(f.fuente.titulo)} ↗</a></p>` : ""}

            <h3>Definición</h3>
            <p>${esc(f.definicion)}</p>

            <h3>De dónde viene ${certeza(f.origen.certeza)}</h3>
            <p>${esc(f.origen.texto)}</p>

            ${f.autores.length ? `
            <h3>Autores</h3>
            <ul class="ficha__autores">${f.autores.map((a) => `
                <li><strong>${esc(a.nombre)}</strong> ${certeza(a.certeza)}<br>${esc(a.dijo)}</li>`).join("")}
            </ul>` : ""}

            <h3>¿Se sostiene hoy? <span class="vigencia vigencia--${esc(f.vigencia.estado)}">${esc(VIGENCIAS[f.vigencia.estado])}</span> ${certeza(f.vigencia.certeza)}</h3>
            <p>${esc(f.vigencia.porque)}</p>

            <h3>Influencias ${certeza(f.influencias.certeza)}</h3>
            <p>${esc(f.influencias.texto)}</p>

            <div class="analogia">
                <h3>Como si fuera…</h3>
                <p>${esc(f.analogia.texto)}</p>
                <p class="analogia__no"><strong>En qué no se parece:</strong> ${esc(f.analogia.noSeParece)}</p>
            </div>
            ${f.analogiaPropia ? `
            <div class="analogia analogia--propia">
                <h3>Con lo que ya sabés</h3>
                <p>${esc(f.analogiaPropia.texto)}</p>
                <p class="analogia__no"><strong>En qué no se parece:</strong> ${esc(f.analogiaPropia.noSeParece)}</p>
            </div>` : ""}

            ${f.errorComun ? `
            <div class="error-comun">
                <h3>Ojo, error común</h3>
                <p>${esc(f.errorComun)}</p>
            </div>` : ""}

            ${previos.length ? `
            <h3>Necesitás antes</h3>
            <p>${previos.map((p) => `<a href="${esc(direccion({ m: p.mapa === mapaId ? mapaId : p.mapa, c: p.id, v: "ficha" }))}">${ICONOS[p.estado]} ${esc(p.titulo)}</a>`).join(" · ")}</p>` : ""}

            ${f.verificar.length ? `
            <h3>Para verificar</h3>
            <p>${f.verificar.map((t) => `<a href="${esc(`https://es.wikipedia.org/w/index.php?search=${encodeURIComponent(t)}`)}" target="_blank" rel="noopener noreferrer">${esc(t)} en Wikipedia ↗</a>`).join(" · ")}</p>` : ""}

            ${f.preguntas.length ? seccionComprobar(x) : ""}
            ${seccionNotas(x, porId)}
            ${seccionNeuronas(x)}
            ${estoEstaMal(x)}
            ${botonesEstado}
            ${listaRamas}
            ${botonesIA(x, ramas)}
            ${agregarRama}
        </article>`;
}

// ---------- IA: botones y cupo ----------

/** Botones para pedirle a la IA (o, si no está conectada, cómo conectarla). */
function botonesIA(x, ramas) {
    if (!ia.conectada()) return `<p class="ayuda">Para que la IA arme ramas y fichas, conectala en <a href="#ajustes">Ajustes</a>.</p>`;
    const botones = [];
    if (x.padre && !x.ficha) {
        const costo = COSTOS_IA.ficha + (necesitaPrevios(x) ? COSTOS_IA.previos : 0);
        botones.push(`<button class="boton ${x.escalon ? "boton--chico" : ""}" data-ia="ficha">✨ ${x.escalon ? "Armar la ficha completa" : "Armar la ficha con IA"}</button><span class="ayuda">usa ${costo} de tu cupo</span>`);
    }
    if (ramas.length < TOPES.ramasPorConcepto && !Number.isInteger(x.capitulo) && !(x.padre === null && x.mapa && esLibro(x.mapa))) {
        botones.push(`<button class="boton ${ramas.length || x.ficha ? "boton--chico" : ""}" data-ia="ramas">✨ ${ramas.length ? "Más ramas con IA" : "Armar las ramas con IA"}</button><span class="ayuda">usa ${COSTOS_IA.ramas}</span>`);
    }
    return botones.length ? `<div class="acciones acciones--ia">${botones.join("")}</div>` : "";
}

/** "IA de hoy: 10 %" con una barrita (lo último que dijo el servidor). */
function textoCupo() {
    if (!ia.conectada()) return "";
    const c = ia.ultimoCupo();
    if (!c || c.dia !== fechaLocalISO()) return `<span class="cupo-ia__texto">IA de hoy: …</span>`;
    const pct = Math.min(100, Math.round((c.usado / c.total) * 100));
    return `<span class="cupo-ia__texto">IA de hoy: ${pct} % usado</span><progress class="cupo-ia__barra" max="${c.total}" value="${c.usado}" aria-hidden="true"></progress>`;
}

// ---------- Escalón de abajo ----------

/** ¿Hay que revisar los conceptos previos antes de armar la ficha? (una vez; los escalones no tienen escalones) */
const necesitaPrevios = (c) => !c.previosRevisados && !c.escalon;

/** Arriba de la ficha: los conceptos previos que todavía no están aprendidos, con "Ya lo sé" o "Explicámelo". */
function antesDeLeer(previos, mapaId) {
    const pendientes = previos.filter((p) => p.estado !== "aprendido");
    if (!pendientes.length) return "";
    return `
        <div class="antes-de-leer">
            <h3>🪜 Antes de leer, esta ficha da por sabido:</h3>
            <ul>${pendientes.map((p) => `
                <li>
                    <strong>${esc(p.titulo)}</strong>${p.resumen ? ` <span class="ayuda">· ${esc(p.resumen)}</span>` : ""}
                    <div class="acciones">
                        <button class="boton boton--chico" data-previo-se="${esc(p.id)}">Ya lo sé</button>
                        <a class="boton boton--chico" href="${esc(direccion({ m: mapaId, c: p.id, v: "ficha" }))}">Explicámelo</a>
                    </div>
                </li>`).join("")}
            </ul>
            <p class="ayuda">Si ya lo sabés, no hace falta: seguí leyendo.</p>
        </div>`;
}

/** Un escalón de abajo: la explicación más corta posible, una pregunta para chequearse y volver al concepto. */
function panelEscalon(x, porId, mapaId, botonesEstado, listaRamas, ramas) {
    const e = x.escalon;
    const padre = porId.get(x.padre);
    return `
        <article class="ficha ficha--escalon">
            <h2><span aria-hidden="true">🪜</span> ${esc(x.titulo)}</h2>
            ${padre ? `<p class="ayuda">Escalón de abajo para entender <a href="${esc(direccion({ m: mapaId, c: padre.id, v: "ficha" }))}">${esc(padre.titulo)}</a>${e.porQue ? `: ${esc(e.porQue)}` : ""}</p>` : ""}
            <p class="ficha__idea">${esc(e.explicacion)}</p>
            <h3>Chequeate</h3>
            <p>${esc(e.pregunta)}</p>
            <details><summary>Ver la respuesta</summary><p>${esc(e.esperada)}</p></details>
            ${x.estado !== "aprendido" ? `<div class="acciones"><button class="boton" data-estado="aprendido">Ya lo entendí</button></div>` : ""}
            ${padre ? `<p><a href="${esc(direccion({ m: mapaId, c: padre.id, v: "ficha" }))}">← Volver a ${esc(padre.titulo)}</a></p>` : ""}
            ${x.estado === "aprendido" ? botonesEstado : ""}
            ${listaRamas}
            ${botonesIA(x, ramas)}
        </article>`;
}

// ---------- Esto está mal ----------

function estoEstaMal(x) {
    if (!ia.conectada()) return "";
    if (!malAbierto.has(x.id)) return `<p class="esto-esta-mal"><button class="boton boton--chico" data-mal>⚠️ Esto está mal</button></p>`;
    return `
        <form class="tarjeta formulario esto-esta-mal">
            <label>¿Qué te parece que está mal? (un dato, una fecha, un autor, algo confuso)
                <textarea name="motivo" rows="3" maxlength="${TOPES.correccionFicha}" required></textarea>
            </label>
            <div class="acciones">
                <button class="boton boton--chico" type="button" data-mal-accion="avisar">Avisarle a Esteban (no gasta IA)</button>
                <button class="boton boton--chico" type="button" data-mal-accion="rehacer">Avisar y rehacer la ficha (usa ${COSTOS_IA.ficha})</button>
                <button class="boton boton--chico" type="button" data-mal>Cancelar</button>
            </div>
        </form>`;
}

// ---------- Libros ----------

const dirLeer = (mapaId, conceptoId, parrafo) =>
    `#leer?m=${encodeURIComponent(mapaId)}&c=${encodeURIComponent(conceptoId)}${Number.isInteger(parrafo) ? `&p=${parrafo}` : ""}`;

function esLibro(mapaId) {
    try {
        return d.leerMapa(mapaId).mapa.modo === "libro";
    } catch {
        return false;
    }
}

/** Buscar palabras adentro del libro (sin IA): muestra los párrafos donde aparecen, con su capítulo. */
function buscador(mapaId) {
    const b = busquedas.get(mapaId);
    const { conceptos } = d.leerMapa(mapaId);
    const capitulo = new Map(conceptos.filter((c) => Number.isInteger(c.capitulo)).map((c) => [c.capitulo, c.id]));
    return htmlBuscador(mapaId, b, capitulo);
}

// Cada letra sin tilde, con sus variantes con tilde (así "accion" marca "acción")
const VARIANTES = { a: "aáàâä", e: "eéèêë", i: "iíìîï", o: "oóòôö", u: "uúùûü", n: "nñ", c: "cç" };

/** El párrafo escapado, con las palabras buscadas marcadas. Las palabras solo tienen letras y números (sin símbolos
 *  de expresiones regulares), y se marca después de escapar: no puede entrar HTML ajeno. */
export function marcarPalabras(texto, consulta, largo = 320) {
    const palabras = String(consulta).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9]+/).filter((p) => p.length >= 3);
    const corto = texto.length > largo ? `${texto.slice(0, largo)}…` : texto;
    let html = esc(corto);
    for (const p of palabras) {
        const patron = new RegExp(`(${[...p].map((l) => (VARIANTES[l] ? `[${VARIANTES[l]}]` : l)).join("")})`, "giu");
        html = html.replace(patron, "<mark>$1</mark>");
    }
    return html;
}

function htmlBuscador(mapaId, b, capitulo) {
    const marcar = marcarPalabras;
    return `
        <form class="buscador" data-buscar role="search">
            <label class="visualmente-oculto" for="consulta-libro">Buscar en el libro</label>
            <input id="consulta-libro" name="consulta" maxlength="${TOPES.busqueda}" placeholder="🔎 Buscar en el libro…" value="${esc(b?.consulta ?? "")}">
            <button class="boton boton--chico" type="submit">Buscar</button>
        </form>
        ${b ? `
        <div class="resultados">
            <p class="ayuda">${b.resultados.length ? `${b.resultados.length} ${b.resultados.length === 1 ? "párrafo" : "párrafos"} con "${esc(b.consulta)}"` : `Nada con "${esc(b.consulta)}". Probá con otras palabras.`}</p>
            <ol>${b.resultados.map((r) => `
                <li><a href="${esc(dirLeer(mapaId, capitulo.get(r.capitulo), r.indice))}"><strong>${esc(r.titulo)}</strong></a>
                    <p>${marcar(r.parrafo, b.consulta)}</p></li>`).join("")}
            </ol>
        </div>` : ""}`;
}
