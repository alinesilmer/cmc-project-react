import React, { useState } from "react";
import { getJSON } from "../../../../lib/http";
import Button from "../../../../components/atoms/Button/Button";
import Card from "../../../../components/atoms/Card/Card";
import styles from "./tabs.module.scss";
import { type Pago, fmt } from "../../types";

const GEN_URL = (pagoId: number) => `/api/pagos/${pagoId}/pago_medico_actualizado`;

// ── Tipos del response ────────────────────────────────────────────

type InfoMedico = {
  id: number;
  nro_socio: number;
  matricula: number;
  nombre: string;
};

type Resumen = {
  honorarios: number;
  gastos: number;
  bruto: number;
  debitos: number;
  creditos: number;
  reconocido: number;
  deducciones: number;
  neto_a_pagar: number;
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
};

type Detalle = {
  liquidaciones: Record<string, LiquidacionDetalle>;
  deducciones: { total: number; detalle: DeduccionItem[] };
};

type MedicoEntry = {
  info_medico: InfoMedico;
  resumen: Resumen;
  detalle: Detalle;
};

type ApiResponse = Record<string, MedicoEntry>;

// ── Tipos internos ────────────────────────────────────────────────

type MedicoRow = {
  medico_id: number;
  nombre: string;
  nro_socio: number;
  matricula: number;
  honorarios: number;
  gastos: number;
  bruto: number;
  debitos: number;
  creditos: number;
  reconocido: number;
  deducciones: number;
  neto_a_pagar: number;
  detalle: Detalle;
};

type Totales = {
  total_medicos: number;
  total_honorarios: number;
  total_gastos: number;
  total_bruto: number;
  total_debitos: number;
  total_creditos: number;
  total_reconocido: number;
  total_deducciones: number;
  total_neto_a_pagar: number;
};

function transformResponse(data: ApiResponse): { rows: MedicoRow[]; totales: Totales } {
  const rows: MedicoRow[] = Object.values(data).map(({ info_medico, resumen, detalle }) => ({
    medico_id: info_medico.id,
    nombre: info_medico.nombre,
    nro_socio: info_medico.nro_socio,
    matricula: info_medico.matricula,
    honorarios: resumen.honorarios,
    gastos: resumen.gastos,
    bruto: resumen.bruto,
    debitos: resumen.debitos,
    creditos: resumen.creditos,
    reconocido: resumen.reconocido,
    deducciones: resumen.deducciones,
    neto_a_pagar: resumen.neto_a_pagar,
    detalle,
  }));

  const sum = (key: keyof Omit<MedicoRow, "medico_id" | "nombre" | "nro_socio" | "matricula" | "detalle">) =>
    rows.reduce((acc, r) => acc + (r[key] as number), 0);

  const totales: Totales = {
    total_medicos: rows.length,
    total_honorarios: sum("honorarios"),
    total_gastos: sum("gastos"),
    total_bruto: sum("bruto"),
    total_debitos: sum("debitos"),
    total_creditos: sum("creditos"),
    total_reconocido: sum("reconocido"),
    total_deducciones: sum("deducciones"),
    total_neto_a_pagar: sum("neto_a_pagar"),
  };

  return { rows, totales };
}

// ── Icono chevron ─────────────────────────────────────────────────

