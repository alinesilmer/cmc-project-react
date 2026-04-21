import React, { useCallback, useEffect, useState } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getJSON } from "../../../../lib/http";
import Button from "../../../../components/atoms/Button/Button";
import Card from "../../../../components/atoms/Card/Card";
import styles from "./tabs.module.scss";
import { fmt, mesLabel } from "../../types";

const VISTA_URL = (pagoId: number) => `/api/pagos/${pagoId}/vista_previa`;

type LiquidacionItem = {
  liquidacion_id: number;
  obra_social_id: number;
  obra_social_nombre: string;
  nro_factura: string | null;
  mes_periodo: number;
  anio_periodo: number;
  total_bruto: string;
  total_honorarios: string;
  total_gastos: string;
  total_debitos: string;
  total_creditos: string;
  total_reconocido: string;
  total_neto: string;
};

type LiquidacionTotales = {
  total_bruto: string;
  total_honorarios: string;
  total_gastos: string;
  total_debitos: string;
  total_creditos: string;
  total_reconocido: string;
  total_neto: string;
};

type DeduccionItem = {
  descuento_id: number;
  descuento_nombre: string;
  cantidad_socios: number;
  total_monto: string;
};

type DeduccionTotales = {
  total_monto: string;
};

type LoteItem = {
  lote_id: number;
  tipo: string;
  obra_social_id: number;
  obra_social_nombre: string;
  mes_periodo: number;
  anio_periodo: number;
  estado: "A" | "C" | "L" | "AP";
  total_debitos: string;
  total_creditos: string;
};

type LoteTotales = {
  total_debitos: string;
  total_creditos: string;
};

type VistaPrevia = {
  pago_id: number;
  mes: number;
  anio: number;
  descripcion: string;
  estado: string;
  liquidaciones: { items: LiquidacionItem[]; totales: LiquidacionTotales };
  deducciones: { items: DeduccionItem[]; totales: DeduccionTotales };
  lotes: { items: LoteItem[]; totales: LoteTotales };
};

type Props = { pagoId: number };

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>
    {children}
  </h3>
);

