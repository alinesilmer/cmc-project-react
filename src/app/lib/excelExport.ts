/**
 * Escritura de Excel — única vía del proyecto.
 *
 * Por qué existe: hasta acá convivían dos librerías de Excel. `exceljs` para
 * los exports con formato (encabezados en negrita, anchos, logos) y `xlsx`
 * (SheetJS) para los exports simples. Eran 1,4 MB de librería duplicada y dos
 * estéticas distintas de archivo según qué pantalla lo generara.
 *
 * El reparto quedó así, y no es intercambiable:
 *
 *   * **Escribir → `exceljs`** (este archivo). SheetJS en su edición
 *     Community no escribe estilos: su `write_sty_xml` emite un `styles.xml`
 *     fijo con una sola fuente, sin rellenos ni bordes, y `get_cell_style`
 *     sólo mapea formatos numéricos. Negrita, colores, celdas combinadas e
 *     imágenes son de la edición Pro (paga).
 *   * **Leer → `xlsx`** (SheetJS, ver `utils/xlsxParser.ts` y
 *     `utils/precios/`). ExcelJS no tiene lector de `.xls` binario legacy
 *     —sólo `xlsx` y `csv`—, y hay tres inputs del panel que aceptan `.xls`.
 *
 * O sea: cada una quedó en lo que la otra no puede hacer. Antes de mover algo
 * de acá a SheetJS, o al revés, revisar ese párrafo.
 */

/** Una hoja del libro. Las filas son objetos: las claves son los encabezados. */
export type ExcelSheet = {
  /** Nombre de la pestaña. Excel corta en 31 caracteres, así que se trunca acá. */
  name: string;
  rows: Record<string, unknown>[];
  /**
   * Orden explícito de columnas. Si se omite se usan las claves de la primera
   * fila — que en un objeto literal conservan el orden de escritura, así que
   * alcanza para la mayoría de los casos.
   */
  headers?: string[];
  /** Anchos fijos en caracteres. Si se omite se calculan según el contenido. */
  widths?: number[];
};

const MIME_XLSX =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const MIN_WIDTH = 8;
const MAX_WIDTH = 45;
/** Cuántas filas se miran para calcular el ancho. Con miles de filas, medirlas
 *  todas cuesta más de lo que mejora el resultado. */
const WIDTH_SAMPLE = 200;

/** Excel rechaza \ / ? * [ ] : en el nombre de hoja, y corta en 31. */
function safeSheetName(name: string, index: number): string {
  const clean = name.replace(/[\\/?*[\]:]/g, "-").trim();
  return (clean || `Hoja ${index + 1}`).slice(0, 31);
}

function cellText(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
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

/**
 * Arma el libro y devuelve el Blob, sin descargarlo.
 *
 * Para quien ya tiene su propia función de descarga (`Reportes/exportar.ts`
 * usa la suya con `revokeObjectURL`). Si no es el caso, usar `downloadExcel`.
 */
export async function buildExcelBlob(sheets: ExcelSheet[]): Promise<Blob> {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();

  sheets.forEach((sheet, sheetIdx) => {
    const ws = wb.addWorksheet(safeSheetName(sheet.name, sheetIdx));
    const headers =
      sheet.headers ?? (sheet.rows.length ? Object.keys(sheet.rows[0]) : []);

    if (!headers.length) return; // hoja vacía: se crea igual, para no perder la pestaña

    // OJO con el índice: el setter de `Row.values` de ExcelJS hace
    // `if (value.hasOwnProperty('0')) offset = 1`, así que un array contiguo
    // arranca en la columna A. El idioma `[undefined, ...headers]` que se ve
    // dado vuelta en varios ejemplos deja la columna A vacía y corre toda la
    // tabla un lugar a la derecha (ver lib/exportRowsFile.ts, que lo tenía).
    const headerRow = ws.getRow(1);
    headerRow.values = headers;
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: "middle" };

    sheet.rows.forEach((row, i) => {
      // Se escribe el valor crudo: los números tienen que llegar como números
      // o Excel no los suma ni los ordena bien.
      ws.getRow(2 + i).values = headers.map((h) => {
        const v = row[h];
        return v === null || v === undefined ? "" : (v as never);
      });
    });

    const widths = sheet.widths ?? autoWidths(headers, sheet.rows);
    widths.forEach((w, i) => {
      ws.getColumn(i + 1).width = w;
    });

    // Encabezado fijo al hacer scroll y filtros: en tablas de cientos de filas
    // es la diferencia entre un archivo usable y uno que hay que retocar.
    ws.views = [{ state: "frozen", ySplit: 1 }];
    if (sheet.rows.length) {
      ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
    }
  });

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: MIME_XLSX });
}

/** Arma el libro y dispara la descarga. Es el camino normal. */
export async function downloadExcel(
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
