// Parseo de precios y detección de "por presupuesto". Reutilizado por los lectores.
import type { Cell } from "./types";

/** La celda/tramo dice "POR PRESUPUESTO" / "POR PRESUP" / "PP" en vez de un valor. */
export function isPorPresupuesto(text: string): boolean {
  return /por\s*presup/i.test(text) || /(^|\s)PP(\s|$)/i.test(text);
}

/** Normaliza un precio en texto (formato AR "1.234,56") a decimal con punto ("1234.56"). */
export function normalizePrice(raw: string): string {
  let s = String(raw).replace(/\$/g, "").replace(/\s/g, "").trim();
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", "."); // coma = decimal, punto = miles
  } else if (!/^\d+\.\d{1,2}$/.test(s)) {
    s = s.replace(/\./g, ""); // sin coma y no es "0.00": los puntos son miles
  }
  return s;
}

/** Interpreta una celda como precio. `presupuesto` true si dice por presupuesto. null si no es precio. */
export function parsePrecioCell(cell: Cell): { value: string; presupuesto: boolean } | null {
  if (cell == null || cell === "") return null;
  if (typeof cell === "number") {
    if (!Number.isFinite(cell)) return null;
    return { value: String(Math.round(cell * 100) / 100), presupuesto: false };
  }
  const str = String(cell).trim();
  if (!str) return null;
  if (isPorPresupuesto(str)) return { value: "", presupuesto: true };
  const norm = normalizePrice(str);
  const n = parseFloat(norm);
  if (Number.isFinite(n) && /\d/.test(norm)) {
    return { value: String(Math.round(n * 100) / 100), presupuesto: false };
  }
  return null; // texto no numérico (ej "No Cubierto x PMO") → no es precio
}
