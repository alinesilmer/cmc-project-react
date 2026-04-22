import { saveAs } from "file-saver";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoUrl from "@/app/assets/logoCMC.png";
import type { ObraSocialListItem } from "../obrasSociales.types";
import {
  formatFecha,
  formatPlazo,
  formatMarca,
  formatEmails,
  formatTelefonos,
  formatFactura,
} from "./formatters";

// ─── Institutional palette ────────────────────────────────────────────────────

const BLUE        = "FF173F70";
const BLUE_MID    = "FF1B4C88";
const BLUE_LIGHT  = "FFD6E4F7";
const YELLOW_BG   = "FFFDF6DC";
const GRAY_HEADER = "FFF4F5F7";
const GRAY_BORDER = "FFD0D7E2";
const GRAY_TEXT   = "FF5A6478";
const WHITE       = "FFFFFFFF";
const BLACK_TEXT  = "FF1A2333";

const BLUE_RGB   : [number, number, number] = [23, 63, 112];
const BLUE_MID_RGB: [number, number, number] = [27, 76, 136];
const YELLOW_RGB : [number, number, number] = [253, 246, 220];
const GRAY_LINE_RGB: [number, number, number] = [208, 215, 226];

const ORG   = "Colegio Médico de Corrientes";
const TITLE = "Convenios — Obras Sociales";

// ─── Field definitions ────────────────────────────────────────────────────────

export interface ExportField {
  key: string;
  label: string;
  enabled: boolean;
}

