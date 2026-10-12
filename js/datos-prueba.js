// ============================================
// Datos de ejemplo con los que arranca la app (la "semilla"), escritos a mano y sin IA: un mapa de
// "Bases de la psicología" con la rama del conductismo abierta y una ficha completa.
// Si se cambia la forma de algo, subir VERSION_DATOS en config.js para que el navegador vuelva a empezar.
// ============================================

import { fechaLocalISO, sumarDias } from "./fechas.js?v=b86f2e9674";
import { AJUSTES_INICIALES } from "./config.js?v=b86f2e9674";

export function crearSemilla(ahora = Date.now()) {
    const hoy = fechaLocalISO(new Date(ahora));
    const hora = 60 * 60 * 1000;
    const hace = (h) => ahora - h * hora;
    const concepto = (id, padre, titulo, resumen, orden, estado, creadoHace) => ({
        id, mapa: "m1", padre, titulo, resumen, orden, estado, ficha: null, prerrequisitos: [],
        aprendido: estado === "aprendido" ? hace(creadoHace - 0.5) : null, creado: hace(creadoHace),
        historial: [{ que: "agregado", cuando: hace(creadoHace) }],
    });

    const conceptos = [
        concepto("c0", null, "Bases de la psicología", "", 0, "en_curso", 3),
        concepto("c1", "c0", "Orígenes y escuelas tempranas", "Cómo nació la psicología como ciencia y sus primeras escuelas.", 0, "sin_abrir", 3),
        concepto("c2", "c0", "Conductismo", "La psicología centrada en la conducta que se puede observar.", 1, "en_curso", 3),
        concepto("c3", "c0", "Psicoanálisis", "La mirada del inconsciente sobre la mente.", 2, "sin_abrir", 3),
        concepto("c4", "c0", "Cognitivismo", "Los procesos mentales: memoria, atención, pensamiento.", 3, "sin_abrir", 3),
        concepto("c5", "c2", "Estímulo y respuesta", "Lo que pasa afuera y lo que hace el cuerpo como reacción.", 0, "aprendido", 2),
        concepto("c6", "c2", "Condicionamiento clásico", "Aprender que una señal anuncia algo (Pávlov).", 1, "en_curso", 2),
        concepto("c7", "c2", "Condicionamiento operante", "Aprender por las consecuencias de lo que hacés (Skinner).", 2, "sin_abrir", 2),
        concepto("c8", "c2", "Watson y la crítica al mentalismo", "Por qué el conductismo dejó de lado la mente.", 3, "sin_abrir", 2),
    ];

    const clasico = conceptos.find((c) => c.id === "c6");
    clasico.prerrequisitos = ["c5"];
    clasico.ficha = {
        idea: "Si una señal neutra aparece muchas veces justo antes de algo que provoca una reacción, la señal sola termina provocando esa reacción.",
        definicion: "Aprendizaje por asociación: un estímulo neutro, apareado con un estímulo incondicionado (que provoca una respuesta sin aprendizaje), pasa a ser un estímulo condicionado que por sí solo provoca una respuesta condicionada.",
        origen: {
            texto: "Iván Pávlov, fisiólogo ruso, estudiaba la digestión en perros a fines del siglo XIX y principios del XX. Notó que los perros salivaban antes de recibir la comida, al ver a quien se la traía, y lo estudió con experimentos controlados.",
            certeza: "seguro",
        },
        autores: [
            { nombre: "Iván Pávlov", dijo: "Describió el reflejo condicionado: un sonido apareado con comida termina provocando salivación aunque la comida no llegue. Recibió el Nobel de Medicina en 1904 por sus estudios de la digestión.", certeza: "seguro" },
            { nombre: "John B. Watson", dijo: "Lo llevó a las emociones humanas: con Rosalie Rayner (1920) mostró que un miedo se puede aprender por asociación, en el caso del \"pequeño Albert\", hoy muy cuestionado por su ética.", certeza: "seguro" },
            { nombre: "Robert Rescorla", dijo: "Mostró que no alcanza con que dos cosas aparezcan juntas: la señal tiene que predecir lo que viene. Con Allan Wagner armó un modelo matemático del aprendizaje (1972).", certeza: "bastante" },
        ],
        vigencia: {
            estado: "vigente",
            porque: "Es uno de los fenómenos de aprendizaje mejor replicados. Hoy se lo entiende más como aprender qué predice qué que como un reflejo mecánico.",
            certeza: "seguro",
        },
        influencias: {
            texto: "Viene de la idea de asociación de los filósofos empiristas y de la fisiología de los reflejos rusa. Inspiró a Watson y al conductismo, y más tarde a terapias como la desensibilización sistemática para fobias (Joseph Wolpe, 1958).",
            certeza: "bastante",
        },
        analogia: {
            texto: "El sonido de una notificación del celu: al principio es un ruido más, pero como tantas veces vino justo antes de algo interesante, ahora el sonido solo ya te da ganas de mirar.",
            noSeParece: "En el celu además buscás y encontrás cosas (eso es más operante); en Pávlov la respuesta es refleja, el perro no elige salivar.",
        },
        analogiaPropia: {
            texto: "Es el estímulo y respuesta que ya aprendiste, con un giro: un estímulo nuevo \"aprende\" a provocar una respuesta que antes solo provocaba otro.",
            noSeParece: "En el estímulo-respuesta simple no hay aprendizaje; acá la conexión se arma con la repetición.",
        },
        errorComun: "Creer que es aprender por premios y castigos: eso es el condicionamiento operante. En el clásico no importa lo que hacés, sino qué señal anuncia qué.",
        aviso: "",
        verificar: ["Condicionamiento clásico", "Iván Pávlov"],
        preguntas: [
            { pregunta: "En el experimento de Pávlov, ¿qué era el estímulo incondicionado y qué el condicionado?", respuesta: "La comida era el incondicionado (provoca salivación sin aprendizaje); el sonido, después de aparearse con la comida, se volvió el condicionado." },
            { pregunta: "¿Qué agregó Rescorla a la idea de que alcanza con que dos cosas aparezcan juntas?", respuesta: "Que la señal tiene que predecir lo que viene: si aparece igual con o sin la comida, no se aprende la asociación." },
            { pregunta: "Inventá un ejemplo propio de condicionamiento clásico y señalá cada parte.", respuesta: "Cualquiera con: estímulo neutro que pasa a ser condicionado, estímulo incondicionado y la respuesta que se repite." },
        ],
    };

    const mensaje = (id, quien, texto, h, concepto = null) => ({ id, mapa: "m1", quien, texto, concepto, cuando: hace(h) });

    return {
        usuarios: [{ id: "u1", nombre: "", rol: "dueno", activo: true }],
        mapas: [{
            id: "m1", tema: "Bases de la psicología", modo: "guiado",
            creado: { por: "u1", cuando: hace(3) }, usado: hace(1), archivado: null,
            historial: [{ que: "creado", por: "u1", cuando: hace(3) }],
        }],
        conceptos,
        mensajes: [
            mensaje("x1", "vos", "Quiero aprender las bases de la psicología.", 3),
            mensaje("x2", "app", "Armé el árbol en 4 ramas: orígenes, conductismo, psicoanálisis y cognitivismo. Te sugiero empezar por orígenes porque da el contexto, pero elegí la que quieras.", 3),
            mensaje("x3", "vos", "Abrí la rama del conductismo.", 2),
            mensaje("x4", "app", "La partí en 3 ramas más chicas. Antes de entrar: el conductismo da por sabidos los conceptos de estímulo y respuesta. ¿Qué entendés por cada uno?", 2, "c5"),
            mensaje("x5", "vos", "Estímulo es algo que pasa afuera, como un ruido, y respuesta es lo que hace el cuerpo, como asustarse.", 2, "c5"),
            mensaje("x6", "app", "Exacto, eso es lo central. Lo marco como aprendido y seguimos con el condicionamiento clásico: te dejé la ficha a la derecha.", 1, "c6"),
        ],
        // Dos tarjetas de "Estímulo y respuesta" que tocan hoy, para ver el repaso funcionando
        tarjetas: [
            {
                id: "t1", concepto: "c5", mapa: "m1", escalon: 0, proxima: hoy, creada: sumarDias(hoy, -1), historial: [],
                pregunta: "¿Qué es un estímulo?",
                respuesta: "Algo del ambiente (afuera o adentro del cuerpo) que el organismo puede detectar: un ruido, una luz, un olor.",
            },
            {
                id: "t2", concepto: "c5", mapa: "m1", escalon: 0, proxima: hoy, creada: sumarDias(hoy, -1), historial: [],
                pregunta: "Dá un ejemplo de estímulo y su respuesta.",
                respuesta: "Cualquiera con las dos partes, por ejemplo: un portazo (estímulo) y sobresaltarse (respuesta).",
            },
        ],
        dias: [sumarDias(hoy, -1)],
        sesiones: [],
        ajustes: { ...AJUSTES_INICIALES },
        resaltados: [],
        escritos: [],
    };
}
