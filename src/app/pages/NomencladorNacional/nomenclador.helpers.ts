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

// ── Orden de los galenos ─────────────────────────────────────────────────────
// El orden en que el Colegio los lee y los carga, que **no** es el alfabético:
// primero el par quirúrgico (galeno + gasto), después práctica, después el par
// radiológico, y al final los gastos sueltos. Es el orden del boletín impreso,
// así que cualquier pantalla que los liste tiene que respetarlo o el operador
// pierde el hilo al comparar contra el papel.
//
// Lo que no está acá va después, alfabético: son los galenos particulares de
// alguna obra social (FASO, NUNOT, TAC, urología, ginecología…), que aparecen
// en pocas y no tienen un orden pactado.
const ORDEN_GALENOS: readonly string[] = [
  "galeno_quirurgico",
  "gasto_quirurgico",
  "galeno_practica",
  "galeno_radiologico",
  "gasto_radiologico",
  "gasto_bioquimico",
  "gasto_otros",
];

/**
 * La posición de un galeno en el orden del Colegio. Los que no están en la
 * lista caen todos al final, donde desempata el nombre.
 */
export function ordenGaleno(codigo: string): number {
  const i = ORDEN_GALENOS.indexOf(codigo);
  return i === -1 ? ORDEN_GALENOS.length : i;
}

/**
 * Comparador para ordenar cualquier lista de galenos: primero por el orden
 * pactado, después alfabético por nombre.
 *
 * Se usa en todas las pantallas que los listan para que el orden sea uno solo y
 * no una decisión que cada una toma por su cuenta.
 */
export function compararGalenos(
  a: { codigo: string; nombre?: string | null },
  b: { codigo: string; nombre?: string | null },
): number {
  const d = ordenGaleno(a.codigo) - ordenGaleno(b.codigo);
  return d !== 0 ? d : (a.nombre ?? "").localeCompare(b.nombre ?? "");
}
