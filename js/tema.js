// ============================================
// Tema claro u oscuro ANTES de dibujar (script común, no módulo: así no hay un destello del tema equivocado).
// Lo elegido se guarda con el prefijo del <html data-prefijo="…">; si no eligió nada, sigue al celular.
// ============================================
(function () {
    var raiz = document.documentElement;
    var clave = (raiz.getAttribute("data-prefijo") || "app") + "-tema";
    var guardado = null;
    try {
        guardado = localStorage.getItem(clave);
    } catch (e) {
        // sin guardado: sigue al celular
    }
    var oscuro = guardado ? guardado === "oscuro" : matchMedia("(prefers-color-scheme: dark)").matches;
    raiz.setAttribute("data-tema", oscuro ? "oscuro" : "claro");
    window.cambiarTema = function () {
        var nuevo = raiz.getAttribute("data-tema") === "oscuro" ? "claro" : "oscuro";
        raiz.setAttribute("data-tema", nuevo);
        try {
            localStorage.setItem(clave, nuevo);
        } catch (e) {
            // no se guarda, pero cambia igual
        }
        return nuevo;
    };
})();
