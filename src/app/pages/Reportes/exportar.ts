import { formatoPesos } from "@/app/shared/lib/formatos";
// Exportación de las tablas de reportes.

export interface ColumnaExport<T> {
  header: string;
  /** Valor "crudo" para la celda: número para los importes, texto para el resto. */
  value: (row: T) => string | number | null;
  /** Cómo se muestra un número: cantidad entera o importe. Sin esto es texto. */
  tipo?: "numero" | "moneda";
}

/** Lo que hace falta para armar el PDF o el Excel de un reporte. */
export interface DocumentoReporte<T> {
  /** Qué se lista: «Médicos», «Códigos»… */
  titulo: string;
  /** Título del documento; sin esto es «Reporte de» + lo que se lista. */
  encabezado?: string;
  /** No sumar la columna de importes (precios unitarios, por ejemplo). */
  sinTotal?: boolean;
  /** «Octubre 2026». */
  periodo: string;
  /** «Todas las obras sociales» o el nombre de la elegida. */
  obraSocial: string;
  columnas: ColumnaExport<T>[];
  filas: T[];
  /** Nombre del archivo, sin extensión. */
  nombre: string;
}


/** El valor de una celda como texto para leer: importes con `$`, miles con punto. */
export function textoDeCelda<T>(columna: ColumnaExport<T>, fila: T): string {
  const v = columna.value(fila);
  if (v == null || v === "") return "";
  if (typeof v !== "number") return String(v);
  if (columna.tipo === "moneda") return formatoPesos.format(v);
  return columna.tipo === "numero" ? v.toLocaleString("es-AR") : String(v);
}

/** El título del documento: el propio o «Reporte de …». */
export const encabezadoDe = (reporte: { titulo: string; encabezado?: string }): string =>
  reporte.encabezado ?? `Reporte de ${reporte.titulo.toLowerCase()}`;

/** Suma de la primera columna de importes, ya con formato; `null` si no hay ninguna. */
export function totalFacturado<T>(columnas: ColumnaExport<T>[], filas: T[]): string | null {
  const columna = columnas.find((c) => c.tipo === "moneda");
  if (!columna) return null;
  const total = filas.reduce((suma, f) => suma + (Number(columna.value(f)) || 0), 0);
  return formatoPesos.format(total);
}

function descargar(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Sin esto el blob queda retenido hasta que se recargue la página.
  URL.revokeObjectURL(url);
}

/** Nombre de archivo sin caracteres que Windows rechaza. */
export function nombreArchivo(base: string, periodo?: string): string {
  const limpio = base
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
  return periodo ? `${limpio}-${periodo}` : limpio;
}

function celdaCsv(v: string | number | null): string {
  if (v == null) return "";
  const s = String(v);
  // Excel en es-AR interpreta la coma como separador de columnas, así que se usa `;` y se citan las celdas que puedan romper la fila.
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportarCsv<T>(
  filas: T[],
  columnas: ColumnaExport<T>[],
  nombre: string
): void {
  const lineas = [
    columnas.map((c) => celdaCsv(c.header)).join(";"),
    ...filas.map((f) => columnas.map((c) => celdaCsv(c.value(f))).join(";")),
  ];
  // BOM: sin él Excel abre el CSV en ANSI y rompe los acentos.
  const blob = new Blob(["﻿" + lineas.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });
  descargar(blob, `${nombre}.csv`);
}

export async function exportarExcel<T>(reporte: DocumentoReporte<T>): Promise<void> {
  const { construirExcelReporte } = await import("./reporteExcel");
  descargar(await construirExcelReporte(reporte), `${reporte.nombre}.xlsx`);
}

export async function exportarPdf<T>(reporte: DocumentoReporte<T>): Promise<void> {
  const { construirPdfReporte } = await import("./reportePdf");
  descargar(await construirPdfReporte(reporte), `${reporte.nombre}.pdf`);
}
