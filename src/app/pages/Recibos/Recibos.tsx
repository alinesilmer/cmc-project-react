// app/pages/Recibos/Recibos.tsx
"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { getJSON, postJSON, putJSON } from "../../lib/http";
import BackButton from "../../components/atoms/BackButton/BackButton";
import Button from "../../components/atoms/Button/Button";
import Card from "../../components/atoms/Card/Card";
import styles from "./Recibos.module.scss";

// ─── Endpoints ────────────────────────────────────────────────────────────────
const RESUMEN_BY_ID = (id: string | number) => `/api/liquidacion/resumen/${id}`;
const RECIBOS_LIST = (id: string | number, skip: number, limit: number, estado: string) => {
  const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
  if (estado) params.set("estado", estado);
  return `/api/liquidacion/resumen/${id}/recibos?${params}`;
};
const RECIBOS_EMITIR  = (id: string | number) => `/api/liquidacion/resumen/${id}/emitir_recibos`;
const RECIBO_ANULAR   = (rid: string | number) => `/api/liquidacion/recibos/${rid}/anular`;
const RECIBO_DETALLE  = (rid: string | number) => `/api/liquidacion/recibos/${rid}/detalle`;

const PAGE_SIZE = 50;

// ─── Tipos ────────────────────────────────────────────────────────────────────
type ReciboItem = {
  id: number;
  liquidacion_id: number;
  concepto: string;
  importe: number;
};

type ReciboRow = {
  id: number | string;
  nro_recibo: string;
  medico_id: number | string;
  total_neto: number;
  emision_timestamp: string;
  estado: "emitido" | "anulado" | "pagado" | string;
  items: ReciboItem[];
};

type DcItem = {
  dc_id: number;
  prestacion_id: number;
  codigo_prestacion: string;
  fecha: string;
  monto: number;
  motivo: string;
};

type LiqDetalle = {
  liquidacion_id: number;
  obra_social_id: number;
  obra_social_nombre: string;
  mes_periodo: number;
  anio_periodo: number;
  nro_factura: string;
  bruto: number;
  debitos: DcItem[];
  total_debitos: number;
  creditos: DcItem[];
  total_creditos: number;
  reconocido: number;
};

type DeduccionItem = {
  concepto_tipo: string;
  concepto_id: number;
  nombre: string;
  aplicado: number;
};

type ReciboDetalle = {
  medico: { id: number; nro_socio: number; nombre: string };
  recibo: { id: number; nro_recibo: string; emision_timestamp: string; estado: string } | null;
  liquidaciones: LiqDetalle[];
  deducciones: DeduccionItem[];
  total_bruto: number;
  total_debitos: number;
  total_creditos: number;
  total_reconocido: number;
  total_deducciones: number;
  neto_a_pagar: number;
};

type DetailState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; data: ReciboDetalle }
  | { status: "error"; msg: string };

type ResumenBasic = { id: number; mes: number; anio: number };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const currency = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0 });
const fmt = (n: number | string | null | undefined) => currency.format(Number(n ?? 0));

function parseRecibo(raw: any): ReciboRow {
  return {
    id: raw.id ?? raw.recibo_id ?? "",
    nro_recibo: String(raw.nro_recibo ?? raw.nro ?? "—"),
    medico_id: raw.medico_id ?? "—",
    total_neto: Number(raw.total_neto ?? 0),
    emision_timestamp: raw.emision_timestamp
      ? new Date(raw.emision_timestamp).toLocaleDateString("es-AR")
      : "—",
    estado: String(raw.estado ?? "emitido"),
    items: Array.isArray(raw.items)
      ? raw.items.map((it: any) => ({
          id: it.id,
          liquidacion_id: it.liquidacion_id,
          concepto: String(it.concepto ?? "—"),
          importe: Number(it.importe ?? 0),
        }))
      : [],
  };
}

