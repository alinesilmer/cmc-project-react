// Salidas CSV: el que descarga el usuario y el que consume POST /api/valores_nm/importar_csv.
import type { PrecioRow } from "./types";

/** CSV para descargar/revisar: codigo,precio_1,precio_2,gastos,por_presupuesto,vigencia,nro_obrasocial */
export function rowsToCsv(
  rows: PrecioRow[],
  extra?: { vigencia?: string; nroObraSocial?: string },
): string {
  const vig = extra?.vigencia ?? "";
  const nro = extra?.nroObraSocial ?? "";
  const header = "codigo,precio_1,precio_2,gastos,por_presupuesto,vigencia,nro_obrasocial";
  const body = rows
    .map((r) => `${r.codigo},${r.precio_1},${r.precio_2},${r.gastos},${r.por_presupuesto ? "1" : "0"},${vig},${nro}`)
    .join("\r\n");
  return "﻿" + header + "\r\n" + body + (body ? "\r\n" : "");
}

/**
 * CSV por componente que espera el backend: precio_1 → Honorarios, precio_2 → Ayudante,
 * gastos → Gastos; todos fijos (cantidad 0, sin galeno). Por presupuesto → fila con
 * `presupuesto` = x. Solo se emite una línea por componente cuando tiene valor.
 */
export function buildComponentCsv(rows: PrecioRow[], origen: string): string {
  const header =
    "codigo_colegio,origen,descripcion,valor_unitario,nivel,especialidad,concepto,galeno_codigo,cantidad,presupuesto";
  const lines = [header];
  for (const r of rows) {
    if (r.por_presupuesto) {
      lines.push(`${r.codigo},${origen},,,,,,,,x`);
      continue;
    }
    if (r.precio_1) lines.push(`${r.codigo},${origen},,${r.precio_1},,,Honorarios,,0,`);
    if (r.precio_2) lines.push(`${r.codigo},${origen},,${r.precio_2},,,Ayudante,,0,`);
    if (r.gastos) lines.push(`${r.codigo},${origen},,${r.gastos},,,Gastos,,0,`);
  }
  return lines.join("\r\n") + "\r\n";
}
