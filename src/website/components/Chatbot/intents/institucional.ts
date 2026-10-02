import type { Intent } from "../chatbot.types";
import { APPROVED_LINKS } from "../chatbot.enlaces";

/** El Colegio: asociarse, servicios, secciones del sitio y contacto. */
export const INTENTS_INSTITUCIONAL: Intent[] = [
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
];
