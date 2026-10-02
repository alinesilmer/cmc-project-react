import type { DepartamentoWhatsApp } from "./chatbot.enlaces";

interface ChatLink {
  label: string;
  href: string;
  external?: boolean;
}

interface MenuOption {
  /** El texto del botón. */
  label: string;
  /** Lo que se le manda al motor cuando se toca el botón. */
  query: string;
}

export interface Intent {
  id: string;
  keywords: string[];
  chipLabel?: string;
  answer: string;
  links?: ChatLink[];
  whatsapp?: DepartamentoWhatsApp;
  /** Si está, se consulta la API antes de responder (ver useChatbot). */
  asyncAction?: "check_obra_social";
  /** Si está, se muestran botones con consultas ya armadas debajo de la respuesta. */
  menuOptions?: MenuOption[];
}

type RolMensaje = "bot" | "user";

export interface ChatMsg {
  id: string;
  role: RolMensaje;
  text: string;
  links?: ChatLink[];
  whatsapp?: DepartamentoWhatsApp;
  menuOptions?: MenuOption[];
}
