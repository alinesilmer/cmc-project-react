import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import type { ObraSocial } from "./docxParser";

function fmtDate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function exportToExcel(data: ObraSocial[]) {
  const ordered = [...data].sort((a, b) => b.consulta - a.consulta);

  const wb = new ExcelJS.Workbook();
  wb.creator = "CMC";
  wb.created = new Date();

  const ws = wb.addWorksheet("Ranking", {
    views: [{ state: "frozen", ySplit: 6 }],
    pageSetup: { fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  // Colors (close to your SCSS)
const C = {
  titleBlue: "FF0B1F3A", 
  black: "FF111111",
  white: "FFFFFFFF",
  gray100: "FFF7F7F7",
  gray200: "FFE5E5E5",
};


  // Columns
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

  // Header row
  const headerRow = 6;
  ws.getRow(headerRow).values = ["Ranking", "Obra Social", "Consulta ($)"];
  ws.getRow(headerRow).height = 20;

  ws.getRow(headerRow).eachCell((cell) => {
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: C.white } };
cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.black } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin", color: { argb: C.gray200 } },
      left: { style: "thin", color: { argb: C.gray200 } },
      bottom: { style: "thin", color: { argb: C.gray200 } },
      right: { style: "thin", color: { argb: C.gray200 } },
    };
  });

  // Data
  ordered.forEach((o, idx) => {
    const row = ws.addRow({
      ranking: idx + 1,
      obra_social: o.nombre,
      consulta: o.consulta,
    });

    row.height = 18;

    const zebra = idx % 2 === 0 ? C.white : C.gray100;

    row.eachCell((cell, col) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.black } };
      cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: C.white } };
      cell.alignment = {
        vertical: "middle",
        horizontal: col === 2 ? "left" : "center",
        wrapText: col === 2,
      };
      cell.border = {
        top: { style: "thin", color: { argb: C.gray200 } },
        left: { style: "thin", color: { argb: C.gray200 } },
        bottom: { style: "thin", color: { argb: C.gray200 } },
        right: { style: "thin", color: { argb: C.gray200 } },
      };
    });

    // Currency
    const moneyCell = ws.getCell(row.number, 3);
    moneyCell.numFmt = '"$"#,##0.00';

    // Highlight top 1 as gold, top 2-3 as soft blue
    if (idx === 0) {
      row.eachCell((cell) => {
       cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: C.white } };
cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.black } };
      });
    } else if (idx === 1 || idx === 2) {
      row.eachCell((cell) => {
       cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: C.white } };
cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.black } };
      });
    }
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
