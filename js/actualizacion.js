// ============================================
// Aviso de versión nueva (12/10/2026): OTIUM no se recarga sola al cambiar de pantalla, así que una pestaña (o la app
// instalada) abierta desde ayer seguía con la versión vieja. Cada 15 minutos, y al volver a la pestaña, se pide el
// index.html publicado y se compara la huella de js/app.js?v=… (la pone armar-sitio.ps1) con la que está corriendo.
// Si cambió: un cartel "Hay una versión nueva" con el botón "Actualizar" (recarga; lo que se estaba escribiendo se
// guarda solo al cerrar la página, ver "pagehide" en escribir.js y cerebro.js). En la PC de desarrollo no hay huella:
// no se revisa nada.
// ============================================
const CADA_MINUTOS = 15;
const MINIMO_ENTRE_REVISIONES = 5 * 60000; // al volver a la pestaña, no más de una vez cada 5 minutos

/** La huella de app.js dentro de un texto (el src del script o el index.html entero); null si no tiene. */
export function huellaDe(texto) {
    return String(texto ?? "").match(/js\/app\.js\?v=([0-9a-f]+)/)?.[1] ?? null;
}

export function vigilarVersion() {
    const actual = huellaDe(document.querySelector('script[type="module"][src*="app.js"]')?.getAttribute("src"));
    if (!actual) return;
    let ultima = Date.now();
    let avisado = false;
    const revisar = async () => {
        if (avisado || !navigator.onLine) return;
        ultima = Date.now();
        try {
            // "reload": va a la red y deja guardado lo nuevo, así el botón "Actualizar" recarga la versión nueva
            const r = await fetch("./", { cache: "reload" });
            const nueva = r.ok ? huellaDe(await r.text()) : null;
            if (nueva && nueva !== actual) {
                avisado = true;
                mostrarCartel();
            }
        } catch {
            // sin red o GitHub caído: se prueba en la próxima vuelta
        }
    };
    setInterval(revisar, CADA_MINUTOS * 60000);
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && Date.now() - ultima > MINIMO_ENTRE_REVISIONES) revisar();
    });
}

export function mostrarCartel() {
    const cartel = document.createElement("div");
    cartel.className = "version-nueva";
    cartel.setAttribute("role", "status");
    cartel.innerHTML = `
        <span>Hay una versión nueva de OTIUM.</span>
        <button class="boton boton--chico" type="button" data-actualizar>Actualizar</button>
        <button class="version-nueva__cerrar" type="button" aria-label="Ahora no" title="Ahora no">✕</button>`;
    cartel.querySelector("[data-actualizar]").addEventListener("click", () => location.reload());
    cartel.querySelector(".version-nueva__cerrar").addEventListener("click", () => cartel.remove());
    document.body.append(cartel);
}
