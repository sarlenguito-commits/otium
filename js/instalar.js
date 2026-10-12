// ============================================
// Instalar OTIUM como app (PWA). Chrome, Edge y Brave avisan cuando se puede (beforeinstallprompt): se guarda ese
// aviso para ofrecer el botón en Ajustes. Safari y Firefox no avisan: ahí se explica cómo hacerlo a mano.
// ============================================
let aviso = null;

export function prepararInstalacion() {
    addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault(); // que no salga el cartel del navegador de golpe: se ofrece en Ajustes
        aviso = e;
    });
    addEventListener("appinstalled", () => (aviso = null));
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
}

/** ¿Ya se abrió como app instalada? */
export const instalada = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

/** ¿El navegador ofrece instalarla ahora? */
export const sePuedeInstalar = () => !!aviso;

/** Muestra el cartel del navegador. Devuelve true si la persona aceptó. */
export async function instalar() {
    if (!aviso) return false;
    const a = aviso;
    aviso = null;
    a.prompt();
    const { outcome } = await a.userChoice;
    return outcome === "accepted";
}
