import { hoyISO } from "@/app/shared/lib/fechas";

// ─── Helpers ──────────────────────────────────────────────────────────────────


// hoyISO y no toISOString(): este último pasa la hora local a UTC.
export const today = hoyISO;

export function parseMonto(s: string | null | undefined): number | null {
  if (s == null || s === "") return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

export function fmtUnidad(s: string | null | undefined): string {
  const n = parseMonto(s);
  return n == null ? "—" : n.toFixed(4);
}
