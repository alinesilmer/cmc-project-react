import { marked } from "marked";
import DOMPurify from "dompurify";

/** Markdown de una publicación a HTML seguro. */

// Los enlaces del contenido salen del sitio, así que se fuerzan `rel` y `target`.
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

/** HTML listo para inyectar. */
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
