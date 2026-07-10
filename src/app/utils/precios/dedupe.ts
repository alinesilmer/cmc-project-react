// Deduplicación de filas por código: ante duplicados, gana el de mayor precio total.
import type { PrecioRow } from "./types";

/** Precio total de una fila (honorarios + ayudante + gastos). "Por presupuesto" cuenta como 0. */
function rowTotal(r: PrecioRow): number {
  return (parseFloat(r.precio_1) || 0) + (parseFloat(r.precio_2) || 0) + (parseFloat(r.gastos) || 0);
}

/**
 * Si un código aparece varias veces, conserva la fila de mayor precio total y descarta
 * las demás. Preserva el orden de primera aparición.
 */
export function dedupeByCodigo(rows: PrecioRow[]): PrecioRow[] {
  const best = new Map<string, PrecioRow>();
  for (const r of rows) {
    const prev = best.get(r.codigo);
    if (!prev || rowTotal(r) > rowTotal(prev)) best.set(r.codigo, r);
  }
  return [...best.values()];
}
