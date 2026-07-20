import React, { useEffect, useState } from "react";
import Modal from "../../../components/atoms/Modal/Modal";
import Button from "../../../components/atoms/Button/Button";
import { crearComplemento, fetchPeriodoActivo, previewCierre } from "../api";
import type { CierrePreviewResponse, FacturaRead, ObraSocialOption } from "../types";
import { detailMessage } from "../types";
import { formatMoney } from "../money";
import ObraSocialAutocomplete from "../components/ObraSocialAutocomplete";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (factura: FacturaRead) => void;
}

const ERRORES: Record<number, string> = {
  404: "No hay una factura previa para complementar en este período.",
  409: "Ya hay una factura abierta para este período — cargá las prestaciones ahí, no hace falta un complemento.",
};

const NuevaComplementariaModal: React.FC<Props> = ({ isOpen, onClose, onCreated }) => {
  const [obraSocial, setObraSocial] = useState<ObraSocialOption | null>(null);
  const [periodo, setPeriodo] = useState("");
  const [preview, setPreview] = useState<CierrePreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  // Limpiar todo al cerrar, para que la próxima apertura arranque en blanco.
  useEffect(() => {
    if (isOpen) return;
    setObraSocial(null);
    setPeriodo("");
    setPreview(null);
    setError(null);
  }, [isOpen]);

  // Al elegir OS, proponer su período activo.
  useEffect(() => {
    if (!obraSocial) return;
    setPreview(null);
    setError(null);
    (async () => {
      try {
        const p = await fetchPeriodoActivo(String(obraSocial.nro_obra_social));
        setPeriodo(p.periodo);
      } catch {
        setPeriodo("");
      }
    })();
  }, [obraSocial]);

  // Preview del período elegido: define si se puede complementar.
  useEffect(() => {
    if (!obraSocial || periodo.length !== 6) {
      setPreview(null);
      return;
    }
    let cancelado = false;
    setPreviewLoading(true);
    setError(null);
    (async () => {
      try {
        const data = await previewCierre(String(obraSocial.nro_obra_social), periodo);
        if (!cancelado) setPreview(data);
      } catch (e: any) {
        if (!cancelado) {
          setError(detailMessage(e?.response?.data?.detail));
          setPreview(null);
        }
      } finally {
        if (!cancelado) setPreviewLoading(false);
      }
    })();
    return () => { cancelado = true; };
  }, [obraSocial, periodo]);

  const handleCrear = async () => {
    if (!obraSocial || !preview) return;
    setCreando(true);
    setError(null);
    try {
      const factura = await crearComplemento({
        cod_obra: String(obraSocial.nro_obra_social),
        periodo,
      });
      onCreated(factura);
    } catch (e: any) {
      const status = e?.response?.status;
      setError(ERRORES[status] ?? detailMessage(e?.response?.data?.detail) ?? "Error al abrir el complemento.");
    } finally {
      setCreando(false);
    }
  };

  // Sin factura cerrada no hay nada que complementar: hay que seguir cargando en la que está abierta.
  const puedeCrear = !!preview && preview.cerrado && !creando;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nueva factura complementaria" size="small">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <p style={{ fontSize: 13, color: "#334155", margin: 0 }}>
          Abre una factura adicional para un período <strong>ya cerrado</strong>, donde cargar las
          prestaciones que quedaron afuera del envío original.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#718096", letterSpacing: ".05em", textTransform: "uppercase" }}>
            Obra social
          </label>
          <ObraSocialAutocomplete
            value={obraSocial?.nro_obra_social ?? null}
            onChange={(_, os) => setObraSocial(os)}
            disabled={creando}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#718096", letterSpacing: ".05em", textTransform: "uppercase" }}>
            Período (YYYYMM)
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            placeholder="Ej. 202607"
            disabled={!obraSocial || creando}
            style={{
              height: 36, padding: "0 12px", border: "1px solid #e2e8f0",
              borderRadius: 6, fontSize: 13, color: "#1a1f2e", outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {previewLoading && (
          <span style={{ fontSize: 12, color: "#718096" }}>Cargando período…</span>
        )}

        {preview && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 600, borderRadius: 20, padding: "3px 10px", background: "#eef2f7", color: "#475569" }}>
              {preview.cantidad} prestación{preview.cantidad !== 1 ? "es" : ""}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, borderRadius: 20, padding: "3px 10px", background: "#dcfce7", color: "#166534" }}>
              Total: {formatMoney(preview.importe_total)}
            </span>
            <span style={{
              fontSize: 12, fontWeight: 600, borderRadius: 20, padding: "3px 10px",
              background: preview.cerrado ? "#dcfce7" : "#fef3c7",
              color: preview.cerrado ? "#166534" : "#92400e",
            }}>
              {preview.cerrado ? "Cerrado" : "Abierto"}
            </span>
          </div>
        )}

        {preview && !preview.cerrado && (
          <div style={{ background: "#fffbeb", border: "1px solid #f59e0b", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: "#92400e" }}>
            Este período todavía está abierto — cargá las prestaciones ahí. Un complemento solo tiene
            sentido cuando la factura anterior ya se cerró y se envió.
          </div>
        )}

        {error && (
          <div style={{ background: "#fee2e2", border: "1px solid #dc2626", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: "#991b1b" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button variant="ghost" onClick={onClose} disabled={creando}>Cancelar</Button>
          <Button variant="primary" onClick={handleCrear} disabled={!puedeCrear} isLoading={creando}>
            Abrir complemento
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default NuevaComplementariaModal;
