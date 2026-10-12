// ============================================
// Lo que la app hace con la IA, en un solo lugar (las pantallas solo llaman a esto):
//   armarRamas(concepto): pide ramas nuevas, saltea las repetidas y las cuelga del mapa.
//   armarFicha(concepto): pide la ficha (chequeada con Wikipedia) y la guarda con su fuente.
//   armarPrevios(concepto): el "escalón de abajo": qué conceptos previos da por sabidos la ficha. Los que ya existen
//     se enlazan; los nuevos se cuelgan del concepto como escalones (🪜) con su explicación mínima.
// Cada una deja una línea en el chat del mapa, para que la charla cuente lo que pasó.
// ============================================
import * as d from "./datos.js?v=f718b9a529";
import * as ia from "./ia.js?v=f718b9a529";
import { TOPES } from "./config.js?v=f718b9a529";

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

