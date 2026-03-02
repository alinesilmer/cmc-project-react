// app/pages/LiquidacionMedico/LiquidacionMedico.tsx
"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { getJSON, postJSON } from "../../lib/http";
import BackButton from "../../components/atoms/BackButton/BackButton";
import Button from "../../components/atoms/Button/Button";
import Card from "../../components/atoms/Card/Card";
import styles from "./LiquidacionMedico.module.scss";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const RESUMEN_BY_ID = (id: string | number) => `/api/liquidacion/resumen/${id}`;
const LIQ_MEDICO_LIST = (id: string | number) =>
  `/api/liquidacion/resumen/${id}/liquidacion_medico`;
const LIQ_MEDICO_GENERAR = (id: string | number) =>
  `/api/liquidacion/resumen/${id}/generar_liquidacion_medico`;

type MedicoRow = {
  nro_socio: number | string;
  bruto: number;
  debitos: number;
  creditos: number;
  reconocido: number;
  deducciones: number;
  neto_a_pagar: number;
  estado: string;
};

type ResumenBasic = {
  id: number;
  mes: number;
  anio: number;
};

const currency = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0 });
const fmt = (n: number | string | null | undefined) =>
  currency.format(Number(n ?? 0));

function parseMedico(raw: any): MedicoRow {
  return {
    nro_socio: raw.nro_socio ?? raw.medico_id ?? raw.id ?? "—",
    bruto: Number(raw.bruto ?? 0),
    debitos: Number(raw.debitos ?? 0),
    creditos: Number(raw.creditos ?? 0),
    reconocido: Number(raw.reconocido ?? 0),
    deducciones: Number(raw.deducciones ?? 0),
    neto_a_pagar: Number(raw.neto_a_pagar ?? 0),
    estado: String(raw.estado ?? "pendiente"),
  };
}

