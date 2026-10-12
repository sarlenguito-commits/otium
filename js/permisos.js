// ============================================
// Permisos: quién puede qué. Una función con nombre claro por regla.
// Se usan en las pantallas (mostrar u ocultar) Y en la capa de datos con exigir() (que de verdad no se pueda).
// Hoy la app es de una sola persona: el dueño puede todo. Si algún día hay más personas, se agregan reglas acá.
// ============================================

const activo = (u) => !!u && u.activo !== false;

export const esDueno = (u) => activo(u) && u.rol === "dueno";

/** Crear mapas, abrir ramas, guardar fichas, charlar: el dueño. */
export const puedeEstudiar = (u) => esDueno(u);

/** Archivar un mapa (nunca borrar): el dueño. */
export const puedeArchivar = (u) => esDueno(u);

/** Volver a los datos de ejemplo (solo mientras la app esté en etapa de ejemplo): el dueño. */
export const puedeReiniciar = (u) => esDueno(u);
