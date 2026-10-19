import type ExcelJS from "exceljs";

// Los colores del Colegio, los mismos del PDF.
export const C = {
  azul: "FF173F70",
  crema: "FFF5EFE0",
  amarillo: "FFF7E9AA",
  blanco: "FFFFFFFF",
  banda: "FFFAF7F0",
  filete: "FFE2E8F0",
  tinta: "FF0F172A",
  gris: "FF64748B",
};

export const relleno = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

// Los estilos se arman una sola vez y se comparten entre celdas: con un padrón de 500 filas son miles de celdas.
export const E = {
  titulo: { name: "Times New Roman", size: 26, color: { argb: C.crema } },
  sub: { name: "Calibri", size: 9, bold: true, color: { argb: C.amarillo } },
  rotulo: { name: "Calibri", size: 8, bold: true, color: { argb: C.gris } },
  cifra: { name: "Times New Roman", size: 20, color: { argb: C.azul } },
  banda: { name: "Calibri", size: 10, bold: true, color: { argb: C.azul } },
  cabecera: { name: "Calibri", size: 9, bold: true, color: { argb: C.crema } },
  dato: { name: "Calibri", size: 9, color: { argb: C.tinta } },
  pie: { name: "Calibri", size: 8, italic: true, color: { argb: C.gris } },
} satisfies Record<string, Partial<ExcelJS.Font>>;

/** Sin grilla: sólo un filete debajo de cada fila. */
export const FILETE: Partial<ExcelJS.Borders> = { bottom: { style: "thin", color: { argb: C.filete } } };

export const FONDO_BLANCO = relleno(C.blanco);
export const FONDO_BANDA = relleno(C.banda);

// Column letter from 1-based index (1=A, 2=B, …)
export function colLetter(n: number): string {
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

type ExtensionImagen = "jpeg" | "png" | "gif";

// Attempt to embed a logo data URL into the workbook; returns imageId or null.
export function tryAddLogoImage(wb: ExcelJS.Workbook, dataUrl: string | null): number | null {
  if (!dataUrl) return null;
  try {
    const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|gif);base64,(.+)$/i);
    if (!match) return null;
    const rawExt = match[1].toLowerCase();
    const extension: ExtensionImagen = rawExt === "jpg" ? "jpeg" : (rawExt as ExtensionImagen);
    return wb.addImage({ base64: match[2], extension });
  } catch {
    return null;
  }
}

/** Reparte las columnas en hasta cuatro tramos parejos: uno por tarjeta. */
export function tramos(ncols: number, cuantos: number): [number, number][] {
  const n = Math.min(cuantos, ncols);
  const salida: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    salida.push([Math.floor((i * ncols) / n) + 1, Math.floor(((i + 1) * ncols) / n)]);
  }
  return salida;
}
