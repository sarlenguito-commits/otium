// ============================================
// Cliente del servidor de la IA (servidor\ en Cloudflare). La app NUNCA tiene la clave de la IA: solo la dirección
// del servidor y el token de la app, que se cargan una vez en Ajustes y quedan en este navegador.
// Los pedidos: pedirRamas, pedirFicha y pedirCupo. Cada respuesta trae el cupo del día, que se recuerda para mostrar
// la barrita sin volver a preguntar.
// ============================================
import { PREFIJO, SERVIDOR_IA } from "./config.js?v=c366a4baa6";

let prefijo = PREFIJO;
let buscar = (...a) => fetch(...a);

/** Para las pruebas: otro lugar de guardado y un fetch de mentira. */
export function usarPruebas({ prefijo: p = PREFIJO, buscar: b = null } = {}) {
    prefijo = p;
    buscar = b ?? ((...a) => fetch(...a));
}

const clave = (n) => `${prefijo}-${n}`;

function leer(n) {
    try {
        return JSON.parse(localStorage.getItem(clave(n)) ?? "null");
    } catch {
        return null;
    }
}

function guardar(n, v) {
    try {
        if (v === null) localStorage.removeItem(clave(n));
        else localStorage.setItem(clave(n), JSON.stringify(v));
        return true;
    } catch {
        return false;
    }
}

// ---------- Conexión (dirección + token) ----------
export function leerConexion() {
    const c = leer("conexion") ?? {};
    return { servidor: c.servidor || SERVIDOR_IA, token: c.token || "" };
}

export const conectada = () => !!leerConexion().token;

/** La dirección: siempre https. Se guarda solo el origen (sin rutas). */
export function limpiarServidor(texto) {
    let u;
    try {
        u = new URL(String(texto ?? "").trim());
    } catch {
        throw new Error("La dirección del servidor no es válida.");
    }
    if (u.protocol !== "https:") throw new Error("La dirección del servidor tiene que empezar con https://");
    return u.origin;
}

/** El token: letras, números, - y _, de 16 a 200. Vacío = dejar el que había. */
export function limpiarToken(texto) {
    const t = String(texto ?? "").trim();
    if (!/^[A-Za-z0-9_-]{16,200}$/.test(t)) throw new Error("El token no tiene el formato esperado (se copia del archivo privado).");
    return t;
}

export function guardarConexion({ servidor, token } = {}) {
    const actual = leerConexion();
    const nueva = {
        servidor: servidor === undefined ? actual.servidor : limpiarServidor(servidor),
        token: token === undefined || String(token).trim() === "" ? actual.token : limpiarToken(token),
    };
    if (!guardar("conexion", nueva)) throw new Error("No se pudo guardar en este navegador.");
    return { servidor: nueva.servidor, conToken: !!nueva.token };
}

export function borrarToken() {
    guardar("conexion", { ...leerConexion(), token: "" });
    guardar("cupo", null);
}

// ---------- Cupo (lo último que dijo el servidor) ----------
export const ultimoCupo = () => leer("cupo");

/** "Usaste 10 %" con lo que gastaría un pedido: si no alcanza, avisa antes de pedir. */
export function alcanza(costo) {
    const c = ultimoCupo();
    return !c || c.usado + costo <= c.total;
}

// ---------- Pedidos ----------
async function llamar(ruta, cuerpo) {
    const { servidor, token } = leerConexion();
    if (!token) throw new Error("Falta conectar la IA: cargá el token en Ajustes.");
    let r;
    try {
        r = await buscar(servidor + ruta, {
            method: cuerpo ? "POST" : "GET",
            headers: { "Content-Type": "application/json", "X-Otium-Token": token },
            body: cuerpo ? JSON.stringify(cuerpo) : undefined,
            signal: AbortSignal.timeout(60_000),
        });
    } catch {
        throw new Error("No se pudo conectar con el servidor de la IA. ¿Hay internet?");
    }
    const datos = await r.json().catch(() => null);
    if (datos?.cupo) guardar("cupo", datos.cupo);
    if (!r.ok) throw new Error(datos?.error ?? `El servidor de la IA respondió ${r.status}.`);
    return datos;
}

export async function pedirCupo() {
    return (await llamar("/cupo")).cupo;
}

/** Ramas nuevas para un concepto: tema del mapa, camino desde la raíz y las que ya existen (para no repetir). */
export async function pedirRamas({ tema, camino = [], existentes = [] }) {
    return (await llamar("/ramas", { tema, camino, existentes })).resultado;
}

/** Un comentario para Esteban ("comentario" o "error"). No gasta cupo de IA. */
export async function pedirComentario({ tipo = "comentario", texto, concepto = "", mapa = "" }) {
    await llamar("/comentario", { tipo, texto, concepto, mapa });
}

/** Corrige tu respuesta a una pregunta: { veredicto: "bien" | "masomenos" | "mal", comentario, pista }. */
export async function pedirCorreccion({ concepto, pregunta, esperada, respuesta }) {
    return (await llamar("/corregir", { concepto, pregunta, esperada, respuesta })).resultado;
}

/** "Contalo": tu explicación contra lo central de la ficha: { veredicto, bien, falta, confusion }. */
export async function pedirContalo({ concepto, idea, definicion, errorComun = "", explicacion }) {
    return (await llamar("/contalo", { concepto, idea, definicion, errorComun, explicacion })).resultado;
}

/** Feynman: una vuelta de la charla con el personaje: { tipo: "pregunta" | "cierre", texto, entendiste, hueco }. */
export async function pedirFeynman({ concepto, idea, definicion, personaje, turnos, terminar = false }) {
    return (await llamar("/feynman", { concepto, idea, definicion, personaje, turnos, terminar })).resultado;
}

/** Conceptos previos que la ficha da por sabidos (0 a 3), cada uno con su explicación mínima. */
export async function pedirPrevios({ concepto, camino = [], aprendidos = [], texto = "" }) {
    return (await llamar("/previos", { concepto, camino, aprendidos, texto })).resultado;
}

/** Una parte de un libro dicha con otras palabras (al leer): { explicacion }. */
export async function pedirExplicacion({ concepto, texto, contexto = "", libro = "" }) {
    return (await llamar("/explicar", { concepto, texto, contexto, libro })).resultado;
}

/** Reescribe un pedazo, un párrafo o todo un escrito con una instrucción: { texto }. */
export async function pedirReescritura({ alcance, texto, instruccion, contexto = "" }) {
    return (await llamar("/reescribir", { alcance, texto, instruccion, contexto })).resultado;
}

/** La ficha de un concepto (el servidor la chequea con Wikipedia y la valida). Devuelve { ficha, fuente }. */
export async function pedirFicha({ concepto, camino = [], aprendidos = [], correccion = "", texto = "", libro = "" }) {
    const r = await llamar("/ficha", { concepto, camino, aprendidos, correccion, texto, libro });
    return { ficha: r.resultado, fuente: r.fuente };
}
