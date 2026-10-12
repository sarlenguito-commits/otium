// ============================================
// Configuración: las listas fijas y los números de la app. Lo primero que se cambia al copiar el molde.
// Regla: una clave usada NUNCA se borra ni se renombra (se cambia el texto que se muestra, no la clave).
// ============================================

export const NOMBRE_APP = "OTIUM"; // nombre elegido por Esteban (11/10/2026)
export const VERSION = "0.7.0"; // subirla con cada entrega y anotarla en CAMBIOS.md

// Prefijo de todo lo que se guarda en el navegador. Único por app: dos apps en el mismo dominio
// (usuario.github.io/app-1 y /app-2) comparten el guardado. Tiene que ser igual a data-prefijo del index.html.
export const PREFIJO = "otium";

// Subirla cuando cambia la forma de los datos de ejemplo: el navegador vuelve a arrancar con datos-prueba.js.
// Ojo: en esta etapa los datos son de ejemplo; cuando haya datos de verdad, cambiar la forma pide migrarlos.
export const VERSION_DATOS = 4;

// El servidor de la IA (Cloudflare). No es secreto: sin el token de la app (Ajustes) no responde.
export const SERVIDOR_IA = "https://otium-ia.otium-servidor.workers.dev";

// Cuánto del cupo diario gasta cada pedido (igual que COSTOS en servidor/src/index.js: el que manda es el servidor).
export const COSTOS_IA = { ramas: 1, ficha: 3, corregir: 1, contalo: 1, previos: 1, feynman: 1, explicar: 1, reescribir: 1 };
// Reescribir cuesta según cuánto: un pedazo o un párrafo, 1; el texto entero, 2
export const COSTO_REESCRIBIR = { seleccion: 1, parrafo: 1, todo: 2 };

// Colores para resaltar al leer (tonos pastel que se leen bien en el fondo marrón oscuro y en el claro).
export const COLORES_RESALTADO = { azul: "Azul", rojo: "Rojo", verde: "Verde" };

// Planes de uso de la IA (por ahora todos gratis): cuánto cupo por día tiene cada uno. Si algún día hay planes
// pagos, se suman acá; los precios los decide Esteban.
export const PLANES = {
    dueno: { nombre: "Dueño", cupo: 60 },
    prueba: { nombre: "Prueba gratis", cupo: 30 },
};

// Feynman: a quién se lo explicás.
export const PERSONAJES = { chico: "un chico de 7 años", abuela: "una abuela de 80" };

// Roles: la app es de una sola persona (Esteban). Lo que puede está en permisos.js.
export const ROLES = {
    dueno: { nombre: "Dueño" },
};

// Cómo se arma un mapa: el modo guiado propone el árbol; el libre cuelga los conceptos de la charla.
export const MODOS = { guiado: "Guiado", libre: "Libre", libro: "Libro" };

// Estado de cada concepto del mapa (los íconos van en las pantallas).
export const ESTADOS = { sin_abrir: "Sin abrir", en_curso: "En curso", aprendido: "Aprendido" };

// Cuán segura está la IA de un dato (autores, fechas, influencias).
export const CERTEZAS = { seguro: "seguro", bastante: "bastante seguro", dudoso: "dudoso" };

// ¿Se sostiene hoy?
export const VIGENCIAS = { vigente: "Vigente", discutido: "Discutido", superado: "Superado" };

// Quién habla en el chat.
export const HABLANTES = { app: "App", vos: "Vos" };

// Repaso espaciado (tipo Leitner): días hasta el próximo repaso según el escalón de la tarjeta.
// "Me salió" sube un escalón, "más o menos" repite el intervalo, "no me salió" vuelve al primero.
export const INTERVALOS = [1, 3, 7, 14, 30, 60];
export const RESULTADOS = { bien: "Me salió", masomenos: "Más o menos", mal: "No me salió" };

// Temporizador (opcional): bloques de foco y descanso en minutos, o "flow" (sin cortes, avisa a los 90 minutos).
export const TEMPORIZADORES = {
    p25: { nombre: "25 / 5", foco: 25, descanso: 5 },
    p50: { nombre: "50 / 10", foco: 50, descanso: 10 },
    flow: { nombre: "Modo flow", aviso: 90 },
};

// Lo que se puede cambiar en Ajustes, con su valor de arranque.
export const AJUSTES_INICIALES = { metaSemanal: 3, topeRepasos: 20, temporizador: "p25" };

