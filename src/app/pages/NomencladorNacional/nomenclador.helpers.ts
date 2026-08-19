import { hoyISO } from "../../lib/fechas";

export function parseMonto(s: string | null | undefined): number {
  if (!s) return 0;
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// hoyISO y no toISOString(): este último pasa la hora local a UTC, así que
// después de las 21:00 en Argentina devolvía el día siguiente.
// Ver src/app/lib/fechas.ts.
export const today = hoyISO;