const TabResumen: React.FC<Props> = ({ pagoId }) => {
  const [data, setData] = useState<VistaPrevia | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getJSON<VistaPrevia>(VISTA_URL(pagoId));
      setData(res);
    } catch (e: any) {
      setError(e?.message || "No se pudo cargar la vista previa.");
    } finally {
      setLoading(false);
    }
  }, [pagoId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading)
    return <div className={styles.loadingState}>Cargando vista previa…</div>;
  if (error) return <div className={styles.errorBanner}>{error}</div>;
  if (!data) return null;

  const { liquidaciones, deducciones, lotes } = data;

  const lotesNormales = lotes.items.filter(
    (l) => l.tipo === "normal" || l.tipo === "sin_factura",
  );
  const lotesRefac = lotes.items.filter((l) => l.tipo === "refacturacion");

  const sumDebitos = (items: LoteItem[]) =>
    items.reduce((acc, l) => acc + Number(l.total_debitos), 0);
  const sumCreditos = (items: LoteItem[]) =>
    items.reduce((acc, l) => acc + Number(l.total_creditos), 0);

  const totalAPagar =
    Number(liquidaciones.totales.total_neto) -
    Number(deducciones.totales.total_monto) +
    Number(lotes.totales.total_creditos) -
    Number(lotes.totales.total_debitos);

  const periodoLabel = `${mesLabel(data.mes)} ${data.anio}`;
  const docTitle = `Vista Previa Pago - ${periodoLabel}`;

  // ── Excel export ──────────────────────────────────────────────
  const exportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Vista Previa");

    // Helpers
    const headerFill: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1B56FF" },
    };
    const headerFont: Partial<ExcelJS.Font> = {
      bold: true,
      color: { argb: "FFFFFFFF" },
      size: 11,
    };
    const totalsFont: Partial<ExcelJS.Font> = { bold: true, size: 11 };
    const totalsFill: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF0F2F5" },
    };
    const moneyFmt = "#,##0.00";

    const addSectionHeader = (label: string, cols: number) => {
      const row = ws.addRow([label]);
      row.font = { bold: true, size: 12, color: { argb: "FF1E293B" } };
      ws.mergeCells(row.number, 1, row.number, cols);
      ws.addRow([]);
    };

    const styleHeader = (row: ExcelJS.Row) => {
      row.eachCell((cell) => {
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.alignment = { vertical: "middle" };
      });
      row.height = 22;
    };

    const styleTotals = (row: ExcelJS.Row, numericCols: number[]) => {
      row.eachCell((cell, col) => {
        cell.fill = totalsFill;
        cell.font = totalsFont;
        if (numericCols.includes(col)) {
          cell.numFmt = moneyFmt;
          cell.alignment = { horizontal: "right" };
        }
      });
    };

    const applyMoneyCol = (row: ExcelJS.Row, cols: number[]) => {
      cols.forEach((c) => {
        const cell = row.getCell(c);
        cell.numFmt = moneyFmt;
        cell.alignment = { horizontal: "right" };
      });
    };

    // ── Título ──
    const titleRow = ws.addRow([docTitle]);
    titleRow.font = { bold: true, size: 14, color: { argb: "FF1B56FF" } };
    ws.mergeCells(1, 1, 1, 10);
    ws.addRow([]);

    // ── Liquidaciones ──
    addSectionHeader("Liquidaciones", 10);
    const liqHead = ws.addRow([
      "Obra Social",
      "ID OS",
      "Nro. Factura",
      "Período",
      "Bruto",
      "Honorarios",
      "Gastos",
      "Débitos",
      "Créditos",
      "Reconocido",
      "Neto",
    ]);
    styleHeader(liqHead);
    liquidaciones.items.forEach((liq) => {
      const r = ws.addRow([
        liq.obra_social_nombre,
        liq.obra_social_id,
        liq.nro_factura ?? "—",
        `${mesLabel(liq.mes_periodo)} ${liq.anio_periodo}`,
        Number(liq.total_bruto),
        Number(liq.total_honorarios),
        Number(liq.total_gastos),
        Number(liq.total_debitos),
        Number(liq.total_creditos),
        Number(liq.total_reconocido),
        Number(liq.total_neto),
      ]);
      applyMoneyCol(r, [5, 6, 7, 8, 9, 10, 11]);
    });
    if (liquidaciones.items.length > 0) {
      const tot = liquidaciones.totales;
      const r = ws.addRow([
        "TOTAL",
        "",
        "",
        "",
        Number(tot.total_bruto),
        Number(tot.total_honorarios),
        Number(tot.total_gastos),
        Number(tot.total_debitos),
        Number(tot.total_creditos),
        Number(tot.total_reconocido),
        Number(tot.total_neto),
      ]);
      styleTotals(r, [5, 6, 7, 8, 9, 10, 11]);
    }
    ws.addRow([]);

    // ── Deducciones ──
    addSectionHeader("Deducciones", 3);
    const dedHead = ws.addRow(["Concepto", "Socios", "Total Aplicado"]);
    styleHeader(dedHead);
    deducciones.items.forEach((ded) => {
      const r = ws.addRow([
        ded.descuento_nombre,
        ded.cantidad_socios,
        Number(ded.total_monto),
      ]);
      applyMoneyCol(r, [3]);
    });
    if (deducciones.items.length > 0) {
      const r = ws.addRow([
        "TOTAL",
        "",
        Number(deducciones.totales.total_monto),
      ]);
      styleTotals(r, [3]);
    }
    ws.addRow([]);

    // ── Lotes de Ajuste ──
    addSectionHeader("Lotes de Ajuste", 4);
    const loteHead = ws.addRow([
      "Obra Social",
      "Período",
      "Débitos",
      "Créditos",
    ]);
    styleHeader(loteHead);
    lotesNormales.forEach((lote) => {
      const r = ws.addRow([
        lote.obra_social_nombre,
        `${mesLabel(lote.mes_periodo)} ${lote.anio_periodo}`,
        Number(lote.total_debitos),
        Number(lote.total_creditos),
      ]);
      applyMoneyCol(r, [3, 4]);
    });
    if (lotesNormales.length > 0) {
      const r = ws.addRow([
        "TOTAL",
        "",
        sumDebitos(lotesNormales),
        sumCreditos(lotesNormales),
      ]);
      styleTotals(r, [3, 4]);
    }
    ws.addRow([]);

    // ── Refacturaciones ──
    addSectionHeader("Refacturaciones", 4);
    const refHead = ws.addRow([
      "Obra Social",
      "Período",
      "Débitos",
      "Créditos",
    ]);
    styleHeader(refHead);
    lotesRefac.forEach((lote) => {
      const r = ws.addRow([
        lote.obra_social_nombre,
        `${mesLabel(lote.mes_periodo)} ${lote.anio_periodo}`,
        Number(lote.total_debitos),
        Number(lote.total_creditos),
      ]);
      applyMoneyCol(r, [3, 4]);
    });
    if (lotesRefac.length > 0) {
      const r = ws.addRow([
        "TOTAL",
        "",
        sumDebitos(lotesRefac),
        sumCreditos(lotesRefac),
      ]);
      styleTotals(r, [3, 4]);
    }
    ws.addRow([]);
    ws.addRow([]);

    // ── Total a pagar ──
    const totalRow = ws.addRow([
      "TOTAL A PAGAR",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      totalAPagar,
    ]);
    ws.mergeCells(totalRow.number, 1, totalRow.number, 10);
    totalRow.getCell(1).font = {
      bold: true,
      size: 13,
      color: { argb: "FFFFFFFF" },
    };
    totalRow.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1B56FF" },
    };
    totalRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
    totalRow.getCell(11).font = {
      bold: true,
      size: 13,
      color: { argb: "FFFFFFFF" },
    };
    totalRow.getCell(11).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1B56FF" },
    };
    totalRow.getCell(11).numFmt = moneyFmt;
    totalRow.getCell(11).alignment = { horizontal: "right" };
    totalRow.height = 50;

    // Auto column widths
    ws.columns.forEach((col) => {
      let max = 10;
      col.eachCell?.({ includeEmpty: false }, (cell) => {
        const len = cell.value ? String(cell.value).length : 0;
        if (len > max) max = len;
      });
      col.width = Math.min(max + 4, 40);
    });

    const buf = await wb.xlsx.writeBuffer();
    saveAs(
      new Blob([buf], { type: "application/octet-stream" }),
      `vista_previa_pago_${periodoLabel.replace(" ", "_")}.xlsx`,
    );
  };

  // ── PDF export ────────────────────────────────────────────────
  const exportPDF = () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4",
    });
    const pageW = doc.internal.pageSize.getWidth();
    let y = 40;

    const primaryBlue: [number, number, number] = [27, 86, 255];
    const lightGray: [number, number, number] = [240, 242, 245];
    const darkText: [number, number, number] = [30, 41, 59];

    // Title
    doc.setFontSize(16);
    doc.setTextColor(...primaryBlue);
    doc.setFont("helvetica", "bold");
    doc.text(docTitle, 40, y);
    y += 28;

    const addSection = (
      title: string,
      head: string[][],
      body: (string | number)[][],
      foot?: (string | number)[][],
    ) => {
      if (y > doc.internal.pageSize.getHeight() - 120) {
        doc.addPage();
        y = 40;
      }
      doc.setFontSize(12);
      doc.setTextColor(...darkText);
      doc.setFont("helvetica", "bold");
      doc.text(title, 40, y);
      y += 10;

      autoTable(doc, {
        startY: y,
        head,
        body: body as any,
        foot: foot as any,
        theme: "grid",
        headStyles: {
          fillColor: primaryBlue,
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 9,
        },
        bodyStyles: { fontSize: 9, textColor: darkText },
        footStyles: {
          fillColor: lightGray,
          textColor: darkText,
          fontStyle: "bold",
          fontSize: 9,
        },
        margin: { left: 40, right: 40 },
        tableWidth: pageW - 80,
        didDrawPage: () => {
          y = 40;
        },
      });

      y = (doc as any).lastAutoTable.finalY + 24;
    };

    // Liquidaciones
    addSection(
      "Liquidaciones",
      [
        [
          "Obra Social",
          "Nro. Factura",
          "Período",
          "Bruto",
          "Honorarios",
          "Gastos",
          "Débitos",
          "Créditos",
          "Reconocido",
          "Neto",
        ],
      ],
      liquidaciones.items.map((liq) => [
        liq.obra_social_nombre,
        liq.nro_factura ?? "—",
        `${mesLabel(liq.mes_periodo)} ${liq.anio_periodo}`,
        `$${fmt(liq.total_bruto)}`,
        `$${fmt(liq.total_honorarios)}`,
        `$${fmt(liq.total_gastos)}`,
        `-$${fmt(liq.total_debitos)}`,
        `+$${fmt(liq.total_creditos)}`,
        `$${fmt(liq.total_reconocido)}`,
        `$${fmt(liq.total_neto)}`,
      ]),
      liquidaciones.items.length > 0
        ? [
            [
              "TOTAL",
              "",
              "",
              `$${fmt(liquidaciones.totales.total_bruto)}`,
              `$${fmt(liquidaciones.totales.total_honorarios)}`,
              `$${fmt(liquidaciones.totales.total_gastos)}`,
              `-$${fmt(liquidaciones.totales.total_debitos)}`,
              `+$${fmt(liquidaciones.totales.total_creditos)}`,
              `$${fmt(liquidaciones.totales.total_reconocido)}`,
              `$${fmt(liquidaciones.totales.total_neto)}`,
            ],
          ]
        : undefined,
    );

    // Deducciones
    addSection(
      "Deducciones",
      [["Concepto", "Socios", "Total Aplicado"]],
      deducciones.items.map((ded) => [
        ded.descuento_nombre,
        String(ded.cantidad_socios),
        `-$${fmt(ded.total_monto)}`,
      ]),
      deducciones.items.length > 0
        ? [["TOTAL", "", `-$${fmt(deducciones.totales.total_monto)}`]]
        : undefined,
    );

    // Lotes de Ajuste
    addSection(
      "Lotes de Ajuste",
      [["Obra Social", "Período", "Débitos", "Créditos"]],
      lotesNormales.map((lote) => [
        lote.obra_social_nombre,
        `${mesLabel(lote.mes_periodo)} ${lote.anio_periodo}`,
        `-$${fmt(lote.total_debitos)}`,
        `+$${fmt(lote.total_creditos)}`,
      ]),
      lotesNormales.length > 0
        ? [
            [
              "TOTAL",
              "",
              `-$${fmt(sumDebitos(lotesNormales))}`,
              `+$${fmt(sumCreditos(lotesNormales))}`,
            ],
          ]
        : undefined,
    );

    // Refacturaciones
    addSection(
      "Refacturaciones",
      [["Obra Social", "Período", "Débitos", "Créditos"]],
      lotesRefac.map((lote) => [
        lote.obra_social_nombre,
        `${mesLabel(lote.mes_periodo)} ${lote.anio_periodo}`,
        `-$${fmt(lote.total_debitos)}`,
        `+$${fmt(lote.total_creditos)}`,
      ]),
      lotesRefac.length > 0
        ? [
            [
              "TOTAL",
              "",
              `-$${fmt(sumDebitos(lotesRefac))}`,
              `+$${fmt(sumCreditos(lotesRefac))}`,
            ],
          ]
        : undefined,
    );

    // ── Total a pagar ──
    if (y > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage();
      y = 40;
    }
    autoTable(doc, {
      startY: y,
      body: [[`TOTAL A PAGAR`, `$${fmt(totalAPagar)}`]],
      theme: "plain",
      bodyStyles: {
        fillColor: primaryBlue,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 13,
      },
      columnStyles: {
        0: { cellWidth: pageW - 200, halign: "left" },
        1: { cellWidth: 120, halign: "right" },
      },
      margin: { left: 40, right: 40 },
    });

    doc.save(`vista_previa_pago_${periodoLabel.replace(" ", "_")}.pdf`);
  };

  return (
    <div className={styles.tabWrap}>
      {/* ── Toolbar con exportes ── */}
      <div className={styles.toolbar}>
        <div />
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={exportExcel}>
            Exportar Excel
          </Button>
          <Button variant="secondary" size="sm" onClick={exportPDF}>
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* ── Liquidaciones ── */}
      <SectionTitle>Liquidaciones</SectionTitle>
      <Card className={styles.tableCard} style={{ marginBottom: 28 }}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Obra Social</th>
                <th>Nro. Factura</th>
                <th>Período</th>
                <th className={styles.numCell}>Bruto</th>
                <th className={styles.numCell}>Honorarios</th>
                <th className={styles.numCell}>Gastos</th>
                <th className={styles.numCell}>Débitos</th>
                <th className={styles.numCell}>Créditos</th>
                <th className={styles.numCell}>Reconocido</th>
                <th className={styles.numCell}>Neto</th>
              </tr>
            </thead>
            <tbody>
              {liquidaciones.items.length === 0 && (
                <tr>
                  <td colSpan={10} className={styles.emptyCell}>
                    Sin liquidaciones en este pago.
                  </td>
                </tr>
              )}
              {liquidaciones.items.map((liq) => (
                <tr key={liq.liquidacion_id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>
                      {liq.obra_social_nombre}
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>
                      #{liq.obra_social_id}
                    </div>
                  </td>
                  <td style={{ fontFamily: "monospace", fontSize: 11 }}>
                    {liq.nro_factura ?? "—"}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {mesLabel(liq.mes_periodo)} {liq.anio_periodo}
                  </td>
                  <td className={styles.numCell}>${fmt(liq.total_bruto)}</td>
                  <td className={styles.numCell}>${fmt(liq.total_honorarios)}</td>
                  <td className={styles.numCell}>${fmt(liq.total_gastos)}</td>
                  <td className={`${styles.numCell} ${styles.negative}`}>
                    -${fmt(liq.total_debitos)}
                  </td>
                  <td className={`${styles.numCell} ${styles.positive}`}>
                    +${fmt(liq.total_creditos)}
                  </td>
                  <td className={styles.numCell}>
                    ${fmt(liq.total_reconocido)}
                  </td>
                  <td className={styles.numCell} style={{ fontWeight: 600 }}>
                    ${fmt(liq.total_neto)}
                  </td>
                </tr>
              ))}
            </tbody>
            {liquidaciones.items.length > 0 && (
              <tfoot>
                <tr className={styles.totalsRow}>
                  <td colSpan={3}>TOTAL</td>
                  <td className={styles.numCell}>
                    ${fmt(liquidaciones.totales.total_bruto)}
                  </td>
                  <td className={styles.numCell}>
                    ${fmt(liquidaciones.totales.total_honorarios)}
                  </td>
                  <td className={styles.numCell}>
                    ${fmt(liquidaciones.totales.total_gastos)}
                  </td>
                  <td className={`${styles.numCell} ${styles.negative}`}>
                    -${fmt(liquidaciones.totales.total_debitos)}
                  </td>
                  <td className={`${styles.numCell} ${styles.positive}`}>
                    +${fmt(liquidaciones.totales.total_creditos)}
                  </td>
                  <td className={styles.numCell}>
                    ${fmt(liquidaciones.totales.total_reconocido)}
                  </td>
                  <td className={styles.numCell} style={{ fontWeight: 700 }}>
                    ${fmt(liquidaciones.totales.total_neto)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {/* ── Deducciones ── */}
      <SectionTitle>Deducciones</SectionTitle>
      <Card className={styles.tableCard} style={{ marginBottom: 28 }}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Concepto</th>
                <th className={styles.numCell}>Socios</th>
                <th className={styles.numCell}>Total Aplicado</th>
              </tr>
            </thead>
            <tbody>
              {deducciones.items.length === 0 && (
                <tr>
                  <td colSpan={3} className={styles.emptyCell}>
                    Sin deducciones en este pago.
                  </td>
                </tr>
              )}
              {deducciones.items.map((ded) => (
                <tr key={ded.descuento_id}>
                  <td style={{ fontWeight: 500 }}>{ded.descuento_nombre}</td>
                  <td className={styles.numCell}>{ded.cantidad_socios}</td>
                  <td className={`${styles.numCell} ${styles.negative}`}>
                    -${fmt(ded.total_monto)}
                  </td>
                </tr>
              ))}
            </tbody>
            {deducciones.items.length > 0 && (
              <tfoot>
                <tr className={styles.totalsRow}>
                  <td colSpan={2}>TOTAL</td>
                  <td className={`${styles.numCell} ${styles.negative}`}>
                    -${fmt(deducciones.totales.total_monto)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {/* ── Lotes de ajuste (normales) ── */}
      <SectionTitle>Lotes de Ajuste</SectionTitle>
      <Card className={styles.tableCard} style={{ marginBottom: 28 }}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Obra Social</th>
                <th>Período</th>
                <th className={styles.numCell}>Débitos</th>
                <th className={styles.numCell}>Créditos</th>
              </tr>
            </thead>
            <tbody>
              {lotesNormales.length === 0 && (
                <tr>
                  <td colSpan={4} className={styles.emptyCell}>
                    Sin lotes de ajuste en este pago.
                  </td>
                </tr>
              )}
              {lotesNormales.map((lote) => (
                <tr key={lote.lote_id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>
                      {lote.obra_social_nombre}
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>
                      #{lote.obra_social_id}
                    </div>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {mesLabel(lote.mes_periodo)} {lote.anio_periodo}
                  </td>
                  <td className={`${styles.numCell} ${styles.negative}`}>
                    -${fmt(lote.total_debitos)}
                  </td>
                  <td className={`${styles.numCell} ${styles.positive}`}>
                    +${fmt(lote.total_creditos)}
                  </td>
                </tr>
              ))}
            </tbody>
            {lotesNormales.length > 0 && (
              <tfoot>
                <tr className={styles.totalsRow}>
                  <td colSpan={2}>TOTAL</td>
                  <td className={`${styles.numCell} ${styles.negative}`}>
                    -${fmt(sumDebitos(lotesNormales))}
                  </td>
                  <td className={`${styles.numCell} ${styles.positive}`}>
                    +${fmt(sumCreditos(lotesNormales))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {/* ── Refacturaciones ── */}
      <SectionTitle>Refacturaciones</SectionTitle>
      <Card className={styles.tableCard} style={{ marginBottom: 28 }}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Obra Social</th>
                <th>Período</th>
                <th className={styles.numCell}>Débitos</th>
                <th className={styles.numCell}>Créditos</th>
              </tr>
            </thead>
            <tbody>
              {lotesRefac.length === 0 && (
                <tr>
                  <td colSpan={4} className={styles.emptyCell}>
                    Sin refacturaciones en este pago.
                  </td>
                </tr>
              )}
              {lotesRefac.map((lote) => (
                <tr key={lote.lote_id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>
                      {lote.obra_social_nombre}
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>
                      #{lote.obra_social_id}
                    </div>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {mesLabel(lote.mes_periodo)} {lote.anio_periodo}
                  </td>
                  <td className={`${styles.numCell} ${styles.negative}`}>
                    -${fmt(lote.total_debitos)}
                  </td>
                  <td className={`${styles.numCell} ${styles.positive}`}>
                    +${fmt(lote.total_creditos)}
                  </td>
                </tr>
              ))}
            </tbody>
            {lotesRefac.length > 0 && (
              <tfoot>
                <tr className={styles.totalsRow}>
                  <td colSpan={2}>TOTAL</td>
                  <td className={`${styles.numCell} ${styles.negative}`}>
                    -${fmt(sumDebitos(lotesRefac))}
                  </td>
                  <td className={`${styles.numCell} ${styles.positive}`}>
                    +${fmt(sumCreditos(lotesRefac))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {/* ── Total a Pagar ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: 8,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #1b56ff 0%, #0a3fd4 100%)",
            color: "#fff",
            borderRadius: 10,
            padding: "14px 28px",
            display: "flex",
            alignItems: "center",
            gap: 32,
            boxShadow: "0 4px 16px rgba(27,86,255,0.25)",
          }}
        >
          <span
            style={{ fontSize: 14, fontWeight: 600, letterSpacing: "0.04em" }}
          >
            TOTAL A PAGAR
          </span>
          <span
            style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.01em" }}
          >
            ${fmt(totalAPagar)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TabResumen;
