import ExcelJS from "exceljs";
import type { ObraSocial, Prestador, ExportOptions } from "./types";
import {
  fmtDate, safeStr, buildOsCode,
  pickNroPrestador, pickNombre, pickMatriculaProv,
  pickTelefonoConsulta, pickEspecialidad,
  pickDomicilioConsulta, pickMailParticular,
  pickCuit, pickCodigoPostal,
} from "./helpers";
import {
  CMC_NAME, CMC_PHONE, CMC_EMAIL, CMC_LOGO_SRC,
  fetchAsDataUrl,
} from "./institution";

const C = {
  headerBg: "FF0B1F3A",
  headerText: "FFFFFFFF",
  accentBg: "FF2962AA",
  titleText: "FF0B1F3A",
  white: "FFFFFFFF",
  altRow: "FFF6F9FD",
  border: "FFD8E2EE",
  metaText: "FF6B7A8D",
};

const BORDER = (): Partial<ExcelJS.Border> => ({
  style: "thin",
  color: { argb: C.border },
});
const CELL_BORDER = {
  top: BORDER(), bottom: BORDER(), left: BORDER(), right: BORDER(),
};

type ColSpec = { header: string; key: string; width: number };

function buildColSpecs(opts: ExportOptions): ColSpec[] {
  const cols: ColSpec[] = [
    { header: "N° Socio",              key: "nro",  width: 13 },
    { header: "Prestador",             key: "nom",  width: 44 },
    { header: "Matrícula Prov.",       key: "mat",  width: 16 },
    { header: "Teléfono consultorio",  key: "tel",  width: 22 },
  ];
  if (opts.includeCuit)
    cols.push({ header: "CUIT",        key: "cuit", width: 20 });
  cols.push({ header: "Especialidades",          key: "esp",  width: 36 });
  cols.push({ header: "Dirección consultorio",   key: "dom",  width: 52 });
  if (opts.includeEmail)
    cols.push({ header: "Correo electrónico",    key: "mail", width: 38 });
  if (opts.includeCP)
    cols.push({ header: "CP",                   key: "cp",   width: 10 });
  return cols;
}

function pickCellValue(p: Prestador, key: string): string {
  switch (key) {
    case "nro":  return safeStr(pickNroPrestador(p)) || "—";
    case "nom":  return safeStr(pickNombre(p)) || "—";
    case "mat":  return safeStr(pickMatriculaProv(p)) || "—";
    case "tel":  return safeStr(pickTelefonoConsulta(p)) || "—";
    case "cuit": return safeStr(pickCuit(p)) || "—";
    case "esp":  return safeStr(pickEspecialidad(p)) || "—";
    case "dom":  return safeStr(pickDomicilioConsulta(p)) || "—";
    case "mail": return safeStr(pickMailParticular(p)) || "—";
    case "cp":   return safeStr(pickCodigoPostal(p)) || "—";
    default:     return "—";
  }
}

// Column letter from 1-based index (1=A, 2=B, …)
function colLetter(n: number): string {
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

// Attempt to embed a logo data URL into the workbook; returns imageId or null.
function tryAddLogoImage(wb: ExcelJS.Workbook, dataUrl: string | null): number | null {
  if (!dataUrl) return null;
  try {
    const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|gif|webp|bmp);base64,(.+)$/i);
    if (!match) return null;
    const rawExt = match[1].toLowerCase();
    const ext = rawExt === "jpg" ? "jpeg" : rawExt;
    const validExts = ["jpeg", "png", "gif", "webp", "bmp"];
    if (!validExts.includes(ext)) return null;
    const base64 = match[2];
    return wb.addImage({ base64, extension: ext as any });
  } catch {
    return null;
  }
}

const HEADER_ROWS = 8; 

