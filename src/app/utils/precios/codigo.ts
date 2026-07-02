// Parseo de códigos CMC (6 dígitos). Reutilizado por los tres lectores.
import type { Cell } from "./types";

/**
 * Extrae un código de 6 dígitos del comienzo de un texto:
 *  - plano:    "220204"                       → "220204"
 *  - separado: "22.02.04" / "22,23,20" / "22.33,23" (grupos de 2, punto o coma) → 6 dígitos
 * No colisiona con precios: esos usan grupos de 3 dígitos (miles) y coma decimal.
 */
export function extractCodigo(raw: string): string | null {
  const s = raw.trim();
  const plain = s.match(/^(\d{6})(?![\d.,])/);
  if (plain) return plain[1];
  const sep = s.match(/^(\d{2}[.,]\d{2}[.,]\d{2})(?![\d.,])/);
  if (sep) return sep[1].replace(/[.,]/g, "");
  return null;
}

/**
 * Para el lector de PDF: encuentra el código en los tokens de una línea, admitiendo
 * que el PDF lo haya partido en varios tokens (ej: "22" "." "02" "." "04").
 * `tokens` viene ordenado de izquierda a derecha.
 */
export function findCodigo(tokens: string[]): string | null {
  for (const t of tokens) {
    const c = extractCodigo(t);
    if (c) return c;
  }
  let joined = "";
  for (const t of tokens) {
    const s = t.trim();
    if (s === "") continue;
    if (/^[\d.,]+$/.test(s)) joined += s;
    else break; // primer token con letras → fin del posible código
  }
  const sep = joined.match(/^\d{2}[.,]\d{2}[.,]\d{2}/);
  return sep ? sep[0].replace(/[.,]/g, "") : null;
}

/**
 * Para celdas de Excel/CSV: número (70660 → "070660", con relleno a 6 dígitos) o
 * texto con separadores ("22.01.01" → "220101"). null si no parece un código.
 */
export function normalizeCodigoCell(cell: Cell): string | null {
  if (cell == null || cell === "") return null;
  if (typeof cell === "number") {
    if (!Number.isInteger(cell)) return null; // los decimales no son códigos
    const s = String(cell);
    return s.length >= 4 && s.length <= 6 ? s.padStart(6, "0") : null;
  }
  const str = String(cell).trim();
  if (!str) return null;
  const c = extractCodigo(str);
  if (c) return c;
  if (/^\d{4,6}$/.test(str)) return str.padStart(6, "0");
  return null;
}
