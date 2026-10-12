// ============================================
// Leer un EPUB en el navegador, sin librerías: un EPUB es un ZIP con páginas web adentro.
//   1. Se lee el índice del ZIP (el "directorio central") y se descomprime cada archivo con DecompressionStream.
//   2. META-INF/container.xml dice dónde está el .opf: ahí están el título, el autor y el orden de los capítulos.
//   3. Cada capítulo (XHTML) se pasa a texto plano por párrafos.
// Si el libro tiene DRM (META-INF/encryption.xml con contenido cifrado), se rechaza: no se intenta sacarlo.
// Devuelve { titulo, autor, capitulos: [{ titulo, parrafos: [texto] }] }.
// ============================================
import { TOPES } from "./config.js?v=b86f2e9674";

const texto = new TextDecoder("utf-8");

// ---------- ZIP ----------
function leerZip(bytes) {
    const vista = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    // Fin del directorio central: firma 0x06054b50, buscando desde el final (puede haber un comentario)
    let fin = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65535); i--) {
        if (vista.getUint32(i, true) === 0x06054b50) {
            fin = i;
            break;
        }
    }
    if (fin < 0) throw new Error("El archivo no es un EPUB válido (no se pudo leer como ZIP).");
    const cantidad = vista.getUint16(fin + 10, true);
    let p = vista.getUint32(fin + 16, true);
    const entradas = new Map();
    for (let n = 0; n < cantidad; n++) {
        if (p + 46 > bytes.length || vista.getUint32(p, true) !== 0x02014b50) throw new Error("El EPUB está dañado (índice del ZIP roto).");
        const metodo = vista.getUint16(p + 10, true);
        const comprimido = vista.getUint32(p + 20, true);
        const largoNombre = vista.getUint16(p + 28, true);
        const largoExtra = vista.getUint16(p + 30, true);
        const largoComentario = vista.getUint16(p + 32, true);
        const local = vista.getUint32(p + 42, true);
        const nombre = texto.decode(bytes.subarray(p + 46, p + 46 + largoNombre));
        entradas.set(nombre, { metodo, comprimido, local });
        p += 46 + largoNombre + largoExtra + largoComentario;
    }
    return { vista, bytes, entradas };
}

async function leerEntrada(zip, nombre) {
    const e = zip.entradas.get(nombre);
    if (!e) return null;
    const { vista, bytes } = zip;
    if (vista.getUint32(e.local, true) !== 0x04034b50) throw new Error("El EPUB está dañado.");
    const inicio = e.local + 30 + vista.getUint16(e.local + 26, true) + vista.getUint16(e.local + 28, true);
    const datos = bytes.subarray(inicio, inicio + e.comprimido);
    if (e.metodo === 0) return datos;
    if (e.metodo !== 8) throw new Error("El EPUB usa una compresión que esta app no conoce.");
    const flujo = new Blob([datos]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(flujo).arrayBuffer());
}

const leerTexto = async (zip, nombre) => {
    const b = await leerEntrada(zip, nombre);
    return b ? texto.decode(b) : null;
};

/** "OEBPS/content.opf" + "../Text/cap1.xhtml" → "OEBPS/Text/cap1.xhtml" (sin #ancla ni %20). */
function resolver(base, relativo) {
    const partes = base.split("/").slice(0, -1);
    for (const p of decodeURIComponent(relativo.split("#")[0]).split("/")) {
        if (p === "..") partes.pop();
        else if (p && p !== ".") partes.push(p);
    }
    return partes.join("/");
}

// ---------- Capítulos a texto ----------
const xml = (s) => new DOMParser().parseFromString(s, "application/xml");
const limpio = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

function parrafosDe(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("script, style, nav, svg, img").forEach((el) => el.remove());
    const titulo = limpio(doc.querySelector("h1, h2, h3")?.textContent) || limpio(doc.querySelector("title")?.textContent);
    const bloques = [...doc.querySelectorAll("p, li, blockquote, h1, h2, h3, h4, dd, pre")];
    let parrafos = bloques.filter((b) => !b.querySelector("p, li, blockquote")).map((b) => limpio(b.textContent)).filter((t) => t.length > 1);
    if (!parrafos.length) parrafos = limpio(doc.body?.textContent).split(/(?<=[.!?])\s{2,}/).filter(Boolean);
    return { titulo, parrafos };
}

/** Lee un EPUB (ArrayBuffer o Uint8Array). Tira un Error con un mensaje para la persona si no se puede. */
export async function leerEpub(entrada) {
    const bytes = entrada instanceof Uint8Array ? entrada : new Uint8Array(entrada);
    if (bytes.length > TOPES.epubBytes) throw new Error(`El EPUB es muy grande (hasta ${Math.round(TOPES.epubBytes / 1e6)} MB).`);
    const zip = leerZip(bytes);

    // DRM: el texto de los capítulos cifrado (o la marca de Adobe). Las letras (fuentes) ofuscadas no son DRM.
    const cifrado = await leerTexto(zip, "META-INF/encryption.xml");
    const cifradas = cifrado ? [...xml(cifrado).getElementsByTagName("*")].filter((el) => el.localName === "CipherReference").map((el) => el.getAttribute("URI") ?? "") : [];
    if (zip.entradas.has("META-INF/rights.xml") || cifradas.some((u) => /\.(x?html?|xml|opf|ncx)$/i.test(u))) {
        throw new Error("Este EPUB tiene DRM (protección anticopia): OTIUM no puede leerlo. Probá con uno sin DRM o de dominio público.");
    }
    const contenedor = await leerTexto(zip, "META-INF/container.xml");
    const rutaOpf = contenedor && xml(contenedor).querySelector("rootfile")?.getAttribute("full-path");
    if (!rutaOpf) throw new Error("El archivo no parece un EPUB (falta META-INF/container.xml).");
    const opfTexto = await leerTexto(zip, rutaOpf);
    if (!opfTexto) throw new Error("El EPUB está incompleto (no se encuentra el índice del libro).");
    const opf = xml(opfTexto);
    const meta = (nombre) => limpio([...opf.getElementsByTagName("*")].find((el) => el.localName === nombre)?.textContent);
    const titulo = meta("title").slice(0, TOPES.tema) || "Libro sin título";
    const autor = meta("creator").slice(0, TOPES.autorNombre);

    const manifiesto = new Map([...opf.getElementsByTagName("*")].filter((el) => el.localName === "item").map((el) => [el.getAttribute("id"), el.getAttribute("href")]));
    const orden = [...opf.getElementsByTagName("*")].filter((el) => el.localName === "itemref").map((el) => manifiesto.get(el.getAttribute("idref"))).filter(Boolean);

    const capitulos = [];
    let total = 0;
    for (const href of orden) {
        const html = await leerTexto(zip, resolver(rutaOpf, href));
        if (!html) continue;
        const { titulo: t, parrafos } = parrafosDe(html);
        const largo = parrafos.join(" ").length;
        if (largo < TOPES.capituloMinimo) continue; // tapa, índice, páginas en blanco
        total += largo;
        if (total > TOPES.libroLetras) throw new Error(`El libro es muy largo para esta versión (hasta ${Math.round(TOPES.libroLetras / 1000)} mil letras).`);
        capitulos.push({ titulo: (t || `Parte ${capitulos.length + 1}`).slice(0, TOPES.tituloConcepto), parrafos });
        if (capitulos.length >= TOPES.capitulosPorLibro) break;
    }
    if (!capitulos.length) throw new Error("No se encontró texto en el EPUB (¿son solo imágenes?).");
    return { titulo, autor, capitulos };
}