export async function buildExcel(
  rows: Prestador[],
  selectedOS: ObraSocial,
  opts: ExportOptions
): Promise<Blob> {
  const logoDataUrl = await fetchAsDataUrl(CMC_LOGO_SRC);
  const code = buildOsCode(selectedOS);
  const dateStr = fmtDate(new Date());
  const cols = buildColSpecs(opts);
  const NCOLS = cols.length;
  const lastColLetter = colLetter(NCOLS);

  const wb = new ExcelJS.Workbook();
  wb.creator = "CMC";
  wb.created = new Date();

  const ws = wb.addWorksheet("Prestadores", {
    views: [{ state: "frozen", ySplit: HEADER_ROWS }],
    pageSetup: {
      fitToPage: true, fitToWidth: 1, fitToHeight: 0, orientation: "landscape",
    },
  });

  ws.columns = cols.map(c => ({ key: c.key, width: c.width }));

  // ── Row 1: top accent bar ────────────────────────────────────────────────
  ws.getRow(1).height = 4;
  ws.mergeCells(`A1:${lastColLetter}1`);
  ws.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.accentBg } };

  // ── Row 2: report title ──────────────────────────────────────────────────
  ws.getRow(2).height = 26;
  ws.mergeCells(`A2:${lastColLetter}2`);
  const titleCell = ws.getCell("A2");
  titleCell.value = "Prestadores por Obra Social";
  titleCell.font = { name: "Calibri", size: 15, bold: true, color: { argb: C.titleText } };
  titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 8 };

  // ── Row 3: institution line ──────────────────────────────────────────────
  ws.getRow(3).height = 16;
  ws.mergeCells(`A3:${lastColLetter}3`);
  const instCell = ws.getCell("A3");
  instCell.value = `${CMC_NAME}  ·  ${CMC_PHONE}  ·  ${CMC_EMAIL}`;
  instCell.font = { name: "Calibri", size: 8.5, color: { argb: C.metaText } };
  instCell.alignment = { vertical: "middle", horizontal: "left", indent: 8 };

  // ── Row 4: obra social / date / count line ───────────────────────────────
  ws.getRow(4).height = 16;
  ws.mergeCells(`A4:${lastColLetter}4`);
  const metaCell = ws.getCell("A4");
  metaCell.value = `${selectedOS.NOMBRE}  (${code})  ·  Generado: ${dateStr}  ·  ${rows.length} prestadores`;
  metaCell.font = { name: "Calibri", size: 8.5, color: { argb: C.metaText } };
  metaCell.alignment = { vertical: "middle", horizontal: "left", indent: 8 };

  // ── Row 5: spacer ────────────────────────────────────────────────────────
  ws.getRow(5).height = 4;

  // ── Row 6: accent separator ──────────────────────────────────────────────
  ws.getRow(6).height = 3;
  ws.mergeCells(`A6:${lastColLetter}6`);
  ws.getCell("A6").fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.accentBg } };

  // ── Row 7: spacer ────────────────────────────────────────────────────────
  ws.getRow(7).height = 4;

  // ── Row 8: column headers ────────────────────────────────────────────────
  const hRow = ws.getRow(HEADER_ROWS);
  hRow.height = 20;
  cols.forEach((col, i) => {
    const cell = hRow.getCell(i + 1);
    cell.value = col.header;
    cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: C.headerText } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.headerBg } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: false };
    cell.border = CELL_BORDER;
  });

  // ── Data rows ────────────────────────────────────────────────────────────
  const leftAlignKeys = new Set(["nom", "esp", "dom", "mail"]);
  rows.forEach((p, idx) => {
    const values = cols.map(c => pickCellValue(p, c.key));
    const row = ws.addRow(values);
    row.height = 16;
    const isAlt = idx % 2 !== 0;
    row.eachCell((cell, colIdx) => {
      const key = cols[colIdx - 1]?.key ?? "";
      cell.fill = {
        type: "pattern", pattern: "solid",
        fgColor: { argb: isAlt ? C.altRow : C.white },
      };
      cell.border = CELL_BORDER;
      cell.font = { name: "Calibri", size: 9 };
      cell.alignment = {
        vertical: "middle",
        horizontal: leftAlignKeys.has(key) ? "left" : "center",
        wrapText: leftAlignKeys.has(key),
      };
    });
  });

  // ── Auto-filter ──────────────────────────────────────────────────────────
  const lastDataRow = HEADER_ROWS + rows.length;
  ws.autoFilter = {
    from: { row: HEADER_ROWS, column: 1 },
    to:   { row: lastDataRow, column: NCOLS },
  };

  // ── Footer ───────────────────────────────────────────────────────────────
  const footerRowIdx = lastDataRow + 1;
  ws.mergeCells(`A${footerRowIdx}:${lastColLetter}${footerRowIdx}`);
  const footerRow = ws.getRow(footerRowIdx);
  footerRow.height = 14;
  const footerCell = footerRow.getCell(1);
  footerCell.value = `Exportado desde ${CMC_NAME} — ${dateStr}`;
  footerCell.font = { name: "Calibri", size: 8, italic: true, color: { argb: C.metaText } };
  footerCell.alignment = { horizontal: "right", vertical: "middle", indent: 1 };

  // ── Logo overlay (rows 2-4, left edge) ──────────────────────────────────
  const imageId = tryAddLogoImage(wb, logoDataUrl);
  if (imageId !== null) {
    ws.addImage(imageId, {
      tl: { col: 0.3, row: 1.15 } as any,
      br: { col: 1.5, row: 4.85 } as any,
      editAs: "oneCell",
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
