import { safeStr as cellText } from "@/app/shared/lib/utiles";

/** Escritura de Excel — única vía del proyecto. */

/** Una hoja del libro. Las filas son objetos: las claves son los encabezados. */
type ExcelSheet = {
  /** Nombre de la pestaña. Excel corta en 31 caracteres, así que se trunca acá. */
  name: string;
  rows: Record<string, unknown>[];
  /** Orden explícito de columnas. */
  headers?: string[];
  /** Anchos fijos en caracteres. Si se omite se calculan según el contenido. */
  widths?: number[];
};

const MIME_XLSX =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const MIN_WIDTH = 8;
const MAX_WIDTH = 45;
/** Cuántas filas se miran para calcular el ancho. */
const WIDTH_SAMPLE = 200;

/** Excel rechaza \ / ? * [ ] : en el nombre de hoja, y corta en 31. */
function safeSheetName(name: string, index: number): string {
  const clean = name.replace(/[\\/?*[\]:]/g, "-").trim();
  return (clean || `Hoja ${index + 1}`).slice(0, 31);
}
function autoWidths(headers: string[], rows: Record<string, unknown>[]): number[] {
  return headers.map((h, i) => {
    let max = h.length;
    for (let r = 0; r < Math.min(rows.length, WIDTH_SAMPLE); r++) {
      const len = cellText(rows[r][headers[i]]).length;
      if (len > max) max = len;
    }
    return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, max + 2));
  });
}

/** Arma el libro y devuelve el Blob, sin descargarlo. */
async function buildExcelBlob(sheets: ExcelSheet[]): Promise<Blob> {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();

  sheets.forEach((sheet, sheetIdx) => {
    const ws = wb.addWorksheet(safeSheetName(sheet.name, sheetIdx));
    const headers =
      sheet.headers ?? (sheet.rows.length ? Object.keys(sheet.rows[0]) : []);

    if (!headers.length) return; // hoja vacía: se crea igual, para no perder la pestaña

    // OJO con el índice: el setter de `Row.values` de ExcelJS hace `if (value.hasOwnProperty('0')) offset = 1`.
    const headerRow = ws.getRow(1);
    headerRow.values = headers;
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: "middle" };

    sheet.rows.forEach((row, i) => {
      // Se escribe el valor crudo: los números tienen que llegar como números o Excel no los suma ni los ordena bien.
      ws.getRow(2 + i).values = headers.map((h) => {
        const v = row[h];
        return v === null || v === undefined ? "" : (v as never);
      });
    });

    const widths = sheet.widths ?? autoWidths(headers, sheet.rows);
    widths.forEach((w, i) => {
      ws.getColumn(i + 1).width = w;
    });

    // Encabezado fijo al hacer scroll y filtros: en tablas de cientos de filas es la diferencia entre un archivo usable y uno que hay…
    ws.views = [{ state: "frozen", ySplit: 1 }];
    if (sheet.rows.length) {
      ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
    }
  });

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: MIME_XLSX });
}

/** Arma el libro y dispara la descarga. Es el camino normal. */
async function downloadExcel(
  filename: string,
  sheets: ExcelSheet[]
): Promise<void> {
  const [blob, { saveAs }] = await Promise.all([
    buildExcelBlob(sheets),
    import("file-saver"),
  ]);
  saveAs(blob, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

/** Atajo para el caso más común: una sola hoja. */
export function downloadExcelSheet(
  filename: string,
  sheetName: string,
  rows: Record<string, unknown>[],
  opts?: { headers?: string[]; widths?: number[] }
): Promise<void> {
  return downloadExcel(filename, [
    { name: sheetName, rows, headers: opts?.headers, widths: opts?.widths },
  ]);
}
