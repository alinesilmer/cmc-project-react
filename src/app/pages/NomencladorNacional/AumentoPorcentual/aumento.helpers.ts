import type { CifraItem } from "@/app/components/ui/Cifras/Cifras";
import { formatoPesos } from "@/app/shared/lib/formatos";
import type { AumentoPorcentualResult, Origen } from "../nomenclador.types";

export type Alcance = "todos" | "codigos" | "rango";
export type FiltroEstado = "todos" | "actualiza" | "omitido";

export const ORIGENES: Origen[] = ["NE", "NN"];

/** Tope de códigos sueltos y largo de cada uno: el pedido viaja entero al servidor. */
export const MAX_CODIGOS = 200;
export const LARGO_CODIGO = 20;

export function fmtMonto(v: string | null): string {
  if (v == null) return "—";
  const n = parseFloat(v);
  return Number.isFinite(n) ? formatoPesos.format(n) : "—";
}

/** El porcentaje tipeado como número; con coma o punto, `null` si no es un número. */
export function leerPorcentaje(texto: string): number | null {
  const n = parseFloat(texto.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Con -100 o menos los precios quedarían en cero o negativos. */
export function porcentajeValido(n: number | null): n is number {
  return n !== null && n !== 0 && n > -100;
}

/** El resultado trae algo para guardar (valores o galenos). */
export function hayCambios(r: AumentoPorcentualResult | null): boolean {
  return !!r && r.actualizados + r.galenos_actualizados > 0;
}

export const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** Las cifras de un resultado: valores y galenos, y sólo si los hay, omitidos y errores. */
export function cifrasDe(r: AumentoPorcentualResult, verbo: string): CifraItem[] {
  return [
    { valor: r.actualizados, rotulo: `${r.actualizados === 1 ? "valor" : "valores"} ${verbo}` },
    { valor: r.galenos_actualizados, rotulo: `${r.galenos_actualizados === 1 ? "galeno" : "galenos"} ${verbo}` },
    ...(r.omitidos > 0 ? [{ valor: r.omitidos, rotulo: r.omitidos === 1 ? "omitido" : "omitidos", tono: "apagada" as const }] : []),
    ...(r.errores.length > 0 ? [{ valor: r.errores.length, rotulo: "con error", tono: "error" as const }] : []),
  ];
}