function parseLiqDetalle(raw: any): LiqDetalle {
  const parseDc = (dc: any): DcItem => ({
    dc_id: dc.dc_id,
    prestacion_id: dc.prestacion_id,
    codigo_prestacion: String(dc.codigo_prestacion ?? ""),
    fecha: dc.fecha ?? "",
    monto: Number(dc.monto ?? 0),
    motivo: String(dc.motivo ?? ""),
  });
  return {
    liquidacion_id: raw.liquidacion_id,
    obra_social_id: raw.obra_social_id,
    obra_social_nombre: String(raw.obra_social_nombre ?? `OS ${raw.obra_social_id}`),
    mes_periodo: raw.mes_periodo,
    anio_periodo: raw.anio_periodo,
    nro_factura: String(raw.nro_factura ?? ""),
    bruto: Number(raw.bruto ?? 0),
    debitos: Array.isArray(raw.debitos) ? raw.debitos.map(parseDc) : [],
    total_debitos: Number(raw.total_debitos ?? 0),
    creditos: Array.isArray(raw.creditos) ? raw.creditos.map(parseDc) : [],
    total_creditos: Number(raw.total_creditos ?? 0),
    reconocido: Number(raw.reconocido ?? 0),
  };
}

function parseReciboDetalle(raw: any): ReciboDetalle {
  return {
    medico: {
      id: raw.medico?.id ?? 0,
      nro_socio: raw.medico?.nro_socio ?? 0,
      nombre: String(raw.medico?.nombre ?? ""),
    },
    recibo: raw.recibo ?? null,
    liquidaciones: Array.isArray(raw.liquidaciones)
      ? raw.liquidaciones.map(parseLiqDetalle)
      : [],
    deducciones: Array.isArray(raw.deducciones)
      ? raw.deducciones.map((d: any) => ({
          concepto_tipo: String(d.concepto_tipo ?? ""),
          concepto_id: d.concepto_id,
          nombre: String(d.nombre ?? "Deducción"),
          aplicado: Number(d.aplicado ?? 0),
        }))
      : [],
    total_bruto: Number(raw.total_bruto ?? 0),
    total_debitos: Number(raw.total_debitos ?? 0),
    total_creditos: Number(raw.total_creditos ?? 0),
    total_reconocido: Number(raw.total_reconocido ?? 0),
    total_deducciones: Number(raw.total_deducciones ?? 0),
    neto_a_pagar: Number(raw.neto_a_pagar ?? 0),
  };
}

const ESTADO_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "emitido", label: "Emitido" },
  { value: "anulado", label: "Anulado" },
  { value: "pagado", label: "Pagado" },
];

