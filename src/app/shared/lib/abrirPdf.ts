// Abre un PDF generado por la API en una pestaña nueva (en vez de descargarlo).
//
// Los navegadores bloquean `window.open` si no se llama dentro del clic del usuario, y acá el PDF
// llega después de un pedido que puede tardar. Por eso la pestaña se abre vacía en el clic
// (`abrirVentanaPdf`) y cuando llega el archivo se le carga el PDF (`mostrarPdf`). Si el navegador
// no deja abrir la pestaña, se descarga como antes.
import { saveAs } from "./fileSaver";

export function abrirVentanaPdf(): Window | null {
  const ventana = window.open("", "_blank");
  if (ventana) {
    try {
      ventana.document.title = "Generando PDF…";
      ventana.document.body.style.cssText = "font-family: system-ui, sans-serif; padding: 24px; color: #444;";
      ventana.document.body.textContent = "Generando el PDF…";
    } catch {
      // una pestaña sin acceso al documento igual sirve para cargar el PDF después
    }
  }
  return ventana;
}

export async function mostrarPdf(blob: Blob, ventana: Window | null, nombreArchivo?: string): Promise<void> {
  if (!ventana || ventana.closed) {
    await saveAs(blob, nombreArchivo);
    return;
  }
  const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
  ventana.location.href = url;
  // La pestaña ya tiene el archivo: se libera después de darle tiempo a cargar.
  setTimeout(() => URL.revokeObjectURL(url), 5 * 60_000);
}
