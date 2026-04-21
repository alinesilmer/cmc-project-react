
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
  "Puedo ayudarte con información sobre nuestros servicios, la quinta, " +
  "cursos, convenios y más. ¿En qué puedo ayudarte?";

export const FALLBACK_MESSAGE =
  "Lo siento, no tengo información sobre ese tema. " +
  "Para consultas personalizadas, podés contactarnos por WhatsApp " +
  "o visitarnos en nuestra página de contacto.";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatLink {
  label: string;
  href: string;
  external?: boolean;
}

export type AsyncAction = "check_obra_social" | "get_precio_consulta";

export interface Intent {
  id: string;
  keywords: string[];
  chipLabel?: string;
  answer: string;
  links?: ChatLink[];
  whatsapp?: WhatsAppDept;
  /** When set, Chatbot.tsx performs an async API lookup before answering */
  asyncAction?: AsyncAction;
}

// ─── Intent definitions ───────────────────────────────────────────────────────

export const INTENTS: Intent[] = [
  {
    id: "asociarme",
    keywords: [
      "asociar", "asociarme", "matricula", "colegiarse", "inscribir",
      "inscripcion", "registro", "socio", "afiliacion", "como unirme",
      "quiero ser", "como ingreso", "miembro", "alta",
    ],
    chipLabel: "Cómo asociarme",
    answer:
      "Para asociarte al Colegio Médico de Corrientes podés consultar los " +
      "requisitos e información en la sección Socios de nuestro sitio. " +
      "Para iniciar el trámite o resolver dudas específicas, contactá " +
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
      "matriculados y sus familias. Podés ver todos los detalles y " +
      "comodidades en la sección dedicada.",
    links: [{ label: "Ver la Quinta", href: "/quinta" }],
  },
  {
    id: "galeria",
    keywords: [
      "galeria", "fotos", "fotografias", "imagenes", "album",
      "eventos fotografias", "ver fotos",
    ],
    chipLabel: "Galería",
    answer:
      "En nuestra Galería podés ver imágenes de eventos, actividades " +
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
    ],
    answer:
      "El Colegio tiene convenios con diversas obras sociales. " +
      "Consultá el listado completo en la sección Convenios.",
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
      `Si sos una Obra Social o empresa interesada en firmar convenio, ` +
      `podés contactarnos por WhatsApp o enviando tu carta de presentación ` +
      `por correo a ${CONVENIO_EMAIL}.`,
    links: [
      { label: "WhatsApp — Convenio", href: CONVENIO_WA_LINK, external: true },
      { label: "Ver Convenios", href: "/convenios" },
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
      "En la sección Convenios podés consultar el listado completo y los " +
      "detalles de cada acuerdo.",
    links: [{ label: "Ver Convenios", href: "/convenios" }],
  },
  {
    id: "servicios",
    keywords: [
      "servicio", "servicios", "beneficio", "beneficios", "que ofrecen",
      "que hace el colegio", "prestaciones", "ventajas", "que incluye",
    ],
    chipLabel: "Servicios",
    answer:
      "El Colegio Médico ofrece: matrícula e inscripción con respaldo " +
      "institucional, defensa profesional, formación continua, ética y " +
      "calidad, asesoramiento administrativo e institucional, y comunidad " +
      "médica activa. Conocé el detalle completo en la sección Servicios.",
    links: [{ label: "Ver Servicios", href: "/servicios" }],
  },
  {
    id: "cursos",
    keywords: [
      "curso", "cursos", "capacitacion", "formacion", "jornada", "jornadas",
      "seminario", "taller", "congreso", "actualizacion", "educacion continua",
      "capacitarse",
    ],
    chipLabel: "Cursos",
    answer:
      "El Colegio organiza cursos, jornadas y actividades de capacitación " +
      "continua para sus colegiados. Consultá la agenda actualizada en la " +
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
      "En el directorio de Médicos Asociados podés buscar profesionales " +
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
      "colegiados. Consultá la sección Seguros para más detalles.",
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
      "Podés comunicarte con el Colegio a través de nuestra página de " +
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
      "Seguinos en Instagram para estar al tanto de las novedades, " +
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
      "Recordá que el usuario es tu número de socio y la contraseña es tu " +
      "matrícula provincial. Si el problema continúa, contactate con " +
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
      "Para acceder al sistema usá tu número de socio como usuario y tu " +
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
    answer:
      "Para acceder al sistema de gestión, facturación o validación podés " +
      "ingresar desde el portal de acceso.",
    links: [
      {
        label: "Ingresar al sistema",
        href: APPROVED_LINKS.login,
        external: true,
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
      "y nuclea a los profesionales médicos de la provincia. Conocé más " +
      "sobre nuestra historia, misión y autoridades.",
    links: [{ label: "Nosotros", href: "/nosotros" }],
  },
  {
    id: "contacto",
    keywords: [
      "contacto", "horario de atención",
      "horario", "atencion", "en qué horario atienden",
    ],
    chipLabel: "Contacto",
    answer:
      "Los horarios de atención es de " +
      "de lunes a viernes de 7:00 a 15:00 horas." +
      ". Más información se encuentra disponibles en la sección Contacto.",
    links: [{ label: "Contacto", href: "/contacto" }],
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
      "Si encontraste un error en el sitio, podés reportarlo al área de " +
      `Auditoría por WhatsApp o por correo a ${WHATSAPP_NUMBERS.auditoria.email}.`,
    whatsapp: "auditoria",
  },

  // ── Pricing ───────────────────────────────────────────────────────────────────

  {
    id: "precio_consulta",
    keywords: [
      "cuanto cuesta la consulta",
      "cuanto cuesta con",
      "precio de la consulta",
      "precio para",
      "valor de la consulta",
      "valor para",
      "honorario de la consulta",
      "honorario para",
      "tarifa consulta",
      "precio consulta",
      "valor consulta",
      "cuanto cobran",
      "cuanto cobra con",
      "cuanto es la consulta",
      "cuanto vale la consulta",
    ],
    answer:
      "El valor de la consulta (código 420351) varía según la obra " +
      "social y se actualiza periódicamente. Consultá con Auditoría para " +
      "conocer el importe vigente para tu cobertura.",
    whatsapp: "auditoria",
    asyncAction: "get_precio_consulta",
  },
];

// ─── Quick-reply chips (derived from intents with chipLabel) ──────────────────

export const QUICK_CHIPS = INTENTS.filter((i) => i.chipLabel).map((i) => ({
  key: i.id,
  label: i.chipLabel as string,
}));
