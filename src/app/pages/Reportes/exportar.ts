// Exportación de las tablas de reportes.
//
// Se exporta EXACTAMENTE lo que se está viendo (mismos filtros, mismo orden):
// si el usuario exporta algo distinto de lo que tiene en pantalla, el archivo
// deja de ser confiable para discutirlo con la obra social.
//
// El CSV se arma a mano —son datos tabulares simples y no justifica una
// dependencia— y el Excel usa `xlsx`, que ya está en el proyecto y se importa
// diferido para no sumarlo al bundle de quien nunca exporta.

export interface ColumnaExport<T> {
  header: string;
  /** Valor "crudo" para la celda: número para los importes, texto para el resto. */
  value: (row: T) => string | number | null;
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
  // Excel en es-AR interpreta la coma como separador de columnas, así que se
  // usa `;` y se citan las celdas que puedan romper la fila.
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

export async function exportarExcel<T>(
  filas: T[],
  columnas: ColumnaExport<T>[],
  nombre: string,
  hoja = "Reporte"
): Promise<void> {
  const XLSX = await import("xlsx");
  const datos = filas.map((f) => {
    const o: Record<string, string | number | null> = {};
    for (const c of columnas) o[c.header] = c.value(f);
    return o;
  });
  const ws = XLSX.utils.json_to_sheet(datos, {
    header: columnas.map((c) => c.header),
  });
  // Ancho de columna aproximado por el largo del encabezado y de los datos.
  ws["!cols"] = columnas.map((c) => ({
    wch: Math.min(
      44,
      Math.max(
        c.header.length + 2,
        ...filas.slice(0, 200).map((f) => String(c.value(f) ?? "").length + 2)
      )
    ),
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, hoja.slice(0, 31));
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  descargar(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${nombre}.xlsx`
  );
}
