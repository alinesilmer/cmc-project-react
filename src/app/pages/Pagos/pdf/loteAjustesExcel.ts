// Excel de un lote de ajustes, con el mismo contenido que el PDF: datos del lote arriba (la obra social con su número),
// los ajustes (los débitos en negativo) y, al final, débitos, créditos y neto del lote.
import { estadoLabel } from "../LoteDetalle/utiles";
import { fechaDMA, mesLabel, type LoteAjuste } from "../types";
import { datosExtraDelLote, fechaPrestacion, obraSocialDe, totalesDe } from "./loteAjustesPdf";

export async function generarLoteExcel(lote: LoteAjuste, sinFactura: boolean): Promise<Blob> {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Ajustes");
  const ajustes = lote.ajustes ?? [];
  const t = totalesDe(ajustes);
  const moneda = "#,##0.00";
  const firmado = (a: (typeof ajustes)[number]) => (a.tipo === "d" ? -1 : 1) * Number(a.total);

  const titulo = ws.addRow([sinFactura ? `Lote de ajustes sin factura Nº ${lote.id}` : `Lote de ajustes Nº ${lote.id}`]);
  titulo.font = { bold: true, size: 13 };
  for (const [k, v] of [
    ["Obra social", obraSocialDe(lote)],
    ["Período", `${mesLabel(lote.mes_periodo)} ${lote.anio_periodo}`],
    ["Estado", estadoLabel(lote.estado)],
    ...datosExtraDelLote(lote),
  ]) {
    const r = ws.addRow([k, v]);
    r.getCell(1).font = { bold: true };
  }
  ws.addRow([]);

  const columnas = sinFactura
    ? ["Tipo", "Médico (ID)", "% de pago", "Honorarios", "Gastos", "Total", "Cargado", "Observación"]
    : ["Tipo", "ID prestación", "Nro. orden", "Socio", "Código", "Fecha prest.", "Afiliado", "% de pago", "Honorarios", "Gastos", "Total", "Cargado", "Observación"];
  const colPorcentaje = sinFactura ? 3 : 8;
  const colTotal = sinFactura ? 6 : 11;
  const colesImporte = sinFactura ? [4, 5, 6] : [9, 10, 11];

  const encabezado = ws.addRow(columnas);
  encabezado.font = { bold: true };

  ajustes.forEach((a) => {
    const tipo = a.tipo === "d" ? "Débito" : "Crédito";
    const fila = sinFactura
      ? [tipo, a.medico_id, Number(a.porcentaje_pago ?? 100), Number(a.honorarios), Number(a.gastos), firmado(a), fechaDMA(a.created_at), a.observacion ?? ""]
      : [
          tipo,
          a.id_atencion ?? "—",
          a.nro_consulta ?? "—",
          a.nombre_prestador ? `${a.nro_socio ?? ""} ${a.nombre_prestador}`.trim() : `Médico ${a.medico_id}`,
          a.codigo_prestacion ?? "—",
          fechaPrestacion(a.fecha_prestacion),
          a.nombre_afiliado ?? "—",
          Number(a.porcentaje_pago ?? 100),
          Number(a.honorarios),
          Number(a.gastos),
          firmado(a),
          fechaDMA(a.created_at),
          a.observacion ?? "",
        ];
    const r = ws.addRow(fila);
    colesImporte.forEach((c) => { r.getCell(c).numFmt = moneda; });
    r.getCell(colPorcentaje).numFmt = '0.00" %"';
  });

  ws.addRow([]);
  const cierre: [string, number, boolean][] = [
    [`Débitos (${t.nd})`, -t.deb, false],
    [`Créditos (${t.nc})`, t.cre, false],
    ["NETO DEL LOTE", t.neto, true],
  ];
  for (const [rotulo, valor, destacado] of cierre) {
    const r = ws.addRow([]);
    r.getCell(colTotal - 1).value = rotulo;
    r.getCell(colTotal).value = valor;
    r.getCell(colTotal).numFmt = moneda;
    if (destacado) r.font = { bold: true };
  }

  const anchos = sinFactura ? [10, 12, 10, 14, 12, 14, 12, 40] : [10, 14, 14, 32, 12, 12, 26, 10, 14, 12, 14, 12, 40];
  anchos.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
