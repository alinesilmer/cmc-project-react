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

const RESUMEN_BY_ID = (id: string | number) => `/api/liquidacion/resumen/${id}`;
const RECIBOS_LIST = (id: string | number) =>
  `/api/liquidacion/resumen/${id}/recibos`;
const RECIBOS_EMITIR = (id: string | number) =>
  `/api/liquidacion/resumen/${id}/emitir_recibos`;
const RECIBO_ANULAR = (reciboId: string | number) =>
  `/api/liquidacion/recibos/${reciboId}/anular`;

type ReciboRow = {
  id: number | string;
  nro_recibo: string;
  medico_id: number | string;
  total_neto: number;
  emision_timestamp: string;
  estado: "emitido" | "anulado" | "pagado" | string;
};

type ResumenBasic = {
  id: number;
  mes: number;
  anio: number;
};

const currency = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0 });
const fmt = (n: number | string | null | undefined) =>
  currency.format(Number(n ?? 0));

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
  };
}

const Recibos: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [resumen, setResumen] = useState<ResumenBasic | null>(null);
  const [rows, setRows] = useState<ReciboRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal emitir recibos
  const [emitirOpen, setEmitirOpen] = useState(false);
  const [emitting, setEmitting] = useState(false);
  const [emitResult, setEmitResult] = useState<{ total_recibos: number } | null>(null);
  const [emitError, setEmitError] = useState<string | null>(null);

  // Modal anular recibo
  const [anularTarget, setAnularTarget] = useState<ReciboRow | null>(null);
  const [motivoAnular, setMotivoAnular] = useState("");
  const [anulando, setAnulando] = useState(false);
  const [anularError, setAnularError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [resumenData, recibosData] = await Promise.all([
        getJSON<ResumenBasic>(RESUMEN_BY_ID(id)),
        getJSON<any[]>(RECIBOS_LIST(id)),
      ]);
      setResumen(resumenData);
      setRows((recibosData ?? []).map(parseRecibo));
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar los recibos.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEmitir = async () => {
    if (!id) return;
    setEmitting(true);
    setEmitError(null);
    try {
      const result = await postJSON<{ total_recibos: number }>(RECIBOS_EMITIR(id));
      setEmitResult(result);
      await loadData();
    } catch (e: any) {
      const status = e?.response?.status ?? e?.status;
      if (status === 409) {
        // Los recibos ya fueron emitidos — recargamos la tabla y mostramos los existentes
        setEmitResult({ total_recibos: 0 });
        await loadData();
      } else {
        setEmitError(e?.response?.data?.detail || e?.message || "No se pudieron emitir los recibos.");
      }
    } finally {
      setEmitting(false);
    }
  };

  const handleAnular = async () => {
    if (!anularTarget || !motivoAnular.trim()) return;
    setAnulando(true);
    setAnularError(null);
    try {
      await putJSON(RECIBO_ANULAR(anularTarget.id), { motivo: motivoAnular.trim() });
      setAnularTarget(null);
      setMotivoAnular("");
      await loadData();
    } catch (e: any) {
      setAnularError(e?.message || "No se pudo anular el recibo.");
    } finally {
      setAnulando(false);
    }
  };

  const generatePDF = async (recibo: ReciboRow) => {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default as any;

    const doc = new jsPDF({ unit: "pt", format: "A4" });
    const left = 40;
    let y = 40;

    doc.setFontSize(16);
    doc.text("RECIBO DE LIQUIDACIÓN", left, y);
    y += 24;

    doc.setFontSize(11);
    doc.text(`Nro. Recibo: ${recibo.nro_recibo}`, left, y); y += 16;
    doc.text(`Médico ID: ${recibo.medico_id}`, left, y); y += 16;
    doc.text(`Período: ${periodTitle}`, left, y); y += 16;
    doc.text(`Fecha Emisión: ${recibo.emision_timestamp}`, left, y); y += 16;
    doc.text(`Estado: ${recibo.estado.toUpperCase()}`, left, y); y += 24;

    autoTable(doc, {
      startY: y,
      head: [["Concepto", "Importe"]],
      body: [
        ["Neto a Pagar", `$${fmt(recibo.total_neto)}`],
      ],
      styles: { fontSize: 10, cellPadding: 8 },
      headStyles: { fillColor: [27, 86, 255], textColor: 255 },
    });

    doc.save(`recibo_${recibo.nro_recibo}.pdf`);
  };

  const periodTitle = resumen
    ? `${resumen.anio}-${String(resumen.mes).padStart(2, "0")}`
    : "—";

  const totalNeto = rows.reduce((s, r) => s + r.total_neto, 0);

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <BackButton />
              <div className={styles.breadcrumb}>RECIBOS</div>
              <h1 className={styles.title}>Período {periodTitle}</h1>
              {rows.length > 0 && (
                <div className={styles.totalBadge}>
                  Total emitido: <strong>${fmt(totalNeto)}</strong>
                </div>
              )}
            </div>
            <div className={styles.headerActions}>
              <Button
                variant="primary"
                onClick={() => setEmitirOpen(true)}
                disabled={emitting}
              >
                Emitir Recibos
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate(`/panel/liquidation/${id}/medicos`)}
              >
                ← Liq. Médico
              </Button>
            </div>
          </div>

          {error && <div className={styles.errorBanner}>{error}</div>}

          <Card className={styles.tableCard}>
            {loading ? (
              <div className={styles.loadingState}>Cargando…</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
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
                        <td colSpan={6} className={styles.emptyCell}>
                          No hay recibos. Emití los recibos primero.
                        </td>
                      </tr>
                    )}
                    {rows.map((r, i) => (
                      <tr key={`${r.id}-${i}`}>
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
                            <button
                              className={styles.actionBtn}
                              onClick={() => generatePDF(r)}
                              title="Ver PDF"
                            >
                              PDF
                            </button>
                            {r.estado === "emitido" && (
                              <button
                                className={`${styles.actionBtn} ${styles.anularBtn}`}
                                onClick={() => {
                                  setAnularTarget(r);
                                  setMotivoAnular("");
                                  setAnularError(null);
                                }}
                                title="Anular recibo"
                              >
                                Anular
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Modal emitir recibos */}
      {emitirOpen && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3>Emitir Recibos</h3>
              <button
                className={styles.modalClose}
                onClick={() => { setEmitirOpen(false); setEmitResult(null); setEmitError(null); }}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              {!emitting && !emitResult && !emitError && (
                <p>
                  ¿Seguro que querés emitir los recibos para el período{" "}
                  <strong>{periodTitle}</strong>? Se requiere al menos una liquidación
                  cerrada y la liquidación médica generada.
                </p>
              )}
              {emitting && <p className={styles.muted}>Emitiendo recibos…</p>}
              {emitResult && emitResult.total_recibos > 0 && (
                <p className={styles.successMsg}>
                  ¡Listo! Se emitieron <strong>{emitResult.total_recibos}</strong> recibos.
                </p>
              )}
              {emitResult && emitResult.total_recibos === 0 && (
                <p className={styles.successMsg}>
                  Los recibos ya estaban emitidos. Se cargaron los existentes.
                </p>
              )}
              {emitError && <p className={styles.errorMsg}>{emitError}</p>}
            </div>
            <div className={styles.modalActions}>
              <Button
                variant="secondary"
                onClick={() => { setEmitirOpen(false); setEmitResult(null); setEmitError(null); }}
                disabled={emitting}
              >
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

      {/* Modal anular recibo */}
      {anularTarget && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3>Anular Recibo</h3>
              <button
                className={styles.modalClose}
                onClick={() => { setAnularTarget(null); setAnularError(null); }}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <p>
                Anulando recibo <strong>{anularTarget.nro_recibo}</strong> del médico{" "}
                <strong>{anularTarget.medico_id}</strong>.
              </p>
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
              <Button
                variant="secondary"
                onClick={() => { setAnularTarget(null); setAnularError(null); }}
                disabled={anulando}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={handleAnular}
                disabled={anulando || !motivoAnular.trim()}
              >
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