const LiquidacionMedico: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [resumen, setResumen] = useState<ResumenBasic | null>(null);
  const [rows, setRows] = useState<MedicoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal confirmar generar
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<{ total_medicos: number } | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [resumenData, medicoData] = await Promise.all([
        getJSON<ResumenBasic>(RESUMEN_BY_ID(id)),
        getJSON<any[]>(LIQ_MEDICO_LIST(id)),
      ]);
      setResumen(resumenData);
      setRows((medicoData ?? []).map(parseMedico));
    } catch (e: any) {
      setError(e?.message || "No se pudo cargar la liquidación médica.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerar = async () => {
    if (!id) return;
    setGenerating(true);
    setGenError(null);
    try {
      const result = await postJSON<{ total_medicos: number }>(LIQ_MEDICO_GENERAR(id));
      setGenResult(result);
      await loadData();
    } catch (e: any) {
      setGenError(e?.message || "No se pudo generar la liquidación médica.");
    } finally {
      setGenerating(false);
    }
  };

  const exportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Liquidación Médico");
    ws.columns = [
      { header: "Nro de Socio", key: "nro_socio", width: 14 },
      { header: "Bruto", key: "bruto", width: 14 },
      { header: "Débitos OS", key: "debitos", width: 14 },
      { header: "Créditos OS", key: "creditos", width: 14 },
      { header: "Reconocido", key: "reconocido", width: 14 },
      { header: "Deducciones", key: "deducciones", width: 14 },
      { header: "Neto a Pagar", key: "neto_a_pagar", width: 14 },
      { header: "Estado", key: "estado", width: 12 },
    ] as ExcelJS.Column[];
    rows.forEach((r) => ws.addRow({ ...r }));
    ws.getRow(1).font = { bold: true };
    const buf = await wb.xlsx.writeBuffer();
    saveAs(
      new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `liquidacion_medico_${id}.xlsx`
    );
  };

  const periodTitle = resumen
    ? `${resumen.anio}-${String(resumen.mes).padStart(2, "0")}`
    : "—";

  const totals = rows.reduce(
    (acc, r) => ({
      bruto: acc.bruto + r.bruto,
      debitos: acc.debitos + r.debitos,
      creditos: acc.creditos + r.creditos,
      reconocido: acc.reconocido + r.reconocido,
      deducciones: acc.deducciones + r.deducciones,
      neto_a_pagar: acc.neto_a_pagar + r.neto_a_pagar,
    }),
    { bruto: 0, debitos: 0, creditos: 0, reconocido: 0, deducciones: 0, neto_a_pagar: 0 }
  );

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
              <div className={styles.breadcrumb}>LIQUIDACIÓN MÉDICO</div>
              <h1 className={styles.title}>Período {periodTitle}</h1>
            </div>
            <div className={styles.headerActions}>
              <Button
                variant="primary"
                onClick={() => setConfirmOpen(true)}
                disabled={generating}
              >
                Generar Liquidación Médico
              </Button>
              <Button
                variant="success"
                onClick={exportExcel}
                disabled={rows.length === 0}
              >
                Exportar Excel
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate(`/panel/liquidation/${id}/recibos`)}
              >
                Ver Recibos →
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
                        <th>Nro de Socio</th>
                        <th>Bruto</th>
                        <th>Débitos OS</th>
                        <th>Créditos OS</th>
                        <th>Reconocido</th>
                        <th>Deducciones</th>
                        <th>Neto a Pagar</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 && (
                        <tr>
                          <td colSpan={8} className={styles.emptyCell}>
                            Sin datos. Generá la liquidación médica primero.
                          </td>
                        </tr>
                      )}
                      {rows.map((r, i) => (
                        <tr key={`${r.nro_socio}-${i}`}>
                          <td>{r.nro_socio}</td>
                          <td className={styles.numCell}>${fmt(r.bruto)}</td>
                          <td className={styles.numCell}>-${fmt(r.debitos)}</td>
                          <td className={styles.numCell}>+${fmt(r.creditos)}</td>
                          <td className={styles.numCell}>${fmt(r.reconocido)}</td>
                          <td className={styles.numCell}>-${fmt(r.deducciones)}</td>
                          <td className={`${styles.numCell} ${styles.bold}`}>${fmt(r.neto_a_pagar)}</td>
                          <td>
                            <span className={`${styles.badge} ${styles[`estado_${r.estado}`] ?? styles.badgeDefault}`}>
                              {r.estado}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {rows.length > 0 && (
                      <tfoot>
                        <tr className={styles.totalsRow}>
                          <td><strong>TOTAL</strong></td>
                          <td className={styles.numCell}><strong>${fmt(totals.bruto)}</strong></td>
                          <td className={styles.numCell}><strong>-${fmt(totals.debitos)}</strong></td>
                          <td className={styles.numCell}><strong>+${fmt(totals.creditos)}</strong></td>
                          <td className={styles.numCell}><strong>${fmt(totals.reconocido)}</strong></td>
                          <td className={styles.numCell}><strong>-${fmt(totals.deducciones)}</strong></td>
                          <td className={styles.numCell}><strong>${fmt(totals.neto_a_pagar)}</strong></td>
                          <td />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Modal confirmación generar */}
      {confirmOpen && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3>Generar Liquidación Médico</h3>
              <button
                className={styles.modalClose}
                onClick={() => { setConfirmOpen(false); setGenResult(null); setGenError(null); }}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              {!generating && !genResult && !genError && (
                <p>
                  ¿Seguro que querés generar la liquidación médica para el período{" "}
                  <strong>{periodTitle}</strong>? Esta acción calcula los montos por médico
                  basándose en las liquidaciones cerradas.
                </p>
              )}
              {generating && <p className={styles.muted}>Generando… por favor esperá.</p>}
              {genResult && (
                <p className={styles.successMsg}>
                  ¡Listo! Se generaron <strong>{genResult.total_medicos}</strong> liquidaciones médicas.
                </p>
              )}
              {genError && <p className={styles.errorMsg}>{genError}</p>}
            </div>
            <div className={styles.modalActions}>
              <Button
                variant="secondary"
                onClick={() => { setConfirmOpen(false); setGenResult(null); setGenError(null); }}
                disabled={generating}
              >
                {genResult ? "Cerrar" : "Cancelar"}
              </Button>
              {!genResult && (
                <Button variant="primary" onClick={handleGenerar} disabled={generating}>
                  {generating ? "Generando…" : "Sí, generar"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiquidacionMedico;
