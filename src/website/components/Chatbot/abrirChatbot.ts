/** Evento que escucha el chatbot para abrirse desde cualquier parte del sitio. */
export const EVENTO_ABRIR_CHATBOT = "cmc:open-chatbot";

/** Abre el chatbot, por ejemplo desde el botón del hero de la portada. */
export function abrirChatbot(): void {
  window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_CHATBOT));
}
