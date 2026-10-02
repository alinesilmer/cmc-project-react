import { CONTACTO, linkWhatsApp } from "../../../lib/contacto";

/** WhatsApp de Servicios, con el mensaje ya escrito. Lo usan la cabecera y el convenio. */
export const CONSULTAR_SEGUROS = linkWhatsApp(
  CONTACTO.whatsapp.servicios,
  "Hola, quiero más información sobre los convenios de seguros del Colegio Médico."
);
