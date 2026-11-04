// Excel del resumen de pago, con el mismo contenido que el PDF: una sola tabla con facturas, adelantos, lotes y
// refacturaciones (los lotes con signo), más compensaciones, deducciones por concepto y totales.
import type ExcelJS from "exceljs";
import { mesLabel } from "../types";
import { ESTADO_PAGO, armarResumen, type VistaPrevia } from "./resumenPagoPdf";

const AZUL = "FF1B56FF";
const MONEDA = "#,##0.00";
const MONEDA_CON_SIGNO = "+#,##0.00;-#,##0.00;0.00";

export async function generarResumenExcel(data: VistaPrevia, totalAPagar: number): Promise<Blob> {
  const { default: ExcelJSLib } = await import("exceljs");
  const res = armarResumen(data, totalAPagar);
  const wb = new ExcelJSLib.Workbook();
  const ws = wb.addWorksheet("Resumen de pago");

  const relleno = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
  const encabezado = (fila: ExcelJS.Row) => {
    fila.eachCell((c) => {
      c.fill = relleno(AZUL);
      c.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      c.alignment = { vertical: "middle" };
    });
    fila.height = 22;
  };
  const total = (fila: ExcelJS.Row) => {
    fila.eachCell((c) => {
      c.fill = relleno("FFF0F2F5");
      c.font = { bold: true, size: 11 };
    });
  };
  const seccion = (rotulo: string) => {
    ws.addRow([]);
    const f = ws.addRow([rotulo.toUpperCase()]);
    f.font = { bold: true, size: 12, color: { argb: "FF1E293B" } };
  };
  const importes = (fila: ExcelJS.Row, cols: number[], formato = MONEDA) => {
    cols.forEach((c) => {
      fila.getCell(c).numFmt = formato;
      fila.getCell(c).alignment = { horizontal: "right" };
    });
  };

  // ── Cabecera ──
  const titulo = ws.addRow(["Resumen de pago"]);
  titulo.font = { bold: true, size: 14, color: { argb: AZUL } };
  if (res.liquidado) ws.addRow([`Liquidación del período ${mesLabel(res.liquidado.mes).toLowerCase()} ${res.liquidado.anio}`]);
  ws.addRow([]);
  for (const [k, v] of [
    ["Pago", `Nº ${res.nroPago}`],
    ["Período liquidado", res.liquidado ? `${mesLabel(res.liquidado.mes)} ${res.liquidado.anio}` : "—"],
    ["Socios incluidos", data.cantidad_socios != null ? data.cantidad_socios : "—"],
    ["Obras sociales", res.cantidadObrasSociales],
    ["Estado", ESTADO_PAGO[data.estado] ?? data.estado],
  ] as [string, string | number][]) {
    const f = ws.addRow([k, v]);
    f.getCell(1).font = { bold: true };
    f.getCell(2).alignment = { horizontal: "left" };
  }

  // ── Una sola tabla ──
  seccion("Facturas, adelantos, lotes y refacturaciones");
  encabezado(ws.addRow(["Obra social", "Período", "Honorarios", "Gastos", "Concepto", "ID"]));
  res.filas.forEach((f) => {
    const r = ws.addRow([f.os, f.periodo, f.h, f.g, f.concepto, f.id]);
    importes(r, [3, 4], f.conSigno ? MONEDA_CON_SIGNO : MONEDA);
  });
  if (res.filas.length > 0) {
    const r = ws.addRow(["TOTAL", "", res.sumaH, res.sumaG, "", ""]);
    total(r);
    importes(r, [3, 4]);
  }

  // ── Compensaciones ──
  if (res.compensaciones.length > 0) {
    seccion("Compensaciones");
    encabezado(ws.addRow(["Nº", "Socio", "Leyenda del recibo", "Importe"]));
    res.compensaciones.forEach((c) => {
      const r = ws.addRow([`#${c.compensacion_id}`, c.medico_nombre, c.leyenda, Number(c.importe)]);
      importes(r, [4], MONEDA_CON_SIGNO);
    });
    const r = ws.addRow(["TOTAL", "", "", res.compensacionesNeto]);
    total(r);
    importes(r, [4], MONEDA_CON_SIGNO);
  }

  // ── Deducciones por concepto ──
  seccion("Deducciones por concepto");
  encabezado(ws.addRow(["Concepto", "Socios", "Total aplicado"]));
  res.deducciones.forEach((d) => {
    const r = ws.addRow([d.concepto, d.socios, -d.total]);
    importes(r, [3], MONEDA_CON_SIGNO);
  });
  if (res.deducciones.length > 0) {
    const r = ws.addRow(["TOTAL", "", -res.deduccionesTotal]);
    total(r);
    importes(r, [3], MONEDA_CON_SIGNO);
  }

  // ── Totales: los de la API, para que coincidan con el encabezado del pago ──
  ws.addRow([]);
  const cierre: [string, number, string][] = [
    ["Brutos y débitos", res.brutosYDebitos, MONEDA],
    ["Compensaciones", res.compensacionesTotal, MONEDA_CON_SIGNO],
    ["Deducciones", -res.deduccionesAplicadas, MONEDA_CON_SIGNO],
  ];
  if (res.arrastreCobrado !== 0) cierre.push(["Saldo arrastrado", -res.arrastreCobrado, MONEDA_CON_SIGNO]);
  for (const [rotulo, valor, formato] of cierre) {
    const r = ws.addRow(["", "", rotulo, valor]);
    r.getCell(3).font = { bold: true };
    r.getCell(4).numFmt = formato;
  }
  const fin = ws.addRow(["", "", "TOTAL A PAGAR", res.total]);
  fin.getCell(3).font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
  fin.getCell(4).font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
  fin.getCell(3).fill = relleno(AZUL);
  fin.getCell(4).fill = relleno(AZUL);
  fin.getCell(4).numFmt = MONEDA;
  fin.height = 26;

  [34, 18, 30, 16, 16, 24].forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
