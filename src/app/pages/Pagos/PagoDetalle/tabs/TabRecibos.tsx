import React, { useCallback, useEffect, useState } from "react";
import { getJSON, postJSON, delJSONBody } from "@/app/shared/lib/http";
import { useAppSnackbar } from "../../../../hooks/useAppSnackbar";
import Button from "@/app/components/ui/Button/Button";
import SelectableTable from "@/app/components/ui/SelectableTable/SelectableTable";
import type { ColumnDef } from "@/app/components/ui/SelectableTable/types";
import styles from "./tabs.module.scss";
import { type Pago, fmt, nroFacturaMarcado } from "../../types";
import BotonDescarga from "@/app/components/ui/BotonDescarga/BotonDescarga";
import Dialogo from "@/app/components/ui/Dialogo/Dialogo";

const GENERAR_URL    = (pagoId: number) => `/api/pagos/${pagoId}/recibos/generar`;
const DELETE_URL     = (pagoId: number) => `/api/pagos/${pagoId}/recibos`;
const LIST_URL = (pagoId: number, estado: string) => {
  const p = new URLSearchParams({ skip: "0", limit: "1000" });
  if (estado) p.set("estado", estado);
  return `/api/pagos/${pagoId}/recibos?${p}`;
};

// ── Tipos ─────────────────────────────────────────────────────────

type InfoMedico = {
  id: number;
  nro_socio: number;
  matricula: number;
  nombre: string;
};

type AjusteItem = {
  ajuste_id?: number;
  lote_id: number;
  honorarios: number;
  gastos: number;
  total: number;
  observacion?: string | null;
};

type LiquidacionDetalle = {
  obra_social: string;
  periodo: string;
  total_honorarios: number;
  total_gastos: number;
  total_bruto: number;
  debitos: { total: number; detalle: AjusteItem[] };
  creditos: { total: number; detalle: AjusteItem[] };
};

type DeduccionItem = {
  nro_deduccion: number;
  nombre_deduccion: string;
  periodo_a_aplicar: string;
  total: number;
  // Cuando el médico paga la deducción de otro socio (por ejemplo, la cuota de su esposa).
  por_cuenta_de?: { nro_socio: number | null; nombre: string | null };
};

const nombreDeduccion = (d: DeduccionItem) =>
  d.por_cuenta_de ? `${d.nombre_deduccion} (por pago del socio Nº ${d.por_cuenta_de.nro_socio ?? "—"})` : d.nombre_deduccion;

type AdelantoRecibo = {
  adelanto_id: number;
  obra_social: string;
  nro_factura: string | null;
  factura_version: number | null;
  periodo: string;
  prestaciones: number;
  total_honorarios: number;
  total_gastos: number;
  total: number;
};

type CompensacionRecibo = {
  compensacion_id: number;
  leyenda: string;
  importe: number;
};

type Detalle = {
  liquidaciones: Record<string, LiquidacionDetalle>;
  adelantos?: { total: number; detalle: AdelantoRecibo[] };
  compensaciones?: { total: number; detalle: CompensacionRecibo[] };
  deducciones: { total: number; detalle: DeduccionItem[] };
};


type DetalleJson = {
  info_medico?: InfoMedico;
  detalle?: Detalle;
};

type ReciboRow = {
  id: number;
  nro_recibo: string;
  pago_id: number;
  medico_id: number;
  pago_medico_id?: number;
  total_neto: string | number;
  emision_timestamp: string | null;
  estado: "en_revision" | "liquidado" | "emitido" | string;
  detalle_json?: DetalleJson;
};

// ── Helpers ───────────────────────────────────────────────────────

const ESTADO_LABEL: Record<string, string> = {
  en_revision: "En revisión",
  liquidado: "Liquidado",
  emitido: "Emitido",
};

const estadoClass = (e: string) => {
  if (e === "emitido")    return styles.reciboEmitido;
  if (e === "liquidado")  return styles.medicoLiquidado;
  if (e === "en_revision") return styles.medicoPendiente;
  return "";
};

const ESTADO_OPTIONS = [
  { value: "",            label: "Todos" },
  { value: "en_revision", label: "En revisión" },
  { value: "liquidado",   label: "Liquidado" },
  { value: "emitido",     label: "Emitido" },
];

// ── Componente ────────────────────────────────────────────────────

type Props = { pago: Pago; pagoId: number };

