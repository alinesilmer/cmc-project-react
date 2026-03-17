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
const LIQ_MEDICO_LIST = (id: string | number, skip: number, limit: number) =>
  `/api/liquidacion/resumen/${id}/liquidacion_medico?skip=${skip}&limit=${limit}`;
const LIQ_MEDICO_GENERAR = (id: string | number) =>
  `/api/liquidacion/resumen/${id}/generar_liquidacion_medico`;

const PAGE_SIZE = 50;

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

type ApiTotales = {
  total_medicos: number;
  total_bruto: string;
  total_debitos: string;
  total_creditos: string;
  total_reconocido: string;
  total_deducciones: string;
  total_neto_a_pagar: string;
};

type MedicoListResponse = {
  totales: ApiTotales;
  items: any[];
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
    nro_socio: raw.medico_id ?? raw.nro_socio ?? raw.id ?? "—",
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
  const [apiTotales, setApiTotales] = useState<ApiTotales | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Paginación
  const [page, setPage] = useState(1);
  const totalMedicos = apiTotales?.total_medicos ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalMedicos / PAGE_SIZE));

  // Modal confirmar generar
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<{ total_medicos: number } | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  const loadData = useCallback(async (currentPage: number) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const skip = (currentPage - 1) * PAGE_SIZE;
    try {
      const [resumenData, medicoData] = await Promise.all([
        getJSON<ResumenBasic>(RESUMEN_BY_ID(id)),
        getJSON<MedicoListResponse>(LIQ_MEDICO_LIST(id, skip, PAGE_SIZE)),
      ]);
      setResumen(resumenData);
      setApiTotales(medicoData.totales);
      setRows((medicoData.items ?? []).map(parseMedico));
    } catch (e: any) {
      setError(e?.message || "No se pudo cargar la liquidación médica.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData(page);
  }, [loadData, page]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  };

  const handleGenerar = async () => {
    if (!id) return;
    setGenerating(true);
    setGenError(null);
    try {
      const result = await postJSON<{ total_medicos: number }>(LIQ_MEDICO_GENERAR(id));
      setGenResult(result);
      setPage(1);
      await loadData(1);
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
                    {apiTotales && rows.length > 0 && (
                      <tfoot>
                        <tr className={styles.totalsRow}>
                          <td><strong>TOTAL ({apiTotales.total_medicos} médicos)</strong></td>
                          <td className={styles.numCell}><strong>${fmt(apiTotales.total_bruto)}</strong></td>
                          <td className={styles.numCell}><strong>-${fmt(apiTotales.total_debitos)}</strong></td>
                          <td className={styles.numCell}><strong>+${fmt(apiTotales.total_creditos)}</strong></td>
                          <td className={styles.numCell}><strong>${fmt(apiTotales.total_reconocido)}</strong></td>
                          <td className={styles.numCell}><strong>-${fmt(apiTotales.total_deducciones)}</strong></td>
                          <td className={styles.numCell}><strong>${fmt(apiTotales.total_neto_a_pagar)}</strong></td>
                          <td />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className={styles.pagination}>
                    <span className={styles.paginationInfo}>
                      Página {page} de {totalPages} — {totalMedicos} médicos
                    </span>
                    <div className={styles.paginationControls}>
                      <button
                        className={styles.pageBtn}
                        onClick={() => handlePageChange(1)}
                        disabled={page === 1}
                      >
                        «
                      </button>
                      <button
                        className={styles.pageBtn}
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1}
                      >
                        ‹
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                        const p = start + i;
                        return (
                          <button
                            key={p}
                            className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ""}`}
                            onClick={() => handlePageChange(p)}
                          >
                            {p}
                          </button>
                        );
                      })}
                      <button
                        className={styles.pageBtn}
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page === totalPages}
                      >
                        ›
                      </button>
                      <button
                        className={styles.pageBtn}
                        onClick={() => handlePageChange(totalPages)}
                        disabled={page === totalPages}
                      >
                        »
                      </button>
                    </div>
                  </div>
                )}
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
