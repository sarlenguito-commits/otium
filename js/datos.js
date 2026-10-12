// ============================================
// Capa de datos: la ÚNICA puerta a los datos para las pantallas. Valida (reglas.js) y controla permisos (exigir).
// Hoy: modo prueba, todo en el navegador (datos/local/).
// Para pasar a Firebase: armar datos/firebase/ con los mismos archivos y las mismas funciones, y cambiar esta línea
// (receta firebase.md de Visual Script). Las pantallas no se enteran.
// ============================================

export * from "./datos/local/index.js?v=0c5d6339d6";
export const modo = "local";