export const DEFAULT_FIELDS: ExportField[] = [
  { key: "nro_obra_social",     label: "Nº",                enabled: true  },
  { key: "nombre",              label: "Nombre",            enabled: true  },
  { key: "condicion_iva",       label: "Tipo factura",      enabled: true  },
  { key: "plazo_vencimiento",   label: "Plazo de pago",     enabled: true  },
  { key: "cuit",                label: "CUIT",              enabled: false },
  { key: "direccion_real",      label: "Dirección",         enabled: true  },
  { key: "emails",              label: "Emails",            enabled: true  },
  { key: "telefonos",           label: "Teléfonos",         enabled: true  },
  { key: "marca",               label: "Hab. padrón",       enabled: false },
  { key: "ver_valor",           label: "Muestra valores",   enabled: false },
  { key: "fecha_alta_convenio", label: "Alta convenio",     enabled: true  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCellValue(item: ObraSocialListItem, key: string): string {
  switch (key) {
    case "nro_obra_social":     return String(item.nro_obra_social);
    case "nombre":              return item.nombre;
    case "condicion_iva":       return formatFactura(item.condicion_iva);
    case "plazo_vencimiento":   return formatPlazo(item.plazo_vencimiento);
    case "cuit":                return item.cuit ?? "—";
    case "direccion_real":      return item.direccion_real ?? "—";
    case "emails":              return formatEmails(item);
    case "telefonos":           return formatTelefonos(item);
    case "marca":               return formatMarca(item.marca);
    case "ver_valor":           return formatMarca(item.ver_valor);
    case "fecha_alta_convenio": return formatFecha(item.fecha_alta_convenio);
    default:                    return "—";
  }
}

function buildRows(items: ObraSocialListItem[], fields: ExportField[]) {
  const active  = fields.filter((f) => f.enabled);
  const headers = active.map((f) => f.label);
  const rows    = items.map((item) => active.map((f) => getCellValue(item, f.key)));
  return { active, headers, rows };
}

async function getLogoBase64(): Promise<string> {
  const res  = await fetch(logoUrl);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

function localeDateLong() {
  return new Date().toLocaleDateString("es-AR", { dateStyle: "long" });
}

// ─── Excel ────────────────────────────────────────────────────────────────────

const thin  = { style: "thin"   as const, color: { argb: GRAY_BORDER } };
const thick = { style: "medium" as const, color: { argb: BLUE } };

function applyBorder(cell: ExcelJS.Cell, opts: { top?: boolean; bottom?: boolean; left?: boolean; right?: boolean; thick?: boolean }) {
  const line = opts.thick ? thick : thin;
  cell.border = {
    top:    opts.top    ? line : undefined,
    bottom: opts.bottom ? line : undefined,
    left:   opts.left   ? line : undefined,
    right:  opts.right  ? line : undefined,
  };
}

export async function exportToExcel(
  items: ObraSocialListItem[],
  fields: ExportField[],
  appliedFilters: string[] = [],
  filename = "convenios_obras_sociales"
): Promise<void> {
  const { active, headers, rows } = buildRows(items, fields);
  const logo64 = await getLogoBase64();

  const wb = new ExcelJS.Workbook();
  wb.creator  = "CMC Sistema";
  wb.created  = new Date();

  const ws = wb.addWorksheet("Convenios", {
    views: [{ state: "frozen", ySplit: 7 }],
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 },
  });

  const colCount = Math.max(headers.length, 5);

  // ── Logo — spans rows 1-2 (total ≈ 90px at 1.33px/pt) ──
  const imageId = wb.addImage({ base64: logo64, extension: "png" });
  // Logo aspect ratio is ~4:3 landscape; height covers row1(32pt)+row2(38pt)=70pt≈93px
  ws.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 124, height: 93 } });

  // ── Row 1: org name ──
  ws.mergeCells(1, 2, 1, colCount);
  const orgCell = ws.getCell("B1");
  orgCell.value     = ORG;
  orgCell.font      = { name: "Calibri", size: 10, color: { argb: GRAY_TEXT }, italic: true };
  orgCell.alignment = { vertical: "bottom", horizontal: "left" };
  ws.getRow(1).height = 32;

  // ── Row 2: title ──
  ws.mergeCells(2, 2, 2, colCount);
  const titleCell = ws.getCell("B2");
  titleCell.value     = TITLE;
  titleCell.font      = { name: "Calibri", bold: true, size: 18, color: { argb: BLUE } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(2).height = 38;

  // ── Row 3: blue divider ──
  ws.mergeCells(3, 1, 3, colCount);
  const divCell = ws.getCell("A3");
  divCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
  ws.getRow(3).height = 3;

  // ── Row 4: metadata ──
  ws.mergeCells(4, 1, 4, colCount);
  const metaCell   = ws.getCell("A4");
  const filterStr  = appliedFilters.length ? `  ·  Filtros aplicados: ${appliedFilters.join(", ")}` : "";
  metaCell.value     = `Generado el ${localeDateLong()}  ·  ${items.length} registro${items.length !== 1 ? "s" : ""}${filterStr}`;
  metaCell.font      = { name: "Calibri", size: 9, color: { argb: GRAY_TEXT }, italic: true };
  metaCell.alignment = { horizontal: "left", vertical: "middle" };
  metaCell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: GRAY_HEADER } };
  ws.getRow(4).height = 18;

  // ── Row 5: spacer ──
  ws.addRow([]);
  ws.getRow(5).height = 6;

  // ── Row 6: column headers ──
  const headerRow = ws.addRow(headers);
  headerRow.height = 24;
  headerRow.eachCell((cell, colNum) => {
    cell.value     = headers[colNum - 1];
    cell.font      = { name: "Calibri", bold: true, color: { argb: WHITE }, size: 10 };
    cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: false };
    cell.border    = {
      top:    thick,
      bottom: thick,
      left:   colNum === 1        ? thick : thin,
      right:  colNum === headers.length ? thick : thin,
    };
  });

  // ── Rows 7+: data ──
  rows.forEach((row, i) => {
    const dataRow = ws.addRow(row);
    const isEven  = i % 2 === 1;
    dataRow.height = 17;

    dataRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
      if (isEven) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: YELLOW_BG } };
      }

      // Nº column: center + muted
      if (colNum === 1) {
        cell.font      = { name: "Calibri", size: 9, color: { argb: GRAY_TEXT } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else {
        cell.font      = { name: "Calibri", size: 9, color: { argb: BLACK_TEXT } };
        cell.alignment = { vertical: "middle", wrapText: true };
      }

      cell.border = {
        bottom: thin,
        left:   colNum === 1           ? thin : { style: "hair" as const, color: { argb: GRAY_BORDER } },
        right:  colNum === row.length  ? thin : { style: "hair" as const, color: { argb: GRAY_BORDER } },
      };
    });
  });

  // ── Footer row ──
  const footerRow = ws.addRow([`Total: ${items.length} registro${items.length !== 1 ? "s" : ""}`]);
  ws.mergeCells(footerRow.number, 1, footerRow.number, colCount);
  const footerCell = footerRow.getCell(1);
  footerCell.font      = { name: "Calibri", size: 9, italic: true, color: { argb: GRAY_TEXT } };
  footerCell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: GRAY_HEADER } };
  footerCell.alignment = { horizontal: "right", vertical: "middle" };
  footerCell.border    = { top: thick };
  footerRow.height     = 18;

  // ── Auto-filter on header row ──
  ws.autoFilter = {
    from: { row: 6, column: 1 },
    to:   { row: 6, column: headers.length },
  };

  // ── Column widths ──
  ws.columns.forEach((col, i) => {
    const key    = active[i]?.key;
    const header = headers[i] ?? "";
    const values = rows.map((r) => r[i] ?? "");
    const maxContent = Math.max(header.length, ...values.map((v) => v.length));

    if (key === "nro_obra_social")     col.width = 6;
    else if (key === "nombre")         col.width = Math.min(Math.max(maxContent + 2, 22), 42);
    else if (key === "emails")         col.width = Math.min(Math.max(maxContent + 2, 26), 40);
    else if (key === "direccion_real") col.width = Math.min(Math.max(maxContent + 2, 24), 40);
    else                               col.width = Math.min(Math.max(maxContent + 4, 12), 28);
  });

  const buffer = await wb.xlsx.writeBuffer();
  const date   = new Date().toISOString().slice(0, 10);
  saveAs(new Blob([buffer]), `${filename}_${date}.xlsx`);
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

