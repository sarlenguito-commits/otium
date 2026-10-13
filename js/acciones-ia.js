// ============================================
// Lo que la app hace con la IA, en un solo lugar (las pantallas solo llaman a esto):
//   armarRamas(concepto): pide ramas nuevas, saltea las repetidas y las cuelga del mapa.
//   armarFicha(concepto): pide la ficha (chequeada con Wikipedia) y la guarda con su fuente.
//   charlar(mapa, texto): la charla del modo libre. Responde y cuelga del mapa los conceptos nuevos que aparecieron.
//   armarPrevios(concepto): el "escalón de abajo": qué conceptos previos da por sabidos la ficha. Los que ya existen
//     se enlazan; los nuevos se cuelgan del concepto como escalones (🪜) con su explicación mínima.
// Cada una deja una línea en el chat del mapa, para que la charla cuente lo que pasó.
// ============================================
import * as d from "./datos.js?v=dc7e5675b5";
import * as ia from "./ia.js?v=dc7e5675b5";
import { TOPES } from "./config.js?v=dc7e5675b5";

/** Deja una línea en el chat del mapa; si no se puede (por ejemplo, el chat llegó a su tope), no frena la acción. */
function contarEnElChat(mapaId, mensaje) {
    try {
        d.agregarMensaje(mapaId, { quien: "app", ...mensaje });
    } catch (e) {
        d.anotarError(`Chat: ${e.message}`);
    }
}

/** Cuelga ramas nuevas de un concepto. Devuelve las que se agregaron. */
export async function armarRamas(conceptoId) {
    const concepto = d.leerConcepto(conceptoId);
    const { mapa } = d.leerMapa(concepto.mapa);
    const existentes = d.ramasDe(conceptoId).map((r) => r.titulo);
    const lugar = TOPES.ramasPorConcepto - existentes.length;
    if (lugar <= 0) throw new Error(`"${concepto.titulo}" ya tiene ${TOPES.ramasPorConcepto} ramas.`);
    const propuestas = await ia.pedirRamas({ tema: mapa.tema, camino: d.caminoDe(conceptoId), existentes });
    // Saltear repetidas (también entre ellas) y no pasarse del tope de ramas
    const vistos = new Set(existentes.map((t) => t.toLowerCase()));
    const nuevas = propuestas.filter((r) => !vistos.has(r.titulo.toLowerCase()) && vistos.add(r.titulo.toLowerCase())).slice(0, lugar);
    if (!nuevas.length) throw new Error("La IA propuso ramas que ya estaban. Probá de nuevo.");
    const agregadas = d.agregarRamas(conceptoId, nuevas);
    if (concepto.estado === "sin_abrir") d.cambiarEstado(conceptoId, "en_curso");
    contarEnElChat(concepto.mapa, {
        texto: `Armé ${agregadas.length} ${agregadas.length === 1 ? "rama" : "ramas"} para "${concepto.titulo}": ${agregadas.map((r) => r.titulo).join(", ")}. Elegí la que quieras abrir.`,
        concepto: conceptoId,
    });
    return agregadas;
}

const recientes = () => d.aprendidos().sort((a, b) => b.aprendido - a.aprendido).slice(0, TOPES.aprendidosParaIA);

/** El escalón de abajo. Devuelve los conceptos previos que todavía no están aprendidos. */
export async function armarPrevios(conceptoId) {
    const concepto = d.leerConcepto(conceptoId);
    const yaSabidos = recientes();
    // Si es un capítulo de un libro, la IA ve el principio del capítulo para saber qué da por sabido
    const texto = Number.isInteger(concepto.capitulo) ? d.textoParaIA(conceptoId, TOPES.textoPreviosIA) : "";
    const lista = await ia.pedirPrevios({ concepto: concepto.titulo, camino: d.caminoDe(conceptoId), aprendidos: yaSabidos.map((c) => c.titulo), texto });
    const { conceptos } = d.leerMapa(concepto.mapa);
    // Lo que está en el camino (el tema, la rama madre) es el contexto, no un concepto previo
    const enElCamino = new Set(d.caminoDe(conceptoId).map((t) => t.toLowerCase()));
    const ids = [...concepto.prerrequisitos];
    const nuevos = [];
    let lugar = TOPES.ramasPorConcepto - d.ramasDe(conceptoId).length;
    for (const p of lista) {
        if (enElCamino.has(p.titulo.toLowerCase())) continue;
        const igual = (c) => c.titulo.toLowerCase() === p.titulo.toLowerCase();
        const existente = conceptos.find(igual) ?? d.aprendidos().find(igual);
        if (existente) {
            if (existente.id !== conceptoId && !ids.includes(existente.id)) ids.push(existente.id);
            // Si existía sin explicación, se le guarda la del escalón (así "Explicámelo" tiene qué mostrar)
            if (!existente.ficha && !existente.escalon) d.ponerEscalon(existente.id, p);
        } else if (lugar > 0 && !nuevos.some(igual)) {
            nuevos.push(p);
            lugar--;
        }
    }
    if (nuevos.length) {
        const creados = d.agregarRamas(conceptoId, nuevos.map((p) => ({ titulo: p.titulo, resumen: p.porQue, escalon: p })));
        ids.push(...creados.map((c) => c.id));
    }
    d.ponerPrerrequisitos(conceptoId, ids.slice(0, TOPES.prerrequisitos));
    d.marcarPreviosRevisados(conceptoId);
    const pendientes = d.leerConcepto(conceptoId).prerrequisitos.map((id) => d.leerConcepto(id)).filter((c) => c.estado !== "aprendido");
    if (pendientes.length) {
        contarEnElChat(concepto.mapa, {
            texto: `Antes de "${concepto.titulo}" conviene saber: ${pendientes.map((c) => c.titulo).join(", ")}. Si ya lo sabés, marcalo; si no, te lo explico en corto.`,
            concepto: conceptoId,
        });
    }
    return pendientes;
}

