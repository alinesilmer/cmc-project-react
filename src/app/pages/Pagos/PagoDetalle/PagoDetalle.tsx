import React, { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Tooltip from "@mui/material/Tooltip";
import { getJSON, postJSON, putJSON } from "../../../lib/http";
import { useAppSnackbar } from "../../../hooks/useAppSnackbar";
import BackButton from "../../../components/atoms/BackButton/BackButton";
import Button from "../../../components/atoms/Button/Button";
import styles from "./PagoDetalle.module.scss";
import { type Pago, fmt, mesLabel } from "../types";

import TabFacturas from "./tabs/TabFacturas";
import TabDeducciones from "./tabs/TabDeducciones";
import TabResumen from "./tabs/TabResumen";
import TabVistaPreviaPago from "./tabs/TabVistaPreviaPago";
import TabRecibos from "./tabs/TabRecibos";

const PAGO_URL = (id: string | number) => `/api/pagos/${id}`;
const CERRAR_URL = (id: string | number) => `/api/pagos/${id}/cerrar`;
const REABRIR_URL = (id: string | number) => `/api/pagos/${id}/reabrir`;

type Tab = "facturas" | "deducciones" | "preview" | "medico" | "recibos";
const TABS: { key: Tab; label: string }[] = [
  { key: "facturas", label: "Facturas" },
  { key: "deducciones", label: "Deducciones" },
  { key: "preview", label: "Vista Previa" },
  { key: "medico", label: "Por Médico" },
  { key: "recibos", label: "Recibos" },
];

const PagoDetalle: React.FC = () => {
  const { pagoId } = useParams<{ pagoId: string }>();
  const navigate = useNavigate();
  const notify = useAppSnackbar();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = (searchParams.get("tab") as Tab) ?? "facturas";
  const setTab = (tab: Tab) => setSearchParams({ tab });

  const [pago, setPago] = useState<Pago | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cerrar / Reabrir
  const [actionBusy, setActionBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"cerrar" | "reabrir" | null>(null);

  // Editar descripción
  const [editDescOpen, setEditDescOpen] = useState(false);
  const [editDesc, setEditDesc] = useState("");
  const [savingDesc, setSavingDesc] = useState(false);

  const fetchPago = useCallback(async () => {
    if (!pagoId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getJSON<Pago>(PAGO_URL(pagoId));
      setPago(data);
    } catch (e: any) {
      if (e?.response?.status === 404) {
        navigate("/panel/liquidation", { replace: true });
      } else {
        setError(e?.message || "No se pudo cargar el pago.");
      }
    } finally {
      setLoading(false);
    }
  }, [pagoId, navigate]);

  useEffect(() => { fetchPago(); }, [fetchPago]);

  const handleAction = async () => {
    if (!pagoId || !confirmAction) return;
    setActionBusy(true);
    try {
      const url = confirmAction === "cerrar" ? CERRAR_URL(pagoId) : REABRIR_URL(pagoId);
      const updated = await postJSON<Pago>(url);
      setPago(updated);
      notify(confirmAction === "cerrar" ? "Pago cerrado correctamente." : "Pago reabierto correctamente.");
      setConfirmAction(null);
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      if (typeof detail === "object" && detail?.pago_id) {
        notify(`${detail.message ?? "Conflicto"} Ver pago #${detail.pago_id}.`, "error");
      } else {
        notify(typeof detail === "string" ? detail : e?.message ?? "Error al cambiar estado.", "error");
      }
    } finally {
      setActionBusy(false);
    }
  };

  const openEditDesc = () => {
    setEditDesc(pago?.descripcion ?? "");
    setEditDescOpen(true);
  };

  const handleSaveDesc = async () => {
    if (!pagoId) return;
    setSavingDesc(true);
    try {
      const updated = await putJSON<Pago>(PAGO_URL(pagoId), { descripcion: editDesc.trim() || null });
      setPago(updated);
      setEditDescOpen(false);
      notify("Descripción guardada.");
    } catch (e: any) {
      notify(e?.response?.data?.detail ?? e?.message ?? "Error al guardar.", "error");
    } finally {
      setSavingDesc(false);
    }
  };

  const periodTitle = pago ? `${mesLabel(pago.mes)} ${pago.anio}` : "—";

  const renderActionButton = () => {
    if (!pago) return null;
    if (pago.estado === "A") {
      return (
        <Button variant="primary" onClick={() => setConfirmAction("cerrar")} disabled={actionBusy}>
          Cerrar pago
        </Button>
      );
    }
    // Estado C: botón reabrir (si hay recibos, el backend devolverá 409)
    return (
      <Button variant="secondary" onClick={() => setConfirmAction("reabrir")} disabled={actionBusy}>
        Reabrir pago
      </Button>
    );
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.content}>
          <div className={styles.loadingPage}>Cargando pago…</div>
        </div>
      </div>
    );
  }

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
              <div className={styles.breadcrumb}>LIQUIDACIÓN / PAGOS</div>
              <div className={styles.titleRow}>
                <h1 className={styles.title}>Pago — {periodTitle}</h1>
                {pago && (
                  <span className={`${styles.badge} ${pago.estado === "A" ? styles.estadoA : styles.estadoC}`}>
                    {pago.estado === "A" ? "Abierto" : "Cerrado"}
                  </span>
                )}
                {pago?.estado === "A" && (
                  <Tooltip title="Editar descripción" placement="top">
                    <button className={styles.editDescBtn} onClick={openEditDesc} aria-label="Editar descripción">✏️</button>
                  </Tooltip>
                )}
              </div>
              {pago?.descripcion && (
                <span style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{pago.descripcion}</span>
              )}
              {pago && (
                <div className={styles.chips}>
                  <span className={styles.chip}>Bruto: ${fmt(pago.total_bruto)}</span>
                  <span className={`${styles.chip} ${styles.chipRed}`}>Débitos: -${fmt(pago.total_debitos)}</span>
                  <span className={`${styles.chip} ${styles.chipGreen}`}>Créditos: +${fmt(pago.total_creditos)}</span>
                  <span className={`${styles.chip} ${styles.chipRed}`}>Deducciones: -${fmt(pago.total_deduccion)}</span>
                  <span className={styles.chip} style={{ fontWeight: 700 }}>Neto: ${fmt(pago.total_neto)}</span>
                </div>
              )}
            </div>
            <div className={styles.headerActions}>
              {renderActionButton()}
            </div>
          </div>

          {error && <div className={styles.errorBanner}>{error}</div>}

          {/* Tabs */}
          <div className={styles.tabsWrap}>
            <div className={styles.tabs}>
              {TABS.map((t) => (
                <button
                  key={t.key}
                  className={`${styles.tab} ${activeTab === t.key ? styles.tabActive : ""}`}
                  onClick={() => setTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contenido del tab activo */}
          {pago && pagoId && (
            <>
              {activeTab === "facturas" && <TabFacturas pago={pago} pagoId={Number(pagoId)} onPagoChange={setPago} onRefresh={fetchPago} />}
              {activeTab === "deducciones" && <TabDeducciones pago={pago} pagoId={Number(pagoId)} onRefresh={fetchPago} />}
              {activeTab === "preview" && <TabResumen pagoId={Number(pagoId)} />}
              {activeTab === "medico" && <TabVistaPreviaPago pago={pago} pagoId={Number(pagoId)} />}
              {activeTab === "recibos" && <TabRecibos pago={pago} pagoId={Number(pagoId)} />}
            </>
          )}
        </motion.div>
      </div>

      {/* Modal cerrar/reabrir */}
      {confirmAction && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3>{confirmAction === "cerrar" ? "Cerrar Pago" : "Reabrir Pago"}</h3>
              <button className={styles.modalClose} onClick={() => setConfirmAction(null)} aria-label="Cerrar">✕</button>
            </div>
            <div className={styles.modalBody}>
              {!actionBusy && (
                <p>
                  {confirmAction === "cerrar"
                    ? `¿Seguro que querés cerrar el pago de ${periodTitle}?`
                    : `¿Seguro que querés reabrir el pago de ${periodTitle}?`}
                </p>
              )}
              {actionBusy && <p className={styles.muted}>Procesando…</p>}
            </div>
            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={() => setConfirmAction(null)} disabled={actionBusy}>Cancelar</Button>
              <Button variant="primary" onClick={handleAction} disabled={actionBusy}>
                {actionBusy ? "Procesando…" : confirmAction === "cerrar" ? "Sí, cerrar" : "Sí, reabrir"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar descripción */}
      {editDescOpen && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3>Editar Descripción</h3>
              <button className={styles.modalClose} onClick={() => setEditDescOpen(false)} aria-label="Cerrar">✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formRow}>
                <label className={styles.label}>Descripción</label>
                <input
                  className={styles.input}
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  disabled={savingDesc}
                  placeholder="Descripción del pago…"
                />
              </div>
            </div>
            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={() => setEditDescOpen(false)} disabled={savingDesc}>Cancelar</Button>
              <Button variant="primary" onClick={handleSaveDesc} disabled={savingDesc}>
                {savingDesc ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PagoDetalle;
