/**
 * Qué tan largo es el texto del descuento. Quien carga el beneficio escribe
 * lo que quiere: «10%», «1 MES GRATIS» o «Descuento exclusivo para socios».
 * La banda de color ajusta la letra según esto en vez de cortar el texto.
 */
export type LargoDescuento = "corto" | "medio" | "largo";

export function largoDescuento(texto: string | null | undefined): LargoDescuento {
  const n = texto?.trim().length ?? 0;
  if (n <= 6) return "corto";
  if (n <= 14) return "medio";
  return "largo";
}
