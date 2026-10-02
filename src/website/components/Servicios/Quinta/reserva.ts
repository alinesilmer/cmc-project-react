import { CONTACTO, linkWhatsApp } from "../../../lib/contacto";

/** WhatsApp de Servicios, con el pedido de reserva ya escrito. */
export const RESERVAR_QUINTA = linkWhatsApp(
  CONTACTO.whatsapp.servicios,
  "Hola, quisiera solicitar información y reservar la Quinta del Colegio."
);
