import { formatFecha } from "@/app/shared/lib/fechas";
import { sinControl } from "@/app/shared/lib/utiles";

export function normalizeText(value: unknown, maxLen = 180): string {
  const text = sinControl(String(value ?? ""), " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!text) return "";
  return text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text;
}

/** Fecha de calendario o instante en `DD/MM/AAAA`, sin correr un día por la zona horaria. */
export function formatApiDate(value: string | null): string {
  return value ? formatFecha(value) : "Sin fecha informada";
}

export function buildPdfFilename(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `Boletín-Informativo-${yyyy}${mm}${dd}.pdf`;
}

export async function fetchAsDataUrl(src: string): Promise<string | null> {
  try {
    if (!src) return null;
    if (src.startsWith("data:image/")) return src;

    const response = await fetch(src, { cache: "no-store" });
    if (!response.ok) return null;

    const blob = await response.blob();

    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function getImageFormat(dataUrl: string): "PNG" | "JPEG" | "WEBP" {
  const lower = dataUrl.toLowerCase();
  if (lower.startsWith("data:image/jpeg") || lower.startsWith("data:image/jpg")) {
    return "JPEG";
  }
  if (lower.startsWith("data:image/webp")) return "WEBP";
  return "PNG";
}