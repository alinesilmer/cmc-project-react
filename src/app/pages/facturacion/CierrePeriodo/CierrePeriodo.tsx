import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FileCheck2, ArrowLeft, Paperclip } from "lucide-react";

import { useAppSnackbar } from "../../../hooks/useAppSnackbar";
import { previewCierre, cerrarPeriodo, fetchPeriodoActivo } from "../api";
import type { CierrePreviewResponse, ObraSocialOption } from "../types";
import { detailMessage } from "../types";
import { formatMoney } from "../money";
import ObraSocialAutocomplete from "../components/ObraSocialAutocomplete";
import ConfirmarCierreModal from "./ConfirmarCierreModal";
import styles from "./CierrePeriodo.module.scss";

const TIPOS_FACTURA = ["A", "B", "C"];

const CierrePeriodo: React.FC = () => {
  const navigate = useNavigate();
  const notify = useAppSnackbar();

  const [obraSocial, setObraSocial] = useState<ObraSocialOption | null>(null);
  const [periodo, setPeriodo] = useState("");
  const [preview, setPreview] = useState<CierrePreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [tipoFactura, setTipoFactura] = useState("");
  const [nroFactura, setNroFactura] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const result = await cerrarPeriodo({
        cod_obra: String(obraSocial.nro_obra_social),
        periodo,
        tipo_factura: tipoFactura || undefined,
        nro_factura: nroFactura || undefined,
        archivo,
      });
      notify(`Factura #${result.id_factura} generada — ${formatMoney(result.importe_total)}`);
      setConfirmOpen(false);
      navigate("/panel/facturacion/periodos");
    } catch (e: any) {
      notify(detailMessage(e?.response?.data?.detail) || "Error al cerrar.", "error");
    } finally {
      setCerrando(false);
    }
  };

  const canCerrar = !!preview && !preview.cerrado && preview.cantidad > 0 && !cerrando;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerIcon}>
          <FileCheck2 size={22} />
        </span>
        <div>
          <h1 className={styles.title}>Cerrar factura</h1>
          <p className={styles.subtitle}>Cierre de período — genera la factura y habilita la liquidación.</p>
        </div>
        <div className={styles.headerRight}>
          <button type="button" className={styles.backBtn} onClick={() => navigate("/panel/facturacion/periodos")}>
            <ArrowLeft size={15} /> Volver
          </button>
        </div>
      </div>

      <motion.div
        className={styles.layout}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className={styles.section}>
          <span className={styles.sectionTitle}>Obra social y período</span>
          <div className={styles.fieldsRow}>
            <div className={styles.filterField}>
              <label className={styles.filterLabel}>Obra social</label>
              <ObraSocialAutocomplete
                value={obraSocial?.nro_obra_social ?? null}
                onChange={(_, os) => setObraSocial(os)}
                disabled={cerrando}
              />
            </div>
            <div className={styles.filterField}>
              <label className={styles.filterLabel}>Período (YYYYMM)</label>
              <input
                className={styles.input}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                placeholder="Ej. 202607"
                disabled={!obraSocial || cerrando}
              />
            </div>
          </div>

          {previewLoading && <span className={styles.mutedText}>Cargando preview…</span>}
          {previewError && <div className={styles.errorBox}>{previewError}</div>}

          {preview && (
            <div className={styles.previewRow}>
              <span className={`${styles.infoChip} ${styles.chipNeutral}`}>
                {preview.cantidad} prestación{preview.cantidad !== 1 ? "es" : ""}
              </span>
              <span className={`${styles.infoChip} ${styles.chipTotal}`}>
                Total: {formatMoney(preview.importe_total)}
              </span>
              <span className={`${styles.infoChip} ${preview.cerrado ? styles.chipCerrada : styles.chipAbierta}`}>
                {preview.cerrado ? "Ya cerrado" : "Abierto"}
              </span>
            </div>
          )}

          {preview?.cerrado && (
            <p className={styles.mutedText}>
              Este período ya tiene una factura generada. No se puede volver a cerrar.
            </p>
          )}
        </div>

        <div className={styles.section}>
          <span className={styles.sectionTitle}>Datos de la factura</span>
          <div className={styles.fieldsRow}>
            <div className={styles.filterField}>
              <label className={styles.filterLabel}>Tipo de factura</label>
              <select
                className={styles.select}
                value={tipoFactura}
                onChange={(e) => setTipoFactura(e.target.value)}
                disabled={cerrando}
              >
                <option value="">— sin especificar —</option>
                {TIPOS_FACTURA.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className={styles.filterField}>
              <label className={styles.filterLabel}>Nº de factura</label>
              <input
                className={styles.input}
                type="text"
                value={nroFactura}
                onChange={(e) => setNroFactura(e.target.value)}
                placeholder="Ej. 0001-00012345"
                disabled={cerrando}
              />
            </div>
            <div className={styles.filterField}>
              <label className={styles.filterLabel}>Agregar factura (documento)</label>
              <label className={styles.fileField}>
                <Paperclip size={15} />
                <span className={styles.fileName}>{archivo ? archivo.name : "Adjuntar PDF / imagen — opcional"}</span>
                <input
                  ref={fileInputRef}
                  className={styles.fileInput}
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                  disabled={cerrando}
                />
              </label>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.warningBox}>
            ⚠ El cierre es <strong>IRREVERSIBLE</strong>: genera la factura, pasa las prestaciones
            de estado A → C y las habilita para liquidación.
          </div>
        </div>

        <div className={styles.formFooter}>
          <button type="button" className={styles.btnGhost} onClick={() => navigate("/panel/facturacion/periodos")} disabled={cerrando}>
            Cancelar
          </button>
          <button
            type="button"
            className={styles.btnDanger}
            onClick={() => setConfirmOpen(true)}
            disabled={!canCerrar}
          >
            {cerrando ? "Cerrando…" : "Cerrar período"}
          </button>
        </div>
      </motion.div>

      {preview && obraSocial && (
        <ConfirmarCierreModal
          isOpen={confirmOpen}
          preview={preview}
          osNombre={obraSocial.nombre}
          tipoFactura={tipoFactura}
          nroFactura={nroFactura}
          archivoNombre={archivo?.name ?? null}
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleCerrar}
          loading={cerrando}
        />
      )}
    </div>
  );
};

export default CierrePeriodo;
