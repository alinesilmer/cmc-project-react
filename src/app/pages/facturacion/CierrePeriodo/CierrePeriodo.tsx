import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import Button from "../../../components/atoms/Button/Button";
import { useAppSnackbar } from "../../../hooks/useAppSnackbar";
import { previewCierre, cerrarPeriodo, fetchPeriodoActivo } from "../api";
import type { CierrePreviewResponse, ObraSocialOption } from "../types";
import { detailMessage } from "../types";
import { formatMoney } from "../money";
import ObraSocialAutocomplete from "../components/ObraSocialAutocomplete";
import ImporteDisplay from "../components/ImporteDisplay";
import ConfirmarCierreModal from "./ConfirmarCierreModal";
import styles from "./CierrePeriodo.module.scss";

const CierrePeriodo: React.FC = () => {
  const navigate = useNavigate();
  const notify = useAppSnackbar();

  const [obraSocial, setObraSocial] = useState<ObraSocialOption | null>(null);
  const [periodo, setPeriodo] = useState("");
  const [preview, setPreview] = useState<CierrePreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cerrando, setCerrando] = useState(false);

  // Cargar período activo cuando se elige OS
  useEffect(() => {
    if (!obraSocial) return;
    setPreview(null);
    setPreviewError(null);
    (async () => {
      try {
        const p = await fetchPeriodoActivo(String(obraSocial.nro_obra_social));
        setPeriodo(p.periodo);
      } catch {
        setPeriodo("");
      }
    })();
  }, [obraSocial]);

  // Cargar preview cuando hay OS + período
  useEffect(() => {
    if (!obraSocial || !periodo || periodo.length !== 6) {
      setPreview(null);
      return;
    }
    setPreviewLoading(true);
    setPreviewError(null);
    (async () => {
      try {
        const data = await previewCierre(String(obraSocial.nro_obra_social), periodo);
        setPreview(data);
      } catch (e: any) {
        setPreviewError(detailMessage(e?.response?.data?.detail));
        setPreview(null);
      } finally {
        setPreviewLoading(false);
      }
    })();
  }, [obraSocial, periodo]);

  const handleCerrar = async () => {
    if (!obraSocial || !periodo || !preview) return;
    setCerrando(true);
    try {
      const result = await cerrarPeriodo(String(obraSocial.nro_obra_social), periodo);
      notify(`Factura #${result.id_factura} generada — ${formatMoney(result.importe_total)}`);
      setConfirmOpen(false);
      navigate("/panel/facturacion/prestaciones");
    } catch (e: any) {
      notify(detailMessage(e?.response?.data?.detail) || "Error al cerrar.", "error");
    } finally {
      setCerrando(false);
    }
  };

  const canCerrar = !!preview && !preview.cerrado && preview.cantidad > 0 && !cerrando;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Cierre de período</h1>
        <div className={styles.headerActions}>
          <Button variant="ghost" size="sm" onClick={() => navigate("/panel/facturacion")}>
            ← Volver
          </Button>
        </div>
      </header>

      <motion.div
        className={styles.body}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 420 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Obra social</label>
            <ObraSocialAutocomplete
              value={obraSocial?.nro_obra_social ?? null}
              onChange={(_, os) => setObraSocial(os)}
              disabled={cerrando}
            />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Período (YYYYMM)</label>
            <input
              type="text"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              placeholder="Ej. 202606"
              disabled={!obraSocial || cerrando}
              maxLength={6}
              style={{ maxWidth: 160 }}
            />
          </div>
        </div>

        {previewLoading && (
          <p style={{ fontSize: 13, color: "#64748b" }}>Cargando preview…</p>
        )}

        {previewError && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 6, padding: "10px 14px", fontSize: 13, color: "#cc2a2a" }}>
            {previewError}
          </div>
        )}

        {preview && (
          <div className={styles.previewCard}>
            <div className={styles.statRow}>
              <label>Prestaciones a cerrar</label>
              <strong>{preview.cantidad}</strong>
            </div>
            <div className={styles.statRow}>
              <label>Importe total</label>
              <strong><ImporteDisplay value={preview.importe_total} large /></strong>
            </div>
            <div className={styles.statRow}>
              <label>Estado del período</label>
              <strong style={{ color: preview.cerrado ? "#1d9148" : "#92400e" }}>
                {preview.cerrado ? "⚠ Ya cerrado" : "🟢 Abierto"}
              </strong>
            </div>
            {preview.cerrado && (
              <p style={{ fontSize: 12, color: "#475569", margin: 0 }}>
                Este período ya tiene una factura generada. No se puede volver a cerrar.
              </p>
            )}
          </div>
        )}

        <div className={styles.warningBox}>
          ⚠ El cierre es <strong>IRREVERSIBLE</strong>: genera la factura, pasa las prestaciones
          de estado A → C y las habilita para liquidación.
        </div>
      </motion.div>

      <footer className={styles.footer}>
        <Button variant="ghost" onClick={() => navigate("/panel/facturacion")} disabled={cerrando}>
          Cancelar
        </Button>
        <Button
          variant="danger"
          onClick={() => setConfirmOpen(true)}
          disabled={!canCerrar}
          isLoading={cerrando}
        >
          Cerrar período
        </Button>
      </footer>

      {preview && obraSocial && (
        <ConfirmarCierreModal
          isOpen={confirmOpen}
          preview={preview}
          osNombre={obraSocial.nombre}
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleCerrar}
          loading={cerrando}
        />
      )}
    </div>
  );
};

export default CierrePeriodo;
