import type { PrecioResponse } from "../types";

/** "número · nombre", con lo que tenga (un afiliado puede no tener uno de los dos). */
export const etiquetaAfiliado = (dni?: string | null, nombre?: string | null) =>
  [dni, nombre].filter(Boolean).join(" · ");

/** De dónde sale el precio: NN → "Nomenclador Nacional"; NE de valor fijo → "Valor
 *  fijo"; NE calculable → el galeno de los honorarios, con su nivel si es nivelado. */
export function etiquetaPrecio(p: PrecioResponse): string | null {
  if (!p.admitido || p.sin_precio || p.por_presupuesto || !p.origen) return null;
  if (p.origen === "NN") return "Nomenclador Nacional";
  if (p.tipo_valor === "fijo") return "Valor fijo";
  if (!p.galeno_nombre) return null;
  // En laparoscópica el nivel que cuenta es el cotizado.
  const nivel = p.via === "L" && p.nivel_cotizado != null ? p.nivel_cotizado : p.galeno_nivel;
  return nivel != null ? `${p.galeno_nombre} · Nivel ${nivel}` : p.galeno_nombre;
}
