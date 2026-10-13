// ============================================
// Tema ANTES de dibujar (script común, no módulo: así no hay un destello del tema equivocado).
// Cuatro temas, dos claros y dos oscuros (pedido de Esteban, 12/10/2026): claro (blanco), sepia, oscuro (marrón) y
// azul (azul oscuro). Lo elegido se guarda con el prefijo del <html data-prefijo="…">; si no eligió nada, sigue al
// celular (claro u oscuro). Los colores de cada uno están en styles/style.css ([data-tema=…]).
// ============================================
(function () {
    var raiz = document.documentElement;
    var clave = (raiz.getAttribute("data-prefijo") || "app") + "-tema";
    var TEMAS = ["claro", "sepia", "oscuro", "azul"];
    var guardado = null;
    try {
        guardado = localStorage.getItem(clave);
    } catch (e) {
        // sin guardado: sigue al celular
    }
    if (TEMAS.indexOf(guardado) === -1) guardado = matchMedia("(prefers-color-scheme: dark)").matches ? "oscuro" : "claro";
    raiz.setAttribute("data-tema", guardado);
    window.TEMAS = TEMAS;
    window.temaActual = function () {
        return raiz.getAttribute("data-tema");
    };
    /** Pone el tema pedido (uno de TEMAS); sin uno válido, alterna entre claro y oscuro como antes. */
    window.cambiarTema = function (pedido) {
        var nuevo = TEMAS.indexOf(pedido) !== -1 ? pedido : raiz.getAttribute("data-tema") === "oscuro" ? "claro" : "oscuro";
        raiz.setAttribute("data-tema", nuevo);
        try {
            localStorage.setItem(clave, nuevo);
        } catch (e) {
            // no se guarda, pero cambia igual
        }
        return nuevo;
    };
})();
