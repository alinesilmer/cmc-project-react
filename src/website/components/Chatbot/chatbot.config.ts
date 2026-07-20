
// ─── Contact / redirect targets ───────────────────────────────────────────────

export const WHATSAPP_NUMBERS = {
  auditoria: {
    number: "5493794880598",
    label: "",
    email: "auditoriacolegiomedico23@gmail.com",
  },
  padrones: {
    number: "5493794252323",
    label: "",
    email: "padronescolegiomedico@gmail.com",
  },
} as const;

export type WhatsAppDept = keyof typeof WHATSAPP_NUMBERS;

export const APPROVED_LINKS = {
  instagram: "https://www.instagram.com/colegiomedicoctes/",
  login: "https://colegiomedicocorrientes.com/panel/login",
} as const;

// ─── Convenio contact (mirrors convenios.tsx exactly) ─────────────────────────
export const CONVENIO_EMAIL = "auditoriacolegiomedico23@gmail.com";
export const CONVENIO_WA_LINK =
  `https://wa.me/543794252323?text=${encodeURIComponent(
    "Hola, quisiera información para firmar convenio con el Colegio Médico de Corrientes, por favor. ¡Gracias!."
  )}`;

// ─── Bot copy ─────────────────────────────────────────────────────────────────

export const GREETING =
  "¡Hola! Soy el asistente del Colegio Médico de Corrientes. " +
  "Puedo ayudarle con información sobre nuestros servicios, la quinta, " +
  "cursos, convenios y más. ¿En qué puedo ayudarle?";

export const FALLBACK_MESSAGE =
  "Lo siento, no tengo información sobre ese tema. " +
  "Para consultas personalizadas, puede contactarnos por WhatsApp " +
  "o visitarnos en nuestra página de contacto.";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatLink {
  label: string;
  href: string;
  external?: boolean;
}

export type AsyncAction = "check_obra_social";

export interface MenuOption {
  /** Visible label on the button */
  label: string;
  /** Pre-filled query sent to the engine when the user clicks */
  query: string;
}

export interface Intent {
  id: string;
  keywords: string[];
  chipLabel?: string;
  answer: string;
  links?: ChatLink[];
  whatsapp?: WhatsAppDept;
  /** When set, Chatbot.tsx performs an async API lookup before answering */
  asyncAction?: AsyncAction;
  /** When set, renders clickable numbered option buttons below the answer */
  menuOptions?: MenuOption[];
}

// ─── Intent definitions ───────────────────────────────────────────────────────