const ChevronIcon: React.FC<{ open: boolean }> = ({ open }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    style={{
      transition: "transform 0.2s",
      transform: open ? "rotate(180deg)" : "rotate(0deg)",
      flexShrink: 0,
    }}
  >
    <path
      d="M4 6l4 4 4-4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ── Panel de detalle ──────────────────────────────────────────────

const DetallePanel: React.FC<{ detalle: Detalle }> = ({ detalle }) => {
  const liquidaciones = Object.entries(detalle.liquidaciones);
  const deducciones = detalle.deducciones.detalle;

  return (
    <div style={{ padding: "12px 16px", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>

      {/* Liquidaciones */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
          Liquidaciones
        </div>
        {liquidaciones.length === 0 ? (
          <span style={{ fontSize: 12, color: "#94a3b8" }}>Sin liquidaciones.</span>
        ) : (
          <table className={styles.table} style={{ fontSize: 12 }}>
            <thead>
              <tr>
                <th>Obra Social</th>
                <th>Período</th>
                <th className={styles.numCell}>Honorarios</th>
                <th className={styles.numCell}>Gastos</th>
                <th className={styles.numCell}>Bruto</th>
                <th className={styles.numCell}>Débitos</th>
                <th className={styles.numCell}>Créditos</th>
              </tr>
            </thead>
            <tbody>
              {liquidaciones.map(([liqId, liq]) => (
                <React.Fragment key={liqId}>
                  <tr>
                    <td style={{ fontWeight: 500 }}>{liq.obra_social}</td>
                    <td>{liq.periodo}</td>
                    <td className={styles.numCell}>${fmt(liq.total_honorarios)}</td>
                    <td className={styles.numCell}>${fmt(liq.total_gastos)}</td>
                    <td className={styles.numCell}>${fmt(liq.total_bruto)}</td>
                    <td className={`${styles.numCell} ${styles.negative}`}>-${fmt(liq.debitos.total)}</td>
                    <td className={`${styles.numCell} ${styles.positive}`}>+${fmt(liq.creditos.total)}</td>
                  </tr>
                  {liq.debitos.detalle.map((aj, i) => (
                    <tr key={`deb-${i}`} style={{ background: "#fff1f2" }}>
                      <td colSpan={4} style={{ paddingLeft: 24, fontSize: 11, color: "#64748b" }}>
                        ↳ Débito · Lote #{aj.lote_id}{aj.observacion ? ` — ${aj.observacion}` : ""}
                      </td>
                      <td className={styles.numCell} style={{ fontSize: 11 }}>${fmt(aj.honorarios + aj.gastos)}</td>
                      <td className={`${styles.numCell} ${styles.negative}`} style={{ fontSize: 11 }}>-${fmt(aj.total)}</td>
                      <td />
                    </tr>
                  ))}
                  {liq.creditos.detalle.map((aj, i) => (
                    <tr key={`crd-${i}`} style={{ background: "#f0fdf4" }}>
                      <td colSpan={4} style={{ paddingLeft: 24, fontSize: 11, color: "#64748b" }}>
                        ↳ Crédito · Lote #{aj.lote_id}{aj.observacion ? ` — ${aj.observacion}` : ""}
                      </td>
                      <td className={styles.numCell} style={{ fontSize: 11 }}>${fmt(aj.honorarios + aj.gastos)}</td>
                      <td />
                      <td className={`${styles.numCell} ${styles.positive}`} style={{ fontSize: 11 }}>+${fmt(aj.total)}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Deducciones */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
          Deducciones
        </div>
        {deducciones.length === 0 ? (
          <span style={{ fontSize: 12, color: "#94a3b8" }}>Sin deducciones.</span>
        ) : (
          <table className={styles.table} style={{ fontSize: 12, maxWidth: 520 }}>
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Período</th>
                <th className={styles.numCell}>Total</th>
              </tr>
            </thead>
            <tbody>
              {deducciones.map((d, i) => (
                <tr key={i}>
                  <td>{d.nombre_deduccion}</td>
                  <td>{d.periodo_a_aplicar}</td>
                  <td className={`${styles.numCell} ${styles.negative}`}>-${fmt(d.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={styles.totalsRow}>
                <td colSpan={2}>TOTAL</td>
                <td className={`${styles.numCell} ${styles.negative}`}>-${fmt(detalle.deducciones.total)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────────

type Props = { pago: Pago; pagoId: number };

const TabVistaPreviaPago: React.FC<Props> = ({ pagoId }) => {
  const [rows, setRows] = useState<MedicoRow[]>([]);
  const [totales, setTotales] = useState<Totales | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<{ total_medicos: number } | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  const toggleRow = (id: number) =>
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleGenerar = async () => {
    setGenerating(true);
    setGenError(null);
    try {
      const data = await getJSON<ApiResponse>(GEN_URL(pagoId));
      const { rows: newRows, totales: newTotales } = transformResponse(data);
      setRows(newRows);
      setTotales(newTotales);
      setExpandedRows(new Set());
      setGenResult({ total_medicos: newTotales.total_medicos });
    } catch (e: any) {
      setGenError(e?.message || "Error al generar.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className={styles.tabWrap}>
      <div className={styles.toolbar}>
        <span style={{ fontSize: 13, color: "#64748b" }}>
          {totales ? `${totales.total_medicos} médicos` : "—"}
        </span>
        <div className={styles.toolbarLeft}>
          <Button
            variant="primary"
            onClick={() => {
              setGenResult(null);
              setGenError(null);
              setConfirmOpen(true);
            }}
          >
            Generar / Actualizar
          </Button>
        </div>
      </div>

      {rows.length > 0 && (
        <Card className={styles.tableCard}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: 32 }} />
                  <th>Médico</th>
                  <th className={styles.numCell}>Honorarios</th>
                  <th className={styles.numCell}>Gastos</th>
                  <th className={styles.numCell}>Bruto</th>
                  <th className={styles.numCell}>Débitos</th>
                  <th className={styles.numCell}>Créditos</th>
                  <th className={styles.numCell}>Reconocido</th>
                  <th className={styles.numCell}>Deducciones</th>
                  <th className={styles.numCell}>Neto a Pagar</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isOpen = expandedRows.has(r.medico_id);
                  return (
                    <React.Fragment key={r.medico_id}>
                      <tr
                        style={{ cursor: "pointer" }}
                        onClick={() => toggleRow(r.medico_id)}
                      >
                        <td style={{ textAlign: "center", color: "#64748b" }}>
                          <ChevronIcon open={isOpen} />
                        </td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{r.nombre}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>
                            Socio #{r.nro_socio} · Mat. {r.matricula}
                          </div>
                        </td>
                        <td className={styles.numCell}>${fmt(r.honorarios)}</td>
                        <td className={styles.numCell}>${fmt(r.gastos)}</td>
                        <td className={styles.numCell}>${fmt(r.bruto)}</td>
                        <td className={`${styles.numCell} ${styles.negative}`}>
                          -${fmt(r.debitos)}
                        </td>
                        <td className={`${styles.numCell} ${styles.positive}`}>
                          +${fmt(r.creditos)}
                        </td>
                        <td className={styles.numCell}>${fmt(r.reconocido)}</td>
                        <td className={`${styles.numCell} ${styles.negative}`}>
                          -${fmt(r.deducciones)}
                        </td>
                        <td className={styles.numCell} style={{ fontWeight: 700 }}>
                          ${fmt(r.neto_a_pagar)}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={10} style={{ padding: 0, border: "none" }}>
                            <DetallePanel detalle={r.detalle} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
              {totales && (
                <tfoot>
                  <tr className={styles.totalsRow}>
                    <td />
                    <td>TOTAL ({totales.total_medicos} médicos)</td>
                    <td className={styles.numCell}>${fmt(totales.total_honorarios)}</td>
                    <td className={styles.numCell}>${fmt(totales.total_gastos)}</td>
                    <td className={styles.numCell}>${fmt(totales.total_bruto)}</td>
                    <td className={styles.numCell}>-${fmt(totales.total_debitos)}</td>
                    <td className={styles.numCell}>+${fmt(totales.total_creditos)}</td>
                    <td className={styles.numCell}>${fmt(totales.total_reconocido)}</td>
                    <td className={styles.numCell}>-${fmt(totales.total_deducciones)}</td>
                    <td className={styles.numCell}>${fmt(totales.total_neto_a_pagar)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      )}

      {/* Modal generar */}
      {confirmOpen && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3>Generar Liquidación por Médico</h3>
              <button
                className={styles.modalClose}
                onClick={() => {
                  setConfirmOpen(false);
                  setGenResult(null);
                  setGenError(null);
                }}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              {genError && <div className={styles.errorInline}>{genError}</div>}
              {genResult && (
                <div className={styles.successInline}>
                  Listo. Se procesaron <strong>{genResult.total_medicos}</strong> médicos.
                </div>
              )}
              {!generating && !genResult && !genError && (
                <p>
                  ¿Generar (o actualizar) la liquidación por médico para este pago?
                  <br />
                  <span style={{ fontSize: 12, color: "#64748b" }}>
                    Esta operación es idempotente — se puede ejecutar múltiples veces.
                  </span>
                </p>
              )}
              {generating && (
                <p style={{ color: "#64748b" }}>Generando… por favor esperá.</p>
              )}
            </div>
            <div className={styles.modalActions}>
              <Button
                variant="secondary"
                onClick={() => {
                  setConfirmOpen(false);
                  setGenResult(null);
                  setGenError(null);
                }}
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

export default TabVistaPreviaPago;
