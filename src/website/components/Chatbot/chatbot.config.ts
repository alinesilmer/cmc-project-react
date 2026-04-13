
// ─── Contact / redirect targets ───────────────────────────────────────────────

export const WHATSAPP_NUMBERS = {
  auditoria: {
    number: "5493794880598",
    label: "Auditoría",
    email: "auditoriacolegiomedico23@gmail.com",
  },
  padrones: {
    number: "5493794252323",
    label: "Padrones",
    email: "padronescolegiomedico@gmail.com",
  },
} as const;

export type WhatsAppDept = keyof typeof WHATSAPP_NUMBERS;

export const APPROVED_LINKS = {
  instagram: "https://www.instagram.com/colegiomedicoctes/",
  login: "https://colegiomedicocorrientes.com/panel/login",
} as const;

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

export interface Intent {
  id: string;
  keywords: string[];
  chipLabel?: string;
  answer: string;
  links?: ChatLink[];
  whatsapp?: WhatsAppDept;
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
];

// ─── Quick-reply chips (derived from intents with chipLabel) ──────────────────

export const QUICK_CHIPS = INTENTS.filter((i) => i.chipLabel).map((i) => ({
  key: i.id,
  label: i.chipLabel as string,
}));
