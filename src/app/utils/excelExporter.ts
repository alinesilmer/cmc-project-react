import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import type { ObraSocial } from "./docxParser";

function fmtDate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeObrasSociales(rows: ObraSocial[]): ObraSocial[] {
  const banned =
    /generado\s*:|ranking\s+por\s+importe|obras\s+sociales\s+por\s+importe/i;
  const bestByName = new Map<string, number>();

  for (const r of rows) {
    const nombre = (r?.nombre ?? "").replace(/\s+/g, " ").trim();
    const consulta =
      typeof r?.consulta === "number" ? r.consulta : Number(r?.consulta);

    if (!nombre) continue;
    if (banned.test(nombre)) continue;
    if (!Number.isFinite(consulta) || consulta <= 0) continue;

    const prev = bestByName.get(nombre);
    if (prev === undefined || consulta > prev) bestByName.set(nombre, consulta);
  }

  return Array.from(bestByName, ([nombre, consulta]) => ({ nombre, consulta }));
}

export async function exportToExcel(data: ObraSocial[]) {
  const ordered = normalizeObrasSociales(data).sort((a, b) => b.consulta - a.consulta);

  const wb = new ExcelJS.Workbook();
  wb.creator = "CMC";
  wb.created = new Date();

  const ws = wb.addWorksheet("Ranking", {
    views: [{ state: "frozen", ySplit: 6 }],
    pageSetup: { fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  const C = {
    titleBlue: "FF0B1F3A",
    black: "FF111111",
    white: "FFFFFFFF",
    gray100: "FFF7F7F7",
    gray200: "FFE5E5E5",
  };

  ws.columns = [
    { header: "Ranking", key: "ranking", width: 10 },
    { header: "Obra Social", key: "obra_social", width: 52 },
    { header: "Consulta ($)", key: "consulta", width: 16 },
  ];

  // Title
  ws.mergeCells("A2:C2");
  ws.getCell("A2").value = "Importe Consulta por Obra Social";
  ws.getCell("A2").font = { name: "Calibri", size: 16, bold: true, color: { argb: C.titleBlue } };

  ws.mergeCells("A3:C3");
  ws.getCell("A3").value = `Ranking por importe • Generado: ${fmtDate(new Date())}`;
  ws.getCell("A3").font = { name: "Calibri", size: 11, color: { argb: C.black } };
  ws.getCell("A3").alignment = { vertical: "middle", horizontal: "left" };

  ws.getRow(4).height = 6;

  const headerRow = 6;
  ws.getRow(headerRow).values = ["Ranking", "Obra Social", "Consulta ($)"];
  ws.getRow(headerRow).height = 20;

  const tableBorder = {
    top: { style: "thin" as const, color: { argb: C.black } },
    left: { style: "thin" as const, color: { argb: C.black } },
    bottom: { style: "thin" as const, color: { argb: C.black } },
    right: { style: "thin" as const, color: { argb: C.black } },
  };

  // Header style
  ws.getRow(headerRow).eachCell((cell) => {
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: C.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.black } }; 
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = tableBorder;
  });

  // Data rows
  ordered.forEach((o, idx) => {
    const row = ws.addRow({
      ranking: idx + 1,
      obra_social: o.nombre,
      consulta: o.consulta,
    });

    row.height = 18;

    const zebraFill = idx % 2 === 0 ? C.white : C.gray100;

    row.eachCell((cell, col) => {
      cell.font = { name: "Calibri", size: 11, bold: false, color: { argb: C.black } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: zebraFill } };
      cell.border = tableBorder;

      // Alignments per column
      if (col === 2) {
        cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      } else if (col === 3) {
        cell.alignment = { vertical: "middle", horizontal: "right" };
      } else {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }
    });

    // Currency format
    ws.getCell(row.number, 3).numFmt = '"$"#,##0.00';
  });

  // Filter
  const endRow = ws.lastRow?.number ?? headerRow + 1;
  ws.autoFilter = {
    from: { row: headerRow, column: 1 },
    to: { row: endRow, column: 3 },
  };

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `ranking_obras_sociales_${fmtDate(new Date())}.xlsx`
  );
}
