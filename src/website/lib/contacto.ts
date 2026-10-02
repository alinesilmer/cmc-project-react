/**
 * Datos de contacto del Colegio, en un solo lugar.
 *
 * Estaban repetidos en el Footer, Contacto, Socios, Convenios, Quinta, Seguros
 * y el chatbot, y ya se habían separado: el Footer mostraba el 252323 pero el
 * enlace marcaba el 722121.
 */

const TELEFONO_SEDE = "3794252323";

export const CONTACTO = {
  direccion: "Carlos Pellegrini 1785",
  ciudad: "Corrientes, Argentina",
  mapa: "https://www.google.com/maps/dir//Carlos+Pellegrini+1785,+Corrientes,+Argentina",
  telefono: {
    visible: "+54 3794 252323",
    corto: "3794-252323",
    href: `tel:+54${TELEFONO_SEDE}`,
  },
  emails: {
    secretaria: "secretaria@colegiomedicocorrientes.com",
    auditoria: "auditoriacolegiomedico23@gmail.com",
    padrones: "padronescolegiomedico@gmail.com",
  },
  /** Números de WhatsApp con código de país, sin `+` ni espacios. */
  whatsapp: {
    sede: `54${TELEFONO_SEDE}`,
    padrones: "5493794252323",
    auditoria: "5493794880598",
    /** Quinta y seguros los atiende la misma persona. */
    servicios: "543794404497",
  },
  instagram: "https://www.instagram.com/colegiomedicoctes/",
} as const;

/** Enlace de WhatsApp, con el mensaje ya escrito si se pasa uno. */
export function linkWhatsApp(numero: string, mensaje?: string): string {
  const base = `https://wa.me/${numero}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}

/**
 * Comercios, emprendimientos y empresas que quieren sumar un beneficio para
 * los socios. Lo atiende Alejandra.
 */
export const CONVENIO_COMERCIOS = {
  whatsapp: "5493794532535",
  whatsappVisible: "379 453-2535",
  email: "alejandraalinesilva67@gmail.com",
  mensajeWhatsApp:
    "Hola Alejandra, tengo un comercio/emprendimiento y me gustaría firmar un convenio de beneficios con el Colegio Médico de Corrientes.",
  asuntoEmail: "Convenio de beneficios con el Colegio Médico",
} as const;

/** El contacto para obras sociales que quieren firmar convenio (Convenios y chatbot). */
export const CONVENIO = {
  email: CONTACTO.emails.auditoria,
  mensajeWhatsApp:
    "Hola, quisiera información para firmar convenio con el Colegio Médico de Corrientes, por favor. ¡Gracias!.",
  asuntoEmail: "Carta de presentación - Convenio",
  cuerpoEmail: "Hola, adjunto carta de presentación para evaluar convenio. Gracias.",
} as const;

/** Enlace `mailto:` con asunto y cuerpo opcionales. */
export function linkEmail(
  email: string,
  opciones: { asunto?: string; cuerpo?: string } = {}
): string {
  const params = new URLSearchParams();
  if (opciones.asunto) params.set("subject", opciones.asunto);
  if (opciones.cuerpo) params.set("body", opciones.cuerpo);
  // URLSearchParams codifica los espacios como `+`, que los clientes de correo
  // muestran literal: se pasan a `%20`.
  const qs = params.toString().replace(/\+/g, "%20");
  return `mailto:${email}${qs ? `?${qs}` : ""}`;
}