const TabRecibos: React.FC<Props> = ({ pagoId }) => {
  const notify = useAppSnackbar();

  const [rows, setRows] = useState<ReciboRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [estadoFiltro, setEstadoFiltro] = useState("");

  // Modal generar/actualizar
  const [generarOpen, setGenerarOpen]   = useState(false);
  const [generando, setGenerando]       = useState(false);
  const [generarResult, setGenerarResult] = useState<number | null>(null);
  const [generarError, setGenerarError] = useState<string | null>(null);


  // Modal eliminar
  const [deleteTarget, setDeleteTarget] = useState<ReciboRow | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // ── Carga ──

  const loadData = useCallback(async (estado: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getJSON<ReciboRow[]>(LIST_URL(pagoId, estado));
      setRows(data ?? []);
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar los recibos.");
    } finally {
      setLoading(false);
    }
  }, [pagoId]);

  useEffect(() => { loadData(estadoFiltro); }, [loadData, estadoFiltro]);

  // ── Acciones ──

  const handleGenerar = async () => {
    setGenerando(true);
    setGenerarError(null);
    try {
      const result = await postJSON<ReciboRow[]>(GENERAR_URL(pagoId));
      setGenerarResult(Array.isArray(result) ? result.length : 0);
      await loadData(estadoFiltro);
    } catch (e: any) {
      setGenerarError(e?.response?.data?.detail ?? e?.message ?? "Error al generar.");
    } finally {
      setGenerando(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await delJSONBody(DELETE_URL(pagoId), { recibo_ids: [deleteTarget.id] });
      notify(`Recibo ${deleteTarget.nro_recibo} eliminado.`);
      setDeleteTarget(null);
      await loadData(estadoFiltro);
    } catch (e: any) {
      const detail = e?.response?.data;
      if (detail?.reason === "recibos_pagados") {
        notify("No se pueden eliminar recibos en estado 'pagado'.", "error");
      } else {
        notify(detail?.message ?? detail?.detail ?? e?.message ?? "Error al eliminar.", "error");
      }
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  // ── PDF ──

  const generatePDF = async (recibo: ReciboRow) => {
    const dj = recibo.detalle_json;
    const info = dj?.info_medico;
    const detalle = dj?.detalle;

    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default as any;
    const doc = new jsPDF({ unit: "pt", format: "A4" });
    const pageW = doc.internal.pageSize.getWidth();
    const left = 40;
    let y = 0;

    // ── Banner ──
    doc.setFillColor(27, 86, 255);
    doc.rect(0, 0, pageW, 52, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15); doc.setFont("helvetica", "bold");
    doc.text("RECIBO DE LIQUIDACIÓN", left, 34);
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text(`Pago #${pagoId}`, pageW - 40, 34, { align: "right" });
    y = 72;

    // ── Encabezado médico ──
    const col2x = pageW / 2 + 10;
    doc.setTextColor(30, 30, 30); doc.setFontSize(10);

    doc.setFont("helvetica", "bold"); doc.text("Médico:", left, y);
    doc.setFont("helvetica", "normal");
    doc.text(info?.nombre ?? `Médico #${recibo.medico_id}`, left + 50, y);
    if (info?.nro_socio != null) {
      doc.setFont("helvetica", "bold"); doc.text("Nro. Socio:", col2x, y);
      doc.setFont("helvetica", "normal"); doc.text(String(info.nro_socio), col2x + 65, y);
    }
    y += 16;
    if (info?.matricula != null) {
      doc.setFont("helvetica", "bold"); doc.text("Matrícula:", left, y);
      doc.setFont("helvetica", "normal"); doc.text(String(info.matricula), left + 58, y);
      y += 16;
    }
    doc.setFont("helvetica", "bold"); doc.text("Nro. Recibo:", left, y);
    doc.setFont("helvetica", "normal"); doc.text(recibo.nro_recibo, left + 75, y);
    doc.setFont("helvetica", "bold"); doc.text("Fecha Emisión:", col2x, y);
    doc.setFont("helvetica", "normal");
    doc.text(
      recibo.emision_timestamp ? new Date(recibo.emision_timestamp).toLocaleDateString("es-AR") : "—",
      col2x + 85, y,
    );
    y += 16;
    doc.setFont("helvetica", "bold"); doc.text("Estado:", left, y);
    doc.setFont("helvetica", "normal");
    doc.text((ESTADO_LABEL[recibo.estado] ?? recibo.estado).toUpperCase(), left + 45, y);
    y += 24;

    if (detalle) {
      const liqEntries = Object.entries(detalle.liquidaciones);

      // ── Liquidaciones ──
      if (liqEntries.length > 0) {
        doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(27, 86, 255);
        doc.text("Desglose por Obra Social", left, y); y += 6;

        const liqBody: any[][] = [];
        for (const [, liq] of liqEntries) {
          // Fila cabecera de OS
          liqBody.push([
            { content: `${liq.obra_social} — ${liq.periodo}`, colSpan: 6, styles: { fontStyle: "bold" as const, fillColor: [237, 242, 255] as any } },
          ]);
          // Fila totales de la OS
          liqBody.push([
            "  Honorarios / Gastos / Bruto",
            { content: `$${fmt(liq.total_honorarios)}`, styles: { halign: "right" as const } },
            { content: `$${fmt(liq.total_gastos)}`,     styles: { halign: "right" as const } },
            { content: `$${fmt(liq.total_bruto)}`,      styles: { halign: "right" as const } },
            { content: `-$${fmt(liq.debitos.total)}`,   styles: { halign: "right" as const, textColor: [185, 28, 28] as any } },
            { content: `+$${fmt(liq.creditos.total)}`,  styles: { halign: "right" as const, textColor: [6, 95, 70] as any } },
          ]);
          // Ajustes débito
          for (const aj of liq.debitos.detalle) {
            liqBody.push([
              { content: `    ↳ Débito Lote #${aj.lote_id}${aj.observacion ? ` — ${aj.observacion}` : ""}`, styles: { fontSize: 8, textColor: [100, 100, 100] as any } },
              { content: `$${fmt(aj.honorarios)}`, styles: { halign: "right" as const, fontSize: 8 } },
              { content: `$${fmt(aj.gastos)}`,     styles: { halign: "right" as const, fontSize: 8 } },
              { content: `$${fmt(aj.honorarios + aj.gastos)}`, styles: { halign: "right" as const, fontSize: 8 } },
              { content: `-$${fmt(aj.total)}`, styles: { halign: "right" as const, fontSize: 8, textColor: [185, 28, 28] as any } },
              "",
            ]);
          }
          // Ajustes crédito
          for (const aj of liq.creditos.detalle) {
            liqBody.push([
              { content: `    ↳ Crédito Lote #${aj.lote_id}${aj.observacion ? ` — ${aj.observacion}` : ""}`, styles: { fontSize: 8, textColor: [100, 100, 100] as any } },
              { content: `$${fmt(aj.honorarios)}`, styles: { halign: "right" as const, fontSize: 8 } },
              { content: `$${fmt(aj.gastos)}`,     styles: { halign: "right" as const, fontSize: 8 } },
              { content: `$${fmt(aj.honorarios + aj.gastos)}`, styles: { halign: "right" as const, fontSize: 8 } },
              "",
              { content: `+$${fmt(aj.total)}`, styles: { halign: "right" as const, fontSize: 8, textColor: [6, 95, 70] as any } },
            ]);
          }
        }

        autoTable(doc, {
          startY: y,
          head: [["Obra Social / Detalle", "Honorarios", "Gastos", "Bruto", "Débitos", "Créditos"]],
          body: liqBody,
          styles: { fontSize: 9, cellPadding: 4 },
          headStyles: { fillColor: [27, 86, 255], textColor: 255, fontStyle: "bold" },
          columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } },
          margin: { left, right: 40 },
        });
        y = (doc as any).lastAutoTable.finalY + 16;
      }

      // ── Adelantos ──
      const adelantos = detalle.adelantos?.detalle ?? [];
      if (adelantos.length > 0) {
        doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(27, 86, 255);
        doc.text("Adelantos", left, y); y += 6;
        autoTable(doc, {
          startY: y,
          head: [["Adelanto / Factura", "Prest.", "Honorarios", "Gastos", "Total"]],
          body: adelantos.map((a) => [
            `Adelanto #${a.adelanto_id} · ${a.obra_social} — Factura N° ${nroFacturaMarcado(a.nro_factura, a.factura_version)} (${a.periodo})`,
            String(a.prestaciones),
            `$${fmt(a.total_honorarios)}`,
            `$${fmt(a.total_gastos)}`,
            `$${fmt(a.total)}`,
          ]),
          styles: { fontSize: 9, cellPadding: 4 },
          headStyles: { fillColor: [27, 86, 255], textColor: 255, fontStyle: "bold" },
          columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
          margin: { left, right: 40 },
        });
        y = (doc as any).lastAutoTable.finalY + 16;
      }

      // ── Compensaciones (sólo la leyenda: la nota interna no sale en el recibo) ──
      const compensaciones = detalle.compensaciones?.detalle ?? [];
      if (compensaciones.length > 0) {
        doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(27, 86, 255);
        doc.text("Compensaciones", left, y); y += 6;
        autoTable(doc, {
          startY: y,
          head: [["Concepto", "Importe"]],
          body: compensaciones.map((c) => [c.leyenda, `${c.importe < 0 ? "-" : "+"}$${fmt(Math.abs(c.importe))}`]),
          styles: { fontSize: 9, cellPadding: 5 },
          headStyles: { fillColor: [27, 86, 255], textColor: 255, fontStyle: "bold" },
          columnStyles: { 1: { halign: "right" } },
          margin: { left, right: 40 },
        });
        y = (doc as any).lastAutoTable.finalY + 16;
      }

      // ── Deducciones ──
      const deds = detalle.deducciones.detalle;
      if (deds.length > 0) {
        doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(27, 86, 255);
        doc.text("Deducciones", left, y); y += 6;
        autoTable(doc, {
          startY: y,
          head: [["Concepto", "Período", "Total"]],
          body: deds.map((dd) => [nombreDeduccion(dd), dd.periodo_a_aplicar, `-$${fmt(dd.total)}`]),
          styles: { fontSize: 9, cellPadding: 5 },
          headStyles: { fillColor: [55, 65, 81], textColor: 255, fontStyle: "bold" },
          columnStyles: { 2: { halign: "right", textColor: [185, 28, 28] } },
          margin: { left, right: 40 },
        });
        y = (doc as any).lastAutoTable.finalY + 16;
      }

      // ── Resumen ──
      const liqVals = Object.values(detalle.liquidaciones);
      const sumLiq  = (fn: (l: LiquidacionDetalle) => number) => liqVals.reduce((a, l) => a + fn(l), 0);
      // El adelanto es producción del médico: suma a honorarios, gastos y bruto.
      const sumAdel = (fn: (a: AdelantoRecibo) => number) => adelantos.reduce((a, x) => a + fn(x), 0);
      const totalHon = sumLiq((l) => l.total_honorarios) + sumAdel((a) => a.total_honorarios);
      const totalGas = sumLiq((l) => l.total_gastos) + sumAdel((a) => a.total_gastos);
      const totalBru = sumLiq((l) => l.total_bruto) + sumAdel((a) => a.total);
      const totalDeb = sumLiq((l) => l.debitos.total);
      const totalCrd = sumLiq((l) => l.creditos.total);
      const totalComp = detalle.compensaciones?.total ?? 0;
      const totalRec = totalBru + totalCrd - totalDeb + totalComp;
      const totalDed = detalle.deducciones.total;
      const neto     = Math.max(0, totalRec - totalDed);

      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(27, 86, 255);
      doc.text("Resumen Financiero", left, y); y += 6;

      const summaryRows: string[][] = [
        ["Honorarios",  `$${fmt(totalHon)}`],
        ["Gastos",      `$${fmt(totalGas)}`],
        ["Bruto",       `$${fmt(totalBru)}`],
        ["Débitos",    `-$${fmt(totalDeb)}`],
        ["Créditos",   `+$${fmt(totalCrd)}`],
        ...(totalComp !== 0 ? [["Compensaciones", `${totalComp < 0 ? "-" : "+"}$${fmt(Math.abs(totalComp))}`]] : []),
        ["Reconocido",  `$${fmt(totalRec)}`],
        ["Deducciones",`-$${fmt(totalDed)}`],
      ];
      const netoIdx = summaryRows.length;
      autoTable(doc, {
        startY: y,
        head: [["Concepto", "Monto"]],
        body: [...summaryRows, ["Neto a pagar", `$${fmt(neto)}`]],
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [27, 86, 255], textColor: 255, fontStyle: "bold" },
        columnStyles: { 1: { halign: "right" } },
        didParseCell: (hook: any) => {
          if (hook.section === "body" && hook.row.index === netoIdx) {
            hook.cell.styles.fontStyle = "bold";
            hook.cell.styles.fillColor = [240, 244, 255];
            hook.cell.styles.textColor = [27, 86, 255];
          }
        },
        margin: { left, right: 40 },
      });
    }

    doc.save(`recibo_${recibo.nro_recibo}.pdf`);
  };

  // ── Columnas ──

  const columns: ColumnDef<ReciboRow>[] = [
    { key: "nro_recibo", header: "Nro. Recibo" },
    {
      key: "medico_id",
      header: "Socio",
      render: (r) => (
        <div>
          <div style={{ fontWeight: 500 }}>{r.detalle_json?.info_medico?.nombre ?? `Médico #${r.medico_id}`}</div>
          {r.detalle_json?.info_medico?.nro_socio != null && (
            <div style={{ fontSize: 11, color: "#94a3b8" }}>Socio #{r.detalle_json.info_medico.nro_socio}</div>
          )}
        </div>
      ),
    },
    {
      key: "total_neto",
      header: "Neto",
      alignRight: true,
      render: (r) => `$${fmt(r.total_neto)}`,
    },
    {
      key: "emision_timestamp",
      header: "Fecha Emisión",
      render: (r) => r.emision_timestamp
        ? new Date(r.emision_timestamp).toLocaleDateString("es-AR")
        : "—",
    },
    {
      key: "estado",
      header: "Estado",
      render: (r) => (
        <span className={`${styles.badge} ${estadoClass(r.estado)}`}>
          {ESTADO_LABEL[r.estado] ?? r.estado}
        </span>
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      render: (r) => (
        <div className={styles.rowActions}>
          {r.estado !== "emitido" && (
            <Button
              size="sm"
              variant="danger"
              onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}
            >
              Eliminar
            </Button>
          )}
          <BotonDescarga formato="pdf" onClick={(e) => { e.stopPropagation(); generatePDF(r); }} />
        </div>
      ),
    },
  ];

  // ── Render ──

  return (
    <div className={styles.tabWrap}>
      <div className={styles.toolbar}>
        <select
          className={styles.formSelect}
          style={{ minWidth: 160 }}
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value)}
          disabled={loading}
        >
          {ESTADO_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <div className={styles.toolbarLeft}>
          <Button
            variant="secondary"
            onClick={() => { setGenerarResult(null); setGenerarError(null); setGenerarOpen(true); }}
          >
            Generar / Actualizar
          </Button>
        </div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <SelectableTable
        rows={rows}
        columns={columns}
        actions={[]}
        emptyMessage="No hay recibos. Usá 'Generar / Actualizar' para crear los recibos del pago."
        loading={loading}
      />

      {/* Modal generar/actualizar */}
      {generarOpen && (
        <Dialogo
          titulo="Generar o actualizar recibos"
          onClose={() => { setGenerarOpen(false); setGenerarResult(null); setGenerarError(null); }}
          acciones={
            <>
              <Button
                variant="secondary"
                onClick={() => { setGenerarOpen(false); setGenerarResult(null); setGenerarError(null); }}
                disabled={generando}
              >
                {generarResult != null ? "Cerrar" : "Cancelar"}
              </Button>
              {generarResult == null && (
                <Button variant="primary" onClick={handleGenerar} disabled={generando}>
                  {generando ? "Generando…" : "Generar"}
                </Button>
              )}
            </>
          }
        >
              {generarError && <div className={styles.errorInline}>{generarError}</div>}
              {generarResult != null ? (
                <div className={styles.successInline}>
                  Listo. Se generaron / actualizaron <strong>{generarResult}</strong> recibos.
                </div>
              ) : !generando && (
                <p>
                  Se generarán o actualizarán los recibos para todos los médicos del pago.
                  <br />
                  <span style={{ fontSize: 12, color: "#64748b" }}>
                    Esta operación es idempotente — si ya existen, se actualizan.
                  </span>
                </p>
              )}
              {generando && <p style={{ color: "#64748b" }}>Generando… por favor esperá.</p>}
            </Dialogo>
      )}

      {/* Modal eliminar */}
      {deleteTarget && (
        <Dialogo
          titulo="Eliminar recibo"
          peligro
          onClose={(deleting) ? undefined : () => setDeleteTarget(null)}
          acciones={
            <>
              <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Eliminando…" : "Eliminar"}
              </Button>
            </>
          }
        >
              <p>
                ¿Eliminar el recibo <strong>{deleteTarget.nro_recibo}</strong>?
                <br />
                <span style={{ fontSize: 12, color: "#64748b" }}>Esta acción no se puede deshacer.</span>
              </p>
            </Dialogo>
      )}
    </div>
  );
};

export default TabRecibos;
