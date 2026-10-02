import type { Intent } from "../chatbot.types";
import { APPROVED_LINKS, WHATSAPP_NUMBERS } from "../chatbot.enlaces";

/** Acceso al sistema y reporte de errores del sitio. */
export const INTENTS_ACCESO: Intent[] = [
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
];
