import { CONTACTO, CONVENIO, linkWhatsApp } from "../../lib/contacto";

/** A quién deriva el chatbot cuando la consulta necesita una persona. */
export const WHATSAPP_NUMBERS = {
  auditoria: { number: CONTACTO.whatsapp.auditoria, label: "", email: CONTACTO.emails.auditoria },
  padrones: { number: CONTACTO.whatsapp.padrones, label: "", email: CONTACTO.emails.padrones },
} as const;

export type DepartamentoWhatsApp = keyof typeof WHATSAPP_NUMBERS;

export const APPROVED_LINKS = {
  instagram: CONTACTO.instagram,
  login: "https://colegiomedicocorrientes.com/panel/login",
} as const;

export const CONVENIO_EMAIL = CONVENIO.email;
export const CONVENIO_WA_LINK = linkWhatsApp(CONTACTO.whatsapp.sede, CONVENIO.mensajeWhatsApp);
