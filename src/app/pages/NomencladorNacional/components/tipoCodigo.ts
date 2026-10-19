import type { TipoCodigo } from "../nomenclador.types";

/** Opciones del filtro «Tipo» de códigos y valores. Sanatorio no se ofrece. */
export const TIPOS_CODIGO: { value: TipoCodigo; label: string }[] = [
  { value: "Consulta", label: "Consultas" },
  { value: "Practica", label: "Prácticas" },
  { value: "Honorarios individuales", label: "Honorarios individuales" },
];

/** Tipo de un código según su categoría. Mismo criterio que el backend
 *  (`service.condicion_tipo`): sin categoría, o con una desconocida, es Práctica.
 *  Sanatorio devuelve `null`: no entra en ninguna opción del filtro. */
export function tipoDeCategoria(categoria: string | null | undefined): TipoCodigo | null {
  const c = (categoria ?? "").trim();
  if (c === "Consulta" || c === "Honorarios individuales") return c;
  if (c === "Sanatorio") return null;
  return "Practica";
}

export const TIPO_CODIGO_LABEL: Record<TipoCodigo, string> = {
  Consulta: "Consulta",
  Practica: "Práctica",
  "Honorarios individuales": "Hon. individuales",
};