// ─── Componente ───────────────────────────────────────────────────────────────
const Recibos: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [resumen, setResumen] = useState<ResumenBasic | null>(null);
  const [rows, setRows] = useState<ReciboRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Paginación
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [estadoFiltro, setEstadoFiltro] = useState("");

  // Filas expandidas — cache keyed by recibo_id
  const [expandedRows, setExpandedRows] = useState<Set<string | number>>(new Set());
  const [reciboDetalles, setReciboDetalles] = useState<Record<string, DetailState>>({});

  // Modal emitir
  const [emitirOpen, setEmitirOpen] = useState(false);
  const [emitting, setEmitting] = useState(false);
  const [emitResult, setEmitResult] = useState<{ total_recibos: number } | null>(null);
  const [emitError, setEmitError] = useState<string | null>(null);

  // Modal anular
  const [anularTarget, setAnularTarget] = useState<ReciboRow | null>(null);
  const [motivoAnular, setMotivoAnular] = useState("");
  const [anulando, setAnulando] = useState(false);
  const [anularError, setAnularError] = useState<string | null>(null);

  // ── Carga de lista ──────────────────────────────────────────────────────────
  const loadData = useCallback(async (currentPage: number, estado: string) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const skip = (currentPage - 1) * PAGE_SIZE;
    try {
      const [resumenData, recibosData] = await Promise.all([
        getJSON<ResumenBasic>(RESUMEN_BY_ID(id)),
        getJSON<any[]>(RECIBOS_LIST(id, skip, PAGE_SIZE, estado)),
      ]);
      setResumen(resumenData);
      const parsed = (recibosData ?? []).map(parseRecibo);
      setRows(parsed);
      setHasMore(parsed.length === PAGE_SIZE);
      setExpandedRows(new Set());
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar los recibos.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(page, estadoFiltro); }, [loadData, page, estadoFiltro]);

  // ── Fetch detalle por recibo ────────────────────────────────────────────────
  const fetchDetalle = async (reciboId: string | number): Promise<ReciboDetalle | null> => {
    const key = String(reciboId);
    const cached = reciboDetalles[key];
    if (cached?.status === "ok") return cached.data;

    setReciboDetalles((prev) => ({ ...prev, [key]: { status: "loading" } }));
    try {
      const raw = await getJSON<any>(RECIBO_DETALLE(reciboId));
      const data = parseReciboDetalle(raw);
      setReciboDetalles((prev) => ({ ...prev, [key]: { status: "ok", data } }));
      return data;
    } catch (e: any) {
      const msg = e?.message || "Error al cargar detalle";
      setReciboDetalles((prev) => ({ ...prev, [key]: { status: "error", msg } }));
      return null;
    }
  };

  // ── Toggle fila expandida ───────────────────────────────────────────────────
  const toggleRow = (recibo: ReciboRow) => {
    const key = recibo.id;
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
    const cached = reciboDetalles[String(key)];
    if (!cached || cached.status === "idle") {
      fetchDetalle(key);
    }
  };

  // ── Paginación / filtro ─────────────────────────────────────────────────────
  const handleEstadoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEstadoFiltro(e.target.value);
    setPage(1);
  };
  const handlePageChange = (newPage: number) => {
    if (newPage < 1) return;
    if (newPage > page && !hasMore) return;
    setPage(newPage);
  };

  // ── Emitir ──────────────────────────────────────────────────────────────────
  const handleEmitir = async () => {
    if (!id) return;
    setEmitting(true);
    setEmitError(null);
    try {
      const result = await postJSON<{ total_recibos: number }>(RECIBOS_EMITIR(id));
      setEmitResult(result);
      setPage(1);
      await loadData(1, estadoFiltro);
    } catch (e: any) {
      const status = e?.response?.status ?? e?.status;
      if (status === 409) {
        setEmitResult({ total_recibos: 0 });
        await loadData(1, estadoFiltro);
      } else {
        setEmitError(e?.response?.data?.detail || e?.message || "No se pudieron emitir los recibos.");
      }
    } finally {
      setEmitting(false);
    }
  };

  // ── Anular ──────────────────────────────────────────────────────────────────
  const handleAnular = async () => {
    if (!anularTarget || !motivoAnular.trim()) return;
    setAnulando(true);
    setAnularError(null);
    try {
      await putJSON(RECIBO_ANULAR(anularTarget.id), { motivo: motivoAnular.trim() });
      setAnularTarget(null);
      setMotivoAnular("");
      await loadData(page, estadoFiltro);
    } catch (e: any) {
      setAnularError(e?.message || "No se pudo anular el recibo.");
    } finally {
      setAnulando(false);
    }
  };

  // ── PDF ─────────────────────────────────────────────────────────────────────
  const generatePDF = async (recibo: ReciboRow) => {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default as any;

    // Asegurar que el detalle esté disponible (fetch si no está cacheado)
    const detail = await fetchDetalle(recibo.id);

    const doc = new jsPDF({ unit: "pt", format: "A4" });
    const pageW = doc.internal.pageSize.getWidth();
    const left = 40;
    const right = pageW - 40;
    let y = 0;

    // Encabezado azul
    doc.setFillColor(27, 86, 255);
    doc.rect(0, 0, pageW, 52, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.text("RECIBO DE LIQUIDACIÓN", left, 34);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Período ${periodTitle}`, right, 34, { align: "right" });
    y = 72;

    // Info médico + recibo
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    const col2x = pageW / 2 + 10;

    const medicoNombre = detail?.medico?.nombre || `Médico ID: ${recibo.medico_id}`;
    const medicoSocio  = detail?.medico?.nro_socio ? `Nro. Socio: ${detail.medico.nro_socio}` : "";

    doc.setFont("helvetica", "bold");   doc.text("Médico:",       left,  y);
    doc.setFont("helvetica", "normal"); doc.text(medicoNombre,    left + 50, y);
    if (medicoSocio) {
      doc.setFont("helvetica", "bold");   doc.text("Nro. Socio:", col2x, y);
      doc.setFont("helvetica", "normal"); doc.text(String(detail!.medico.nro_socio), col2x + 65, y);
    }
    y += 16;

    doc.setFont("helvetica", "bold");   doc.text("Nro. Recibo:",    left,  y);
    doc.setFont("helvetica", "normal"); doc.text(recibo.nro_recibo, left + 75, y);
    doc.setFont("helvetica", "bold");   doc.text("Fecha Emisión:", col2x, y);
    doc.setFont("helvetica", "normal"); doc.text(recibo.emision_timestamp, col2x + 85, y);
    y += 16;

    doc.setFont("helvetica", "bold");   doc.text("Estado:", left, y);
    doc.setFont("helvetica", "normal"); doc.text(recibo.estado.toUpperCase(), left + 45, y);
    y += 22;

    // ── Tabla: Desglose por Obra Social ──────────────────────────────────────
    if (detail && detail.liquidaciones.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(27, 86, 255);
      doc.text("Desglose por Obra Social", left, y);
      y += 6;

      const osBody: any[][] = [];
      for (const liq of detail.liquidaciones) {
        const periodo = `${liq.anio_periodo}-${String(liq.mes_periodo).padStart(2, "0")}`;
        osBody.push([
          { content: `${liq.obra_social_nombre} — ${periodo} — ${liq.nro_factura}`, styles: { fontStyle: "bold" as const } },
          "",
        ]);
        osBody.push(["  Bruto facturado", `$${fmt(liq.bruto)}`]);
        if (liq.debitos.length > 0) {
          osBody.push([
            { content: `  Débitos (${liq.debitos.length})`, styles: { textColor: [185, 28, 28] as any } },
            { content: `-$${fmt(liq.total_debitos)}`, styles: { textColor: [185, 28, 28] as any } },
          ]);
          for (const dc of liq.debitos) {
            osBody.push([
              `    • ${dc.codigo_prestacion} ${dc.motivo ? `— ${dc.motivo}` : ""}`.trim(),
              { content: `-$${fmt(dc.monto)}`, styles: { textColor: [185, 28, 28] as any } },
            ]);
          }
        }
        if (liq.creditos.length > 0) {
          osBody.push([
            { content: `  Créditos (${liq.creditos.length})`, styles: { textColor: [6, 95, 70] as any } },
            { content: `+$${fmt(liq.total_creditos)}`, styles: { textColor: [6, 95, 70] as any } },
          ]);
          for (const dc of liq.creditos) {
            osBody.push([
              `    • ${dc.codigo_prestacion} ${dc.motivo ? `— ${dc.motivo}` : ""}`.trim(),
              { content: `+$${fmt(dc.monto)}`, styles: { textColor: [6, 95, 70] as any } },
            ]);
          }
        }
        osBody.push([
          { content: "  Reconocido", styles: { fontStyle: "bold" as const } },
          { content: `$${fmt(liq.reconocido)}`, styles: { fontStyle: "bold" as const } },
        ]);
      }

      autoTable(doc, {
        startY: y,
        head: [["Obra Social / Detalle", "Monto"]],
        body: osBody,
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [27, 86, 255], textColor: 255, fontStyle: "bold" },
        columnStyles: { 1: { halign: "right", cellWidth: 90 } },
        margin: { left, right: 40 },
      });
      y = (doc as any).lastAutoTable.finalY + 16;
    }

    // ── Tabla: Deducciones ────────────────────────────────────────────────────
    if (detail && detail.deducciones.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(27, 86, 255);
      doc.text("Deducciones", left, y);
      y += 6;

      autoTable(doc, {
        startY: y,
        head: [["Concepto", "Monto"]],
        body: detail.deducciones.map((d) => [d.nombre, `-$${fmt(d.aplicado)}`]),
        styles: { fontSize: 10, cellPadding: 5 },
        headStyles: { fillColor: [55, 65, 81], textColor: 255, fontStyle: "bold" },
        columnStyles: { 1: { halign: "right", textColor: [185, 28, 28] } },
        margin: { left, right: 40 },
      });
      y = (doc as any).lastAutoTable.finalY + 16;
    }

    // ── Tabla: Resumen financiero ─────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(27, 86, 255);
    doc.text("Resumen Financiero", left, y);
    y += 6;

    const summaryRows = detail
      ? [
          ["Bruto facturado",  `$${fmt(detail.total_bruto)}`],
          ["Débitos OS",       `-$${fmt(detail.total_debitos)}`],
          ["Créditos OS",      `+$${fmt(detail.total_creditos)}`],
          ["Reconocido",       `$${fmt(detail.total_reconocido)}`],
          ["Deducciones",      `-$${fmt(detail.total_deducciones)}`],
        ]
      : [];
    const netoIndex = summaryRows.length;

    autoTable(doc, {
      startY: y,
      head: [["Concepto", "Monto"]],
      body: [
        ...summaryRows,
        ["Neto a pagar", `$${fmt(detail ? detail.neto_a_pagar : recibo.total_neto)}`],
      ],
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [27, 86, 255], textColor: 255, fontStyle: "bold" },
      columnStyles: { 1: { halign: "right" } },
      didParseCell: (hook: any) => {
        if (hook.section === "body" && hook.row.index === netoIndex) {
          hook.cell.styles.fontStyle = "bold";
          hook.cell.styles.fillColor = [240, 244, 255];
          hook.cell.styles.textColor = [27, 86, 255];
        }
      },
      margin: { left, right: 40 },
    });

    doc.save(`recibo_${recibo.nro_recibo}.pdf`);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  const periodTitle = resumen
    ? `${resumen.anio}-${String(resumen.mes).padStart(2, "0")}`
    : "—";

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <BackButton />
              <div className={styles.breadcrumb}>RECIBOS</div>
              <h1 className={styles.title}>Período {periodTitle}</h1>
            </div>
            <div className={styles.headerActions}>
              <select className={styles.filterSelect} value={estadoFiltro} onChange={handleEstadoChange} disabled={loading}>
                {ESTADO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <Button variant="primary" onClick={() => setEmitirOpen(true)} disabled={emitting}>
                Emitir Recibos
              </Button>
              <Button variant="secondary" onClick={() => navigate(`/panel/liquidation/${id}/medicos`)}>
                ← Liq. Médico
              </Button>
            </div>
          </div>

          {error && <div className={styles.errorBanner}>{error}</div>}

          <Card className={styles.tableCard}>
            {loading ? (
              <div className={styles.loadingState}>Cargando…</div>
            ) : (
              <>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.thToggle} />
                        <th>Nro. Recibo</th>
                        <th>Médico</th>
                        <th>Neto</th>
                        <th>Fecha Emisión</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 && (
                        <tr>
                          <td colSpan={7} className={styles.emptyCell}>
                            No hay recibos. Emití los recibos primero.
                          </td>
                        </tr>
                      )}
                      {rows.map((r, i) => {
                        const isExpanded  = expandedRows.has(r.id);
                        const detailState = reciboDetalles[String(r.id)];

                        return (
                          <React.Fragment key={`${r.id}-${i}`}>
                            {/* ── Fila principal ── */}
                            <tr className={isExpanded ? styles.rowExpanded : undefined}>
                              <td className={styles.tdToggle}>
                                <button className={styles.toggleBtn} onClick={() => toggleRow(r)} title={isExpanded ? "Colapsar" : "Ver detalle"}>
                                  {isExpanded ? "▼" : "▶"}
                                </button>
                              </td>
                              <td>{r.nro_recibo}</td>
                              <td>{r.medico_id}</td>
                              <td className={styles.numCell}>${fmt(r.total_neto)}</td>
                              <td>{r.emision_timestamp}</td>
                              <td>
                                <span className={`${styles.badge} ${styles[`estado_${r.estado}`] ?? styles.badgeDefault}`}>
                                  {r.estado}
                                </span>
                              </td>
                              <td>
                                <div className={styles.rowActions}>
                                  <button className={styles.actionBtn} onClick={() => generatePDF(r)} title="Descargar PDF">PDF</button>
                                  {r.estado === "emitido" && (
                                    <button
                                      className={`${styles.actionBtn} ${styles.anularBtn}`}
                                      onClick={() => { setAnularTarget(r); setMotivoAnular(""); setAnularError(null); }}
                                      title="Anular recibo"
                                    >
                                      Anular
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {/* ── Fila expandida ── */}
                            {isExpanded && (
                              <tr className={styles.detailRow}>
                                <td colSpan={7} className={styles.detailCell}>
                                  {/* Loading / error */}
                                  {(!detailState || detailState.status === "loading" || detailState.status === "idle") && (
                                    <p className={styles.detailLoading}>Cargando detalle…</p>
                                  )}
                                  {detailState?.status === "error" && (
                                    <p className={styles.detailError}>{detailState.msg}</p>
                                  )}
                                  {detailState?.status === "ok" && (
                                    <div className={styles.detailWrap}>
                                      {/* Nombre del médico */}
                                      <div className={styles.medicoHeader}>
                                        <strong>{detailState.data.medico.nombre}</strong>
                                        <span className={styles.medicoSocio}>Nro. Socio: {detailState.data.medico.nro_socio}</span>
                                      </div>

                                      <div className={styles.detailGrid}>
                                        {/* Izq: OS + Deducciones */}
                                        <div className={styles.detailLeft}>
                                          {/* Liquidaciones por OS */}
                                          <div className={styles.detailSectionTitle}>Liquidaciones por Obra Social</div>
                                          {detailState.data.liquidaciones.length === 0 ? (
                                            <p className={styles.detailEmpty}>Sin liquidaciones.</p>
                                          ) : (
                                            detailState.data.liquidaciones.map((liq) => (
                                              <div key={liq.liquidacion_id} className={styles.liqEntry}>
                                                <div className={styles.liqEntryHeader}>
                                                  <span className={styles.liqOS}>{liq.obra_social_nombre}</span>
                                                  <span className={styles.liqMeta}>
                                                    {liq.anio_periodo}-{String(liq.mes_periodo).padStart(2, "0")} · {liq.nro_factura}
                                                  </span>
                                                </div>
                                                <table className={styles.innerTable}>
                                                  <tbody>
                                                    <tr>
                                                      <td>Bruto facturado</td>
                                                      <td className={styles.numCell}>${fmt(liq.bruto)}</td>
                                                    </tr>
                                                    {liq.debitos.length > 0 && (
                                                      <>
                                                        <tr className={styles.dcGroupRow}>
                                                          <td className={styles.negative}>Débitos OS</td>
                                                          <td className={`${styles.numCell} ${styles.negative}`}>-${fmt(liq.total_debitos)}</td>
                                                        </tr>
                                                        {liq.debitos.map((dc) => (
                                                          <tr key={dc.dc_id} className={styles.dcItemRow}>
                                                            <td className={styles.dcItemLabel}>
                                                              • {dc.codigo_prestacion}{dc.motivo ? ` — ${dc.motivo}` : ""}
                                                            </td>
                                                            <td className={`${styles.numCell} ${styles.negative}`}>-${fmt(dc.monto)}</td>
                                                          </tr>
                                                        ))}
                                                      </>
                                                    )}
                                                    {liq.creditos.length > 0 && (
                                                      <>
                                                        <tr className={styles.dcGroupRow}>
                                                          <td className={styles.positive}>Créditos OS</td>
                                                          <td className={`${styles.numCell} ${styles.positive}`}>+${fmt(liq.total_creditos)}</td>
                                                        </tr>
                                                        {liq.creditos.map((dc) => (
                                                          <tr key={dc.dc_id} className={styles.dcItemRow}>
                                                            <td className={styles.dcItemLabel}>
                                                              • {dc.codigo_prestacion}{dc.motivo ? ` — ${dc.motivo}` : ""}
                                                            </td>
                                                            <td className={`${styles.numCell} ${styles.positive}`}>+${fmt(dc.monto)}</td>
                                                          </tr>
                                                        ))}
                                                      </>
                                                    )}
                                                    <tr className={styles.liqReconocidoRow}>
                                                      <td><strong>Reconocido</strong></td>
                                                      <td className={styles.numCell}><strong>${fmt(liq.reconocido)}</strong></td>
                                                    </tr>
                                                  </tbody>
                                                </table>
                                              </div>
                                            ))
                                          )}

                                          {/* Deducciones */}
                                          {detailState.data.deducciones.length > 0 && (
                                            <>
                                              <div className={`${styles.detailSectionTitle} ${styles.detailSectionTitleMt}`}>Deducciones</div>
                                              <table className={styles.innerTable}>
                                                <tbody>
                                                  {detailState.data.deducciones.map((d) => (
                                                    <tr key={`${d.concepto_tipo}-${d.concepto_id}`}>
                                                      <td>{d.nombre}</td>
                                                      <td className={`${styles.numCell} ${styles.negative}`}>-${fmt(d.aplicado)}</td>
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </table>
                                            </>
                                          )}
                                        </div>

                                        {/* Der: Resumen financiero */}
                                        <div className={styles.detailRight}>
                                          <div className={styles.detailSectionTitle}>Resumen Financiero</div>
                                          <div className={styles.financialLines}>
                                            <div className={styles.financialLine}>
                                              <span>Bruto facturado</span>
                                              <span>${fmt(detailState.data.total_bruto)}</span>
                                            </div>
                                            <div className={styles.financialLine}>
                                              <span>Débitos OS</span>
                                              <span className={styles.negative}>-${fmt(detailState.data.total_debitos)}</span>
                                            </div>
                                            <div className={styles.financialLine}>
                                              <span>Créditos OS</span>
                                              <span className={styles.positive}>+${fmt(detailState.data.total_creditos)}</span>
                                            </div>
                                            <div className={`${styles.financialLine} ${styles.financialLineSub}`}>
                                              <span>Reconocido</span>
                                              <span>${fmt(detailState.data.total_reconocido)}</span>
                                            </div>
                                            <div className={styles.financialLine}>
                                              <span>Deducciones</span>
                                              <span className={styles.negative}>-${fmt(detailState.data.total_deducciones)}</span>
                                            </div>
                                            <div className={`${styles.financialLine} ${styles.financialLineTotal}`}>
                                              <span>Neto a pagar</span>
                                              <span>${fmt(detailState.data.neto_a_pagar)}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {(page > 1 || hasMore) && (
                  <div className={styles.pagination}>
                    <span className={styles.paginationInfo}>Página {page}{hasMore ? "" : " (última)"}</span>
                    <div className={styles.paginationControls}>
                      <button className={styles.pageBtn} onClick={() => handlePageChange(1)} disabled={page === 1}>«</button>
                      <button className={styles.pageBtn} onClick={() => handlePageChange(page - 1)} disabled={page === 1}>‹ Anterior</button>
                      <span className={styles.pageNumber}>{page}</span>
                      <button className={styles.pageBtn} onClick={() => handlePageChange(page + 1)} disabled={!hasMore}>Siguiente ›</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Modal emitir */}
      {emitirOpen && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3>Emitir Recibos</h3>
              <button className={styles.modalClose} onClick={() => { setEmitirOpen(false); setEmitResult(null); setEmitError(null); }} aria-label="Cerrar">✕</button>
            </div>
            <div className={styles.modalBody}>
              {!emitting && !emitResult && !emitError && (
                <p>¿Seguro que querés emitir los recibos para el período <strong>{periodTitle}</strong>? Se requiere al menos una liquidación cerrada y la liquidación médica generada.</p>
              )}
              {emitting && <p className={styles.muted}>Emitiendo recibos…</p>}
              {emitResult && emitResult.total_recibos > 0 && (
                <p className={styles.successMsg}>¡Listo! Se emitieron <strong>{emitResult.total_recibos}</strong> recibos.</p>
              )}
              {emitResult && emitResult.total_recibos === 0 && (
                <p className={styles.successMsg}>Los recibos ya estaban emitidos. Se cargaron los existentes.</p>
              )}
              {emitError && <p className={styles.errorMsg}>{emitError}</p>}
            </div>
            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={() => { setEmitirOpen(false); setEmitResult(null); setEmitError(null); }} disabled={emitting}>
                {emitResult ? "Cerrar" : "Cancelar"}
              </Button>
              {!emitResult && (
                <Button variant="primary" onClick={handleEmitir} disabled={emitting}>
                  {emitting ? "Emitiendo…" : "Sí, emitir"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal anular */}
      {anularTarget && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3>Anular Recibo</h3>
              <button className={styles.modalClose} onClick={() => { setAnularTarget(null); setAnularError(null); }} aria-label="Cerrar">✕</button>
            </div>
            <div className={styles.modalBody}>
              <p>Anulando recibo <strong>{anularTarget.nro_recibo}</strong> del médico <strong>{anularTarget.medico_id}</strong>.</p>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Motivo de anulación <span style={{ color: "#b91c1c" }}>*</span></label>
                <textarea
                  className={styles.formTextarea}
                  rows={3}
                  placeholder="Ingrese el motivo..."
                  value={motivoAnular}
                  onChange={(e) => setMotivoAnular(e.target.value)}
                  disabled={anulando}
                />
              </div>
              {anularError && <p className={styles.errorMsg}>{anularError}</p>}
            </div>
            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={() => { setAnularTarget(null); setAnularError(null); }} disabled={anulando}>Cancelar</Button>
              <Button variant="danger" onClick={handleAnular} disabled={anulando || !motivoAnular.trim()}>
                {anulando ? "Anulando…" : "Anular"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recibos;
