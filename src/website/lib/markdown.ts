import { marked } from "marked";
import DOMPurify from "dompurify";

/**
 * Markdown de una publicación a HTML seguro.
 *
 * El contenido lo escribe un editor del Colegio, pero se inyecta con
 * `dangerouslySetInnerHTML` en una página pública, así que pasa por DOMPurify
 * igual: una cuenta comprometida no debería poder ejecutar nada en el sitio.
 *
 * Estaba duplicado en `NewsForm` (la vista previa del editor) y en
 * `NoticiaContent` (lo que ve el visitante). Que fueran dos copias era el
 * problema: la vista previa podía dejar pasar algo que la pública recortaba, o
 * al revés, y el editor no se enteraba hasta publicar.
 */

// Los enlaces del contenido salen del sitio, así que se fuerzan `rel` y
// `target`. `marked` no los agrega y DOMPurify no los inventa; sin esto la
// pestaña destino queda con acceso a `window.opener`.
let hookRegistrado = false;

function registrarHook(): void {
  if (hookRegistrado) return;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A" && node.hasAttribute("href")) {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
  hookRegistrado = true;
}

const escapar = (texto: string): string =>
  texto.replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * HTML listo para inyectar. Si `marked` falla —contenido raro, no un ataque—
 * devuelve el texto escapado en vez de nada: es preferible mostrar la fuente
 * que dejar la publicación en blanco.
 */
export function markdownSeguro(contenido: string): string {
  if (!contenido) return "";
  registrarHook();
  try {
    const crudo = marked.parse(contenido, { gfm: true, breaks: true }) as string;
    return DOMPurify.sanitize(crudo);
  } catch {
    return escapar(contenido);
  }
}
