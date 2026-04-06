import {
  longDateTimeFormatter,
  shortDateFormatter,
} from "./boletinConsultaComun.constants";
import type { ConsultaComunItem } from "./boletinConsultaComun.types";

export function safeNum(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return 0;

    let normalized = raw;

    if (raw.includes(",")) {
      normalized = raw.replace(/\./g, "").replace(",", ".");
    } else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) {
      normalized = raw.replace(/\./g, "");
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function normalizeText(value: unknown, maxLen = 180): string {
  const text = String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!text) return "";
  return text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text;
}

export function parseFecha(value: string | null): number | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function formatApiDate(value: string | null): string {
  const timestamp = parseFecha(value);
  if (timestamp == null) return "Sin fecha informada";
  return shortDateFormatter.format(new Date(timestamp));
}

export function buildPdfFilename(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `consulta-comun-obras-sociales-${yyyy}${mm}${dd}.pdf`;
}

export function formatGeneratedDate(date: Date): string {
  return longDateTimeFormatter.format(date);
}

export function getMostRecentLabel(items: ConsultaComunItem[]): string {
  const timestamps = items
    .map((item) => parseFecha(item.fechaCambio))
    .filter((value): value is number => value != null);

  if (timestamps.length === 0) return "Sin fecha informada";
  return shortDateFormatter.format(new Date(Math.max(...timestamps)));
}

export function fitLines(
  lines: string[],
  maxLines: number,
  withEllipsis = true
): string[] {
  if (lines.length <= maxLines) return lines;

  const trimmed = lines.slice(0, maxLines);

  if (withEllipsis && trimmed.length > 0) {
    trimmed[trimmed.length - 1] = `${trimmed[trimmed.length - 1].replace(
      /[….]$/,
      ""
    )}…`;
  }

  return trimmed;
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