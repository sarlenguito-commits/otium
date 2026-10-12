// ============================================
// Service worker: lo que permite instalar OTIUM y abrirla sin internet.
// Primero la red (con internet, siempre lo último publicado); si no hay red, lo último que se guardó.
// Solo guarda archivos de la misma app (nada de la IA, Wikcionario ni otros sitios).
// armar-sitio.ps1 cambia 068461cf66 por la huella de cada publicación: así el navegador toma el nuevo y borra lo viejo.
// ============================================
const CACHE = "otium-068461cf66";
const INICIO = "./";

self.addEventListener("install", (e) => {
    e.waitUntil(caches.open(CACHE).then((c) => c.add(INICIO)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
    e.waitUntil(
        caches.keys()
            .then((nombres) => Promise.all(nombres.filter((n) => n.startsWith("otium-") && n !== CACHE).map((n) => caches.delete(n))))
            .then(() => self.clients.claim()),
    );
});

self.addEventListener("fetch", (e) => {
    const pedido = e.request;
    if (pedido.method !== "GET" || new URL(pedido.url).origin !== self.location.origin) return;
    e.respondWith(
        fetch(pedido)
            .then((respuesta) => {
                if (respuesta.ok) {
                    const copia = respuesta.clone();
                    caches.open(CACHE).then((c) => c.put(pedido, copia));
                }
                return respuesta;
            })
            .catch(async () => (await caches.match(pedido)) ?? (pedido.mode === "navigate" ? caches.match(INICIO) : Response.error())),
    );
});