export const INTENTS: Intent[] = [
  {
    id: "medicus_menu",
    keywords: [
      "medicus fuerzas",
      "medicus gendarmeria",
      "medicus prefectura",
      "medicus seguridad",
      "fuerzas seguridad medicus",
      "gendarmeria prefectura medicus",
    ],
    chipLabel: "MEDICUS Fuerzas de Seguridad",
    answer:
      "Sobre MEDICUS — Fuerzas de Seguridad (Gendarmería Nacional y Prefectura Naval), " +
      "¿qué desea consultar?",
    menuOptions: [
      {
        label: "1. Planes MS1 y MS2",
        query: "Cuáles son los planes MS1 y MS2 de MEDICUS",
      },
      {
        label: "2. Copagos del plan MS1",
        query: "Cuáles son los copagos MS1 MEDICUS",
      },
      {
        label: "3. Exclusiones de copago",
        query: "Quiénes están excluidos del copago MEDICUS",
      },
      {
        label: "4. Autorizaciones y facturación",
        query: "Cómo pedir autorización MEDICUS y cómo facturar",
      },
      {
        label: "5. Usuario y contraseña",
        query: "credenciales osfa iosfa usuario contrasena validacion",
      },
    ],
    links: [
      { label: "Ver Preguntas Frecuentes", href: "/preguntas-frecuentes" },
    ],
  },
  {
    id: "ordenes",
    keywords: [
      "presentacion de ordenes",
      "presentar ordenes",
      "ordenes medicas",
      "cuando presento",
      "fecha ordenes",
      "plazo ordenes",
      "vencimiento ordenes",
      "orden medica",
      "dia 20",
      "hasta cuando",
      "cuando hay que presentar",
    ],
    chipLabel: "Presentación de órdenes",
    answer:
      "Tiene hasta el 20 de cada mes para presentar sus órdenes en el " +
      "Colegio Médico de Corrientes. Las presentaciones fuera de término " +
      "no son aceptadas.",
  },

  {
    id: "asociarme",
    keywords: [
      "asociar", "asociarme", "matricula", "colegiarse", "inscribir",
      "inscripcion", "registro", "socio", "afiliacion", "como unirme",
      "quiero ser", "como ingreso", "miembro", "alta",
    ],
    chipLabel: "Cómo asociarme",
    answer:
      "Para asociarse al Colegio Médico de Corrientes puede consultar los " +
      "requisitos e información en la sección Socios de nuestro sitio. " +
      "Para iniciar el trámite o resolver dudas específicas, contacte " +
      "directamente al área de Padrones.",
    links: [{ label: "Información para socios", href: "/socios" }],
    whatsapp: "padrones",
  },
  {
    id: "quinta",
    keywords: [
      "quinta", "recreo", "esparcimiento", "camping", "pileta",
      "parrilla", "salon", "instalaciones quinta", "club", "recreacion",
    ],
    chipLabel: "La Quinta",
    answer:
      "El Colegio cuenta con una Quinta para el esparcimiento de sus " +
      "colegiados. Es un espacio de recreación disponible para los médicos " +
      "matriculados y sus familias. Puede ver todos los detalles y " +
      "comodidades en la sección dedicada.",
    links: [{ label: "Ver la Quinta", href: "/quinta" }],
  },
  {
    id: "galeria",
    keywords: [
      "galeria", "fotos", "fotografias", "imagenes", "album",
      "eventos fotografias", "ver fotos",
    ],
    answer:
      "En nuestra Galería puede ver imágenes de eventos, actividades " +
      "e instalaciones del Colegio Médico de Corrientes.",
    links: [{ label: "Ver Galería", href: "/galeria" }],
  },

  // ── Must come BEFORE obras_sociales to match specific queries first ──────────

  {
    id: "obras_sociales_check",
    keywords: [
      // singular
      "trabaja con",
      "trabaja con obra social",
      "funciona con",
      "tiene convenio con",
      "tiene convenio para",
      "atiende con",
      "acepta mi",
      "acepta obra social",
      "cubre con",
      "cubre a",
      "opera con",
      // plural
      "trabajan con",
      "trabajan con obra social",
      "tienen convenio con",
      "tienen convenio para",
      "atienden con",
      "aceptan mi",
      "aceptan obra social",
      "cubren con",
      "operan con",
      // other patterns
      "mi obra social",
      "hay convenio con",
      "hay convenio para",
      "hacen convenio con",
      "estan en convenio",
      "esta en convenio",
      "tienen convenio con",
      "tiene colegio convenio con"
    ],
    answer:
      "El Colegio tiene convenios con diversas obras sociales. " +
      "Consulte el listado completo en la sección Convenios.",
    links: [{ label: "Ver Convenios", href: "/convenios" }],
    asyncAction: "check_obra_social",
  },
  {
    id: "convenio_request",
    keywords: [
      "quiero firmar convenio",
      "firmar convenio",
      "obra social quiere convenio",
      "interesada en convenio",
      "como hacemos convenio",
      "empresa quiere convenio",
      "entidad quiere convenio",
      "iniciar convenio",
      "solicitar convenio",
    ],
    chipLabel: "Firmar convenio",
    answer:
      `Si es una Obra Social o empresa interesada en firmar convenio, ` +
      `puede contactarnos por WhatsApp o enviando su carta de presentación ` +
      `por correo a ${CONVENIO_EMAIL}.`,
    links: [
      { label: "WhatsApp — Convenio", href: CONVENIO_WA_LINK, external: true },
      { label: "Ver Convenios", href: "/convenios" },
    ],
  },

  // ── Obras sociales específicas — procedimientos de atención / autorización ────
  // Van antes del intent genérico "obras_sociales" para que su nombre gane el
  // match, pero después de "obras_sociales_check" para no pisar la consulta
  // de convenio en vivo ("¿tiene convenio con...?").

  {
    id: "swiss_medical",
    keywords: [
      "swiss medical",
      "swiss",
      "atender swiss",
      "atiendo swiss",
      "como atiendo con swiss",
      "como atender con swiss",
      "prestador swiss",
      "numero de prestador swiss",
      "usuario swiss",
      "alta swiss",
      "tutorial swiss",
      "plus swiss",
      "sin cobro de plus",
    ],
    chipLabel: "Swiss Medical",
    answer:
      "Para atender pacientes de Swiss Medical:\n\n" +
      "1. Asiente la consulta en la planilla correspondiente y haga firmar " +
      "al paciente.\n" +
      "2. Para generar su usuario en el sistema de Swiss, inicie sesión, " +
      "vaya a su perfil y presione el botón «Obtener usuario SWISS MEDICAL». " +
      "Allí encontrará las instrucciones para crearlo.\n" +
      "3. Si aún no tiene número de prestador, envíe un correo a " +
      "padronescolegiomedico@gmail.com confirmando que atenderá con Swiss " +
      "sin cobro de plus, para tramitar el alta.",
    links: [
      { label: "Ir al sistema", href: APPROVED_LINKS.login, external: true },
    ],
    whatsapp: "padrones",
  },
  {
    id: "union_personal",
    keywords: [
      "union personal",
      "autorizacion union personal",
      "autorizaciones union personal",
      "prestaciones union personal",
      "como autorizo union personal",
      "autorizar union personal",
      "codigo 420101",
      "420101",
    ],
    chipLabel: "Unión Personal",
    answer:
      "Autorizaciones de Unión Personal:\n\n" +
      "El usuario y la clave para autorizar están disponibles en su perfil " +
      "dentro del sistema.\n\n" +
      "1. Ingrese a Menú → Autorizaciones → Prestaciones.\n" +
      "2. Complete únicamente el N° de afiliado, la versión de la credencial " +
      "y el plan; luego ingrese el código de consulta 420101 y presione «Autorizar».\n" +
      "3. Complete todos los datos en un recetario con membrete e incluya el " +
      "N° de autorización como referencia.",
    links: [
      { label: "Ir al sistema", href: APPROVED_LINKS.login, external: true },
    ],
  },

  {
    id: "obras_sociales",
    keywords: [
      "obra social", "obras sociales", "cobertura", "convenio", "convenios",
      "mutual", "prepaga", "osde", "pami", "salud prepaga",
    ],
    chipLabel: "Obras sociales",
    answer:
      "El Colegio tiene convenios con diversas obras sociales y prepagas. " +
      "¿Qué desea consultar?",
    links: [{ label: "Ver listado de convenios", href: "/convenios" }],
    menuOptions: [
      {
        label: "¿Tiene convenio mi obra social?",
        query: "tiene convenio con mi obra social",
      },
      {
        label: "Firmar convenio con el Colegio",
        query: "quiero firmar convenio",
      },
    ],
  },
  {
    id: "servicios",
    keywords: [
      "servicio", "servicios", "beneficio", "beneficios", "que ofrecen",
      "que hace el colegio", "prestaciones", "ventajas", "que incluye",
    ],
    answer:
      "El Colegio Médico ofrece: matrícula e inscripción con respaldo " +
      "institucional, defensa profesional, formación continua, ética y " +
      "calidad, asesoramiento administrativo e institucional, y comunidad " +
      "médica activa. Conozca el detalle completo en la sección Servicios.",
    links: [{ label: "Ver Servicios", href: "/servicios" }],
  },
  {
    id: "cursos",
    keywords: [
      "curso", "cursos", "capacitacion", "formacion", "jornada", "jornadas",
      "seminario", "taller", "congreso", "actualizacion", "educacion continua",
      "capacitarse",
    ],
    answer:
      "El Colegio organiza cursos, jornadas y actividades de capacitación " +
      "continua para sus colegiados. Consulte la agenda actualizada en la " +
      "sección Cursos.",
    links: [{ label: "Ver Cursos", href: "/cursos" }],
  },
  {
    id: "noticias",
    keywords: [
      "noticia", "noticias", "novedad", "novedades", "comunicado",
      "anuncio", "que hay de nuevo", "ultimas noticias",
    ],
    answer:
      "Las últimas novedades, comunicados y noticias del Colegio están " +
      "disponibles en la sección Noticias. Publicamos actualizaciones " +
      "institucionales y eventos regularmente.",
    links: [{ label: "Ver Noticias", href: "/noticias" }],
  },
  {
    id: "medicos",
    keywords: [
      "medico", "medicos", "doctor", "doctores", "especialista",
      "especialistas", "directorio", "buscar medico", "listado medicos",
      "profesional",
    ],
    answer:
      "En el directorio de Médicos Asociados puede buscar profesionales " +
      "matriculados en el Colegio por nombre o especialidad.",
    links: [{ label: "Médicos Asociados", href: "/medicos-asociados" }],
  },
  {
    id: "seguros",
    keywords: [
      "seguro", "seguros", "poliza", "cobertura seguros", "aseguradora",
      "seguro medico",
    ],
    answer:
      "El Colegio brinda información sobre seguros para los médicos " +
      "colegiados. Consulte la sección Seguros para más detalles.",
    links: [{ label: "Ver Seguros", href: "/seguros" }],
  },
  {
    id: "contacto",
    keywords: [
      "contacto", "contactar", "telefono", "direccion", "ubicacion",
      "horario", "atencion", "oficina", "donde estan", "domicilio",
      "como llego", "correo", "email",
    ],
    chipLabel: "Contacto",
    answer:
      "Puede comunicarse con el Colegio a través de nuestra página de " +
      "Contacto o por WhatsApp con el área de Auditoría para consultas " +
      "generales.",
    links: [{ label: "Página de Contacto", href: "/contacto" }],
    whatsapp: "auditoria",
  },
  {
    id: "instagram",
    keywords: [
      "instagram", "red social", "redes sociales", "seguir", "social media",
      "ig", "redes",
    ],
    answer:
      "Síganos en Instagram para estar al tanto de las novedades, " +
      "eventos y comunicados del Colegio Médico de Corrientes.",
    links: [
      {
        label: "@colegiomedicoctes",
        href: APPROVED_LINKS.instagram,
        external: true,
      },
    ],
  },

  // ── Login — most specific first ───────────────────────────────────────────────

  {
    id: "login_problem",
    keywords: [
      "no puedo entrar",
      "no puedo iniciar sesion",
      "no puedo iniciar",
      "no me deja entrar",
      "no me deja ingresar",
      "olvide la clave",
      "olvide mi clave",
      "olvide contrasena",
      "no recuerdo la clave",
      "no recuerdo mi clave",
      "error al ingresar",
      "no funciona el acceso",
      "problema para ingresar",
      "no puedo acceder",
      "no puedo loguearme",
    ],
    answer:
      "Recuerde que el usuario es su número de socio y la contraseña es su " +
      "matrícula provincial. Si el problema continúa, contacte con " +
      "Auditoría para recibir asistencia.",
    links: [
      { label: "Ir al sistema", href: APPROVED_LINKS.login, external: true },
    ],
    whatsapp: "auditoria",
  },
  {
    id: "login_credentials",
    keywords: [
      "como inicio sesion",
      "como iniciar sesion",
      "usuario y contrasena",
      "credenciales",
      "que usuario uso",
      "que contrasena uso",
      "como me logueo",
      "cual es mi usuario",
      "cual es mi contrasena",
      "numero de socio usuario",
      "matricula contrasena",
    ],
    answer:
      "Para acceder al sistema use su número de socio como usuario y su " +
      "matrícula provincial como contraseña.",
    links: [
      { label: "Ir al sistema", href: APPROVED_LINKS.login, external: true },
    ],
  },
  {
    id: "login",
    keywords: [
      "login", "ingresar sistema", "panel", "acceso sistema", "facturacion",
      "liquidacion", "validar", "portal sistema", "sistema gestion",
    ],
    chipLabel: "Panel de acceso",
    answer:
      "¿Con qué necesita ayuda para acceder al sistema?",
    links: [
      {
        label: "Ir al sistema",
        href: APPROVED_LINKS.login,
        external: true,
      },
    ],
    menuOptions: [
      {
        label: "¿Cuál es mi usuario y contraseña?",
        query: "como inicio sesion credenciales usuario",
      },
      {
        label: "No puedo acceder al sistema",
        query: "no puedo entrar al sistema",
      },
    ],
  },
  {
    id: "nosotros",
    keywords: [
      "nosotros", "quienes son", "historia", "colegio medico corrientes",
      "institucion", "acerca de", "mision", "vision", "que es el colegio",
    ],
    answer:
      "El Colegio Médico de Corrientes es la institución que representa " +
      "y nuclea a los profesionales médicos de la provincia. Conozca más " +
      "sobre nuestra historia, misión y autoridades.",
    links: [{ label: "Nosotros", href: "/nosotros" }],
  },
  {
    id: "horarios",
    keywords: [
      "horario de atencion",
      "en que horario atienden",
      "que horario tienen",
      "cuando atienden",
      "a que hora abren",
    ],
    answer:
      "El horario de atención del Colegio es de lunes a viernes de 7:00 a 15:00 horas. " +
      "Para más información puede visitar la sección Contacto.",
    links: [{ label: "Contacto", href: "/contacto" }],
  },

  {
    id: "autorizaciones_practicas",
    keywords: [
      "autorización",
      "autorizacion",
      "practica lleva autorizacion",
      "práctica lleva autorización",
      "necesita autorizacion",
      "necesita autorización",
      "requiere autorizacion",
      "requiere autorización",
      "como saber si autorizo",
      "tengo que pedir autorizacion",
      "normativas",
      "normas practicas",
    ],
    chipLabel: "Autorizaciones de prácticas",
    answer:
      "Para consultar si una práctica requiere autorización previa, ingrese " +
      "al sector Normativas de nuestra página web, donde encontrará el " +
      "listado actualizado de prácticas y sus requerimientos.",
    links: [{ label: "Ver Normativas", href: "/normativas" }],
  },

  {
    id: "consultar_valores_os",
    keywords: [
      "consultar valores",
      "valor prestaciones",
      "precio obra social",
      "precios obra social",
      "consultar precios",
      "cuanto paga",
      "cuanto cobra",
      "arancel obra social",
      "aranceles",
      "valor por codigo",
      "precio por codigo",
      "como consulto precios",
      "como veo los precios",
      "ver valores obras sociales",
    ],
    chipLabel: "¿Cómo consultar valores?",
    answer:
      "Para consultar los valores de prestaciones por obra social y código:\n\n" +
      "1. Ingrese al sistema con su usuario y contraseña.\n" +
      "2. Diríjase a la sección «Valor Prestaciones».\n" +
      "3. Seleccione la obra social y el código que desea consultar.",
    links: [
      { label: "Ingresar al sistema", href: APPROVED_LINKS.login, external: true },
    ],
  },

  // ── Errors / support ──────────────────────────────────────────────────────────

  {
    id: "page_error",
    keywords: [
      "error en la pagina",
      "error en el sitio",
      "error en la web",
      "no carga la pagina",
      "falla el sitio",
      "problema con la web",
      "error tecnico",
      "la pagina no funciona",
      "reporte un error",
      "reportar error",
      "encontre un error",
      "hay un error en el sitio",
    ],
    answer:
      "Si encontró un error en el sitio, puede reportarlo al área de " +
      `Auditoría por WhatsApp o por correo a ${WHATSAPP_NUMBERS.auditoria.email}.`,
    whatsapp: "auditoria",
  },

  // ── MEDICUS — Fuerzas de Seguridad (sub-intents) ─────────────────────────────

  {
    id: "medicus_planes",
    keywords: [
      "planes ms1",
      "plan ms1",
      "plan ms2",
      "ms1 y ms2",
      "que es ms1",
      "que es ms2",
      "diferencia ms1",
      "cobertura ms1",
      "cobertura ms2",
      "internacion ms1",
      "internacion ms2",
      "cuales son los planes ms1",
    ],
    answer:
      "MEDICUS incorporó afiliados de las Fuerzas de Seguridad Nacionales " +
      "(Gendarmería y Prefectura) desde el 1° de junio de 2026. Los planes son:\n\n" +
      "• MS1: tiene copagos en consultas y prácticas ambulatorias. " +
      "Internación en habitación compartida.\n" +
      "• MS2: sin copagos. Internación en habitación individual.\n\n" +
      "Los afiliados deben presentar credencial vigente de MEDICUS.",
    links: [
      { label: "Ver Preguntas Frecuentes", href: "/preguntas-frecuentes" },
    ],
  },
  {
    id: "medicus_copagos",
    keywords: [
      "copago medicus",
      "copagos medicus",
      "copago ms1",
      "copagos ms1",
      "cuanto paga medicus",
      "cuanto es el copago",
      "tabla copago",
      "valor copago",
      "cuales son los copagos ms1",
    ],
    answer:
      "Copagos vigentes del Plan MS1 (desde junio 2026):\n\n" +
      "• $35.000 — Cirugías ambulatorias, endoscopías, CPRE, broncoscopías.\n" +
      "• $20.000 — Consultas médicas, especialistas, psicología, ecografías, " +
      "tomografías, resonancias, imágenes especiales, laboratorio (por receta), " +
      "odontología, y prácticas de cardiología, dermatología, ginecología, " +
      "oftalmología, traumatología y otras especialidades.\n" +
      "• $10.000 — Radiología (por receta), fonoaudiología, kinesiología, nutrición.\n\n" +
      "El Plan MS2 no tiene copagos.",
    links: [
      { label: "Ver Preguntas Frecuentes", href: "/preguntas-frecuentes" },
    ],
  },
  {
    id: "medicus_exclusiones",
    keywords: [
      "excluidos del copago",
      "excluido copago",
      "exclusion copago",
      "exclusiones medicus",
      "sin copago medicus",
      "quienes no pagan",
      "quienes estan excluidos",
      "oncologia copago",
      "embarazo copago",
      "cud copago",
    ],
    answer:
      "Están excluidos de copagos en el Plan MS1:\n\n" +
      "• Pacientes oncológicos u oncohematológicos.\n" +
      "• Pacientes en cuidados paliativos.\n" +
      "• HIV, diálisis, trasplantados, tratamientos de fertilidad.\n" +
      "• Plan materno infantil: embarazo, parto, puerperio y niños hasta 3 años.\n" +
      "• Titulares de CUD (Certificado Único de Discapacidad).\n\n" +
      "También excluidas en contexto preventivo: PAP y mamografía.\n" +
      "Las prestaciones realizadas en guardia sí llevan copago.",
    links: [
      { label: "Ver Preguntas Frecuentes", href: "/preguntas-frecuentes" },
    ],
  },
  {
    id: "medicus_osfa",
    keywords: [
      "credenciales osfa",
      "credenciales iosfa",
      "usuario osfa",
      "contrasena osfa",
      "clave osfa",
      "usuario iosfa",
      "contrasena iosfa",
      "clave iosfa",
      "osfa validacion",
      "iosfa validacion",
      "credenciales osfa iosfa usuario contrasena validacion",
      "fuerzas armadas usuario",
      "fuerzas armadas contrasena",
    ],
    answer:
      "Para ingresar al sistema de validación de OSFA (ex IOSFA — Fuerzas Armadas), " +
      "tanto el usuario como la contraseña son el CUIT del Colegio Médico con guiones:\n\n" +
      "👤 Usuario: 3-57319069-2\n" +
      "🔑 Contraseña: 3-57319069-2",
    links: [
      { label: "Ver Preguntas Frecuentes", href: "/preguntas-frecuentes" },
    ],
  },
  {
    id: "medicus_autorizaciones",
    keywords: [
      "autorizacion medicus",
      "autorizaciones medicus",
      "autorizar medicus",
      "como autorizo medicus",
      "facturar medicus",
      "facturacion medicus",
      "receta medicus",
      "membrete medicus",
      "como pedir autorizacion medicus",
      "autorizacionesplanms",
    ],
    answer:
      "Para solicitar autorizaciones de MEDICUS — Fuerzas de Seguridad:\n\n" +
      "📧 autorizacionesplanms@medicus.com.ar\n" +
      "📱 El afiliado también puede tramitarla por la app de MEDICUS.\n\n" +
      "Para facturar: las prestaciones deben registrarse en recetario con " +
      "membrete profesional. En cada orden debe constar el importe percibido " +
      "en concepto de copago cuando corresponda.",
    links: [
      { label: "Ver Preguntas Frecuentes", href: "/preguntas-frecuentes" },
    ],
  },

];

// ─── Quick-reply chips (derived from intents with chipLabel) ──────────────────

export const QUICK_CHIPS = INTENTS.filter((i) => i.chipLabel).map((i) => ({
  key: i.id,
  label: i.chipLabel as string,
}));
