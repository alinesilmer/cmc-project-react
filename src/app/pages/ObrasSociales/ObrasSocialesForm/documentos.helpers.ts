import type { TipoDocumento } from "../obrasSociales.types";

export const TIPO_DOCUMENTOS: TipoDocumento[] = [
  "convenio",
  "normas",
  "valores_convenidos",
];

// ─── CUIT auto-format ─────────────────────────────────────────────────────────

export function formatCUIT(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

// ─── File validation ──────────────────────────────────────────────────────────

// El backend valida por magic bytes contra una whitelist (app/common/uploads.py, perfil DOCUMENTOS): PDF e imágenes.
export const DOC_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.tif,.tiff";

export function validateDocFile(f: File): string | null {
  const allowed = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/tiff",
  ];
  if (!allowed.includes(f.type))
    return "Solo se aceptan PDF o imágenes (JPG, PNG, WEBP, TIFF).";
  if (f.size > 10 * 1024 * 1024)
    return "El archivo no puede superar los 10 MB.";
  return null;
}
