/** Qué tan largo es el texto del descuento. */
export type LargoDescuento = "corto" | "medio" | "largo";

export function largoDescuento(texto: string | null | undefined): LargoDescuento {
  const n = texto?.trim().length ?? 0;
  if (n <= 6) return "corto";
  if (n <= 14) return "medio";
  return "largo";
}