// Topes: todo lo que se guarda tiene uno.
export const TOPES = {
    tema: 80, // letras del tema de un mapa
    tituloConcepto: 80,
    resumenConcepto: 200, // la línea que explica cada rama
    idea: 300,
    definicion: 500,
    textoFicha: 600, // origen, influencias, por qué de la vigencia
    autorNombre: 80,
    autorDijo: 400,
    autores: 6, // autores por ficha
    analogia: 400,
    noSeParece: 200,
    aviso: 300, // la línea fija de temas sensibles
    errorComun: 300, // una confusión frecuente sobre el concepto y por qué está mal
    fuenteTitulo: 120, // el título del artículo de Wikipedia con que se chequeó la ficha
    fuenteUrl: 300,
    aprendidosParaIA: 30, // conceptos aprendidos que se le pasan a la IA (para analogías)
    respuestaUsuario: 1000, // lo que escribís al contestar una pregunta
    explicacion: 2000, // lo que escribís en "contalo" o "feynman"
    comentarioIA: 400, // lo que devuelve la IA al corregir (cada parte)
    previos: 3, // conceptos previos (escalón de abajo) por ficha, como mucho
    porQue: 200, // por qué hace falta un concepto previo
    explicacionEscalon: 600, // la explicación mínima de un escalón de abajo
    preguntasFeynman: 3, // preguntas del personaje antes del cierre
    turnosFeynman: 8, // mensajes de la charla que se mandan (tuyos y del personaje)
    preguntaPersonaje: 300, // lo que dice el personaje en cada vuelta
    nombre: 40, // cómo te llamás (bienvenida)
    comentario: 1000, // lo que le escribís a Esteban ("Contale a Esteban", "Esto está mal")
    comentariosPorDia: 20, // comentarios por persona y por día
    correccionFicha: 300, // qué está mal, cuando se rehace una ficha
    // Libros (EPUB): el texto queda solo en el navegador; a la IA va un capítulo recortado
    epubBytes: 15_000_000, // tamaño del archivo
    libroLetras: 1_500_000, // letras de todo el libro
    capitulosPorLibro: 80,
    capituloMinimo: 400, // menos letras que esto: tapa, índice o página en blanco (no cuenta como capítulo)
    textoCapituloIA: 12_000, // letras del capítulo que van a la IA para la ficha
    textoPreviosIA: 5_000, // letras del capítulo que van a la IA para el escalón de abajo
    busqueda: 80, // letras de lo que se busca en el libro
    resultadosBusqueda: 20,
    tituloLibro: 120, // "libro" y "capítulo" de dónde salió una ficha
    // Resaltados y notas al leer
    resaltadoTexto: 600, // letras de lo que se resalta (una oración o un pedazo de párrafo)
    nota: 2000, // nota personal sobre un resaltado
    tituloNota: 80,
    explicacionIA: 500, // la explicación breve de la IA
    contextoExplicar: 1500, // letras del párrafo que acompañan a la oración que se explica
    resaltadosTotal: 3000,
    escritosTotal: 300, // escritura libre
    tituloEscrito: 120,
    textoEscrito: 50_000, // letras de un escrito (≈ 25 páginas)
    notasTotal: 2000,
    instruccionReescribir: 200, // "Más formal, para mandar por mail"
    textoReescribir: 8000, // letras que se mandan a reescribir de una vez (más largo: de a párrafos)
    reescritura: 12000, // letras de lo que devuelve la IA // notas sueltas ("Tu desarrollo" en las fichas)
    parrafoMaximo: 5000, // número de párrafo más alto que se acepta (un capítulo no tiene más)
    letraMaxima: 100_000, // posición más alta dentro de un párrafo
    terminoVerificar: 60,
    terminosVerificar: 3,
    pregunta: 200,
    respuesta: 400,
    preguntas: 5,
    prerrequisitos: 6,
    mensaje: 2000, // letras de un mensaje del chat
    motivo: 200,
    mapasTotal: 200,
    conceptosPorMapa: 300,
    ramasPorConcepto: 8,
    profundidad: 8, // niveles de ramas como máximo
    mensajesPorMapa: 1000,
    tarjetasTotal: 5000,
    metaSemanalMin: 1, // días por semana
    metaSemanalMax: 7,
    topeRepasosMin: 5, // tarjetas por día
    topeRepasosMax: 100,
    diasGuardados: 800, // días con actividad que se recuerdan (para la racha)
    sesionesTotal: 3000,
    minutosSesionMax: 600,
};

// Funciones que se prenden y apagan: para esconder algo que no se sabe si van a usar, sin borrarlo.
export const FUNCIONES = {
    modoLibre: false, // la charla libre con la IA todavía no está hecha (etapa 5)
};