/** Para comparar títulos sin que importen mayúsculas, tildes ni espacios de más. */
const igualar = (t) => String(t ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
const recortar = (t, n) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);

/** La charla con la IA. Guarda tu mensaje y la respuesta, y cuelga del mapa los conceptos nuevos (⚪) donde van.
 *  A la IA va SOLO la charla (mensajes marcados "charla"): las notas viejas del chat no salen del navegador.
 *  Devuelve { respuesta, nuevos } (nuevos: los conceptos que se agregaron al mapa). */
export async function charlar(mapaId, texto) {
    const { mapa, conceptos, mensajes } = d.leerMapa(mapaId);
    // Lugar para tu mensaje, la respuesta y el aviso (así no se gasta cupo en una respuesta que no se puede guardar)
    if (mensajes.length + 3 > TOPES.mensajesPorMapa) throw new Error(`El chat de este mapa llegó a ${TOPES.mensajesPorMapa} mensajes: seguí la charla en un mapa nuevo.`);
    const raiz = conceptos.find((c) => !c.padre);
    // Lo anterior de la charla (recortado) y el mensaje nuevo entero
    const antes = mensajes.filter((m) => m.charla).slice(-(TOPES.turnosCharla - 1))
        .map((m) => ({ quien: m.quien, texto: recortar(m.texto, TOPES.turnoCharlaContexto) }));
    const nuevo = d.agregarMensaje(mapaId, { quien: "vos", texto, charla: true });
    const nivel = (c) => d.caminoDe(c.id).length;
    const existentes = conceptos.filter((c) => c.padre).sort((a, b) => nivel(a) - nivel(b) || a.orden - b.orden)
        .slice(0, TOPES.existentesCharla).map((c) => c.titulo);
    const { respuesta, conceptos: propuestos } = await ia.pedirCharla({
        tema: mapa.tema, existentes, turnos: [...antes, { quien: "vos", texto: nuevo.texto }],
    });

    // Colgar lo nuevo: sin repetir lo que ya está (en cualquier parte del mapa); del padre que dijo la IA o, si no
    // existe o no tiene lugar (tope de ramas o de niveles), de la raíz
    const porTitulo = new Map(conceptos.map((c) => [igualar(c.titulo), c]));
    const nuevos = [];
    for (const p of propuestos) {
        if (porTitulo.has(igualar(p.titulo))) continue;
        const padre = porTitulo.get(igualar(p.padre)) ?? raiz;
        for (const destino of padre.id === raiz.id ? [raiz] : [padre, raiz]) {
            try {
                const [c] = d.agregarRamas(destino.id, [{ titulo: p.titulo, resumen: p.resumen }]);
                nuevos.push(c);
                porTitulo.set(igualar(c.titulo), c);
                break;
            } catch {
                // sin lugar ahí: se prueba en la raíz (o se saltea)
            }
        }
    }
    d.agregarMensaje(mapaId, { quien: "app", texto: respuesta, charla: true, concepto: nuevos[0]?.id ?? null });
    if (nuevos.length) {
        contarEnElChat(mapaId, {
            texto: `Colgué del mapa ${nuevos.length === 1 ? "un concepto nuevo" : `${nuevos.length} conceptos nuevos`}: ${nuevos.map((c) => c.titulo).join(", ")}. Están en ⚪: abrilos cuando quieras.`,
            concepto: nuevos[0].id,
        });
    }
    return { respuesta, nuevos };
}

/** Arma y guarda la ficha de un concepto (o la rehace, si viene "correccion": qué estaba mal). */
export async function armarFicha(conceptoId, { correccion = "" } = {}) {
    const concepto = d.leerConcepto(conceptoId);
    const aprendidos = recientes().map((c) => c.titulo);
    // Capítulo de un libro: la fuente es el texto del capítulo (recortado), no Wikipedia
    const esCapitulo = Number.isInteger(concepto.capitulo);
    const libro = esCapitulo ? d.leerLibro(concepto.mapa).titulo : "";
    const texto = esCapitulo ? d.textoParaIA(conceptoId) : "";
    const { ficha, fuente } = await ia.pedirFicha({ concepto: concepto.titulo, camino: d.caminoDe(conceptoId), aprendidos, correccion, texto, libro });
    const deLibro = esCapitulo ? { libro, capitulo: concepto.titulo } : null;
    const guardado = d.guardarFicha(conceptoId, { ...ficha, fuente, deLibro });
    if (concepto.estado === "sin_abrir") d.cambiarEstado(conceptoId, "en_curso");
    contarEnElChat(concepto.mapa, {
        texto: `${correccion ? "Rehice" : "Te dejé"} la ficha de "${concepto.titulo}"${esCapitulo ? `, armada con el texto del capítulo` : fuente ? `, chequeada con el artículo de Wikipedia "${fuente.titulo}"` : ""}. Leela y después probá contestar sus preguntas sin mirar.`,
        concepto: conceptoId,
    });
    return guardado;
}