export async function exportToPDF(
  items: ObraSocialListItem[],
  fields: ExportField[],
  appliedFilters: string[],
  filename = "convenios_obras_sociales"
): Promise<void> {
  const { active, headers, rows } = buildRows(items, fields);
  const logo64 = await getLogoBase64();

  const isLandscape = headers.length > 6;
  const doc    = new jsPDF({ orientation: isLandscape ? "landscape" : "portrait", unit: "mm" });
  const pageW  = doc.internal.pageSize.getWidth();
  const pageH  = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - margin * 2;

  // ── Header background band ──
  doc.setFillColor(...BLUE_RGB);
  doc.rect(0, 0, pageW, 36, "F");

  // ── Logo ──
  doc.addImage(logo64, "PNG", margin, 5, 26, 20);

  // ── Org name ──
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(180, 200, 230);
  doc.text(ORG, margin + 31, 12);

  // ── Title ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(TITLE, margin + 31, 22);

  // ── Date + count (right-aligned in header) ──
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(180, 200, 230);
  const dateStr   = localeDateLong();
  const countStr  = `${items.length} registro${items.length !== 1 ? "s" : ""}`;
  doc.text(dateStr,  pageW - margin, 16, { align: "right" });
  doc.text(countStr, pageW - margin, 23, { align: "right" });

  // ── Filter chips below header (if any) ──
  let tableStartY = 44;
  if (appliedFilters.length > 0) {
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 115, 135);
    doc.text(`Filtros: ${appliedFilters.join("  ·  ")}`, margin, 41);
    tableStartY = 47;
  }

  // ── Column style overrides per field ──
  const columnStyles: Record<number, object> = {};
  active.forEach((f, i) => {
    if (f.key === "nro_obra_social") {
      columnStyles[i] = { cellWidth: 10, halign: "center" };
    } else if (f.key === "nombre") {
      columnStyles[i] = { cellWidth: isLandscape ? 52 : 44, fontStyle: "bold" };
    } else if (f.key === "emails" || f.key === "direccion_real") {
      columnStyles[i] = { cellWidth: isLandscape ? 38 : 32 };
    } else if (f.key === "condicion_iva" || f.key === "plazo_vencimiento") {
      columnStyles[i] = { cellWidth: 22, halign: "center" };
    } else if (f.key === "fecha_alta_convenio") {
      columnStyles[i] = { cellWidth: 22, halign: "center" };
    }
  });

  // ── Table ──
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: tableStartY,
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
      overflow: "linebreak",
      textColor: [26, 35, 51],
      lineColor: GRAY_LINE_RGB,
      lineWidth: 0.18,
    },
    headStyles: {
      fillColor: BLUE_MID_RGB,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
      halign: "center",
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
    },
    alternateRowStyles: {
      fillColor: YELLOW_RGB,
    },
    columnStyles,
    margin: { left: margin, right: margin },
    tableWidth: contentW,

    // ── Page header repeat + footer ──
    didDrawPage: (data) => {
      const pageCount   = (doc.internal as any).getNumberOfPages();
      const currentPage = data.pageNumber;

      // Repeat header band on subsequent pages
      if (currentPage > 1) {
        doc.setFillColor(...BLUE_RGB);
        doc.rect(0, 0, pageW, 14, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text(TITLE, margin, 9);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(180, 200, 230);
        doc.text(ORG, pageW - margin, 9, { align: "right" });
      }

      // Footer: rule + page info + org
      const footerY = pageH - 9;
      doc.setDrawColor(...GRAY_LINE_RGB);
      doc.setLineWidth(0.3);
      doc.line(margin, footerY - 3, pageW - margin, footerY - 3);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(140, 150, 165);
      doc.text(ORG, margin, footerY);
      doc.text(
        `Página ${currentPage} de ${pageCount}`,
        pageW - margin,
        footerY,
        { align: "right" }
      );
    },
  });

  const exportDate = new Date().toISOString().slice(0, 10);
  doc.save(`${filename}_${exportDate}.pdf`);
}
