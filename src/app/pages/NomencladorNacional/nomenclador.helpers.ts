import { hoyISO } from "@/app/shared/lib/fechas";

export function parseMonto(s: string | null | undefined): number {
  if (!s) return 0;
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// hoyISO y no toISOString(): este último pasa la hora local a UTC, así que después de las 21:00 en Argentina devolvía el día siguiente.
export const today = hoyISO;

// ── Orden de los galenos ─────────────────────────────────────────────────────
// El orden en que el Colegio los lee y los carga, que **no** es el alfabético: primero el par quirúrgico (galeno + gasto).
const ORDEN_GALENOS: readonly string[] = [
  "galeno_quirurgico",
  "gasto_quirurgico",
  "galeno_practica",
  "galeno_radiologico",
  "gasto_radiologico",
  "gasto_bioquimico",
  "gasto_otros",
];

/** La posición de un galeno en el orden del Colegio. */
function ordenGaleno(codigo: string): number {
  const i = ORDEN_GALENOS.indexOf(codigo);
  return i === -1 ? ORDEN_GALENOS.length : i;
}

/** Comparador para ordenar cualquier lista de galenos: primero por el orden pactado, después alfabético por nombre. */
export function compararGalenos(
  a: { codigo: string; nombre?: string | null },
  b: { codigo: string; nombre?: string | null },
): number {
  const d = ordenGaleno(a.codigo) - ordenGaleno(b.codigo);
  return d !== 0 ? d : (a.nombre ?? "").localeCompare(b.nombre ?? "");
}
