import React, { useState } from "react";
import Modal from "../../../components/atoms/Modal/Modal";
import Button from "../../../components/atoms/Button/Button";
import { moverPeriodo } from "../api";
import { detailMessage } from "../types";
import type { PrestacionRead } from "../types";

interface Props {
  isOpen: boolean;
  seleccionadas: PrestacionRead[];
  onClose: () => void;
  onMoved: (idsMoved: number[], periodoDestino: string) => void;
}

const MoverPeriodoModal: React.FC<Props> = ({ isOpen, seleccionadas, onClose, onMoved }) => {
  const [direccion, setDireccion] = useState<"siguiente" | "anterior">("siguiente");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [faltantes, setFaltantes] = useState<string[]>([]);

  if (!isOpen || seleccionadas.length === 0) return null;

  const codObra = seleccionadas[0].cod_obra_social ?? "";
  const periodoOrigen = seleccionadas[0].periodo;
  const allSameOS = seleccionadas.every((p) => p.cod_obra_social === codObra);
  const allSamePeriodo = seleccionadas.every((p) => p.periodo === periodoOrigen);
  const allAbierto = seleccionadas.every((p) => p.estado === "A");

  const validationError = !allSameOS
    ? "Solo se pueden mover prestaciones de la misma obra social."
    : !allSamePeriodo
    ? "Solo se pueden mover prestaciones del mismo período."
    : !allAbierto
    ? "Solo se pueden mover prestaciones en estado Abierto."
    : null;

  const handleMover = async () => {
    if (validationError) return;
    setLoading(true);
    setError(null);
    setFaltantes([]);
    try {
      const nro_ordenes = seleccionadas.map((p) => p.nro_orden!).filter(Boolean);
      const result = await moverPeriodo({ cod_obra: codObra, periodo_origen: periodoOrigen, nro_ordenes, direccion });
      onMoved(result.ids_movidos, result.periodo_destino);
      onClose();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setError(detailMessage(detail));
      if (typeof detail === "object" && Array.isArray(detail?.faltantes)) {
        setFaltantes(detail.faltantes);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mover de período" size="small">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <p style={{ fontSize: 13, margin: 0 }}>
          {seleccionadas.length} prestación{seleccionadas.length !== 1 ? "es" : ""} seleccionada{seleccionadas.length !== 1 ? "s" : ""}
          {" · "} OS {codObra} · período {periodoOrigen}
        </p>

        {validationError && (
          <div style={{ fontSize: 12, color: "#cc2a2a" }}>{validationError}</div>
        )}

        {!validationError && (
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 8 }}>Dirección</label>
            <div style={{ display: "flex", gap: 16 }}>
              {(["siguiente", "anterior"] as const).map((d) => (
                <label key={d} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                  <input type="radio" checked={direccion === d} onChange={() => setDireccion(d)} />
                  {d === "siguiente" ? "Período siguiente" : "Período anterior"}
                </label>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div style={{ fontSize: 12, color: "#cc2a2a" }}>
            {error}
            {faltantes.length > 0 && (
              <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                {faltantes.map((nro) => <li key={nro}>Orden #{nro}</li>)}
              </ul>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button
            variant="primary"
            onClick={handleMover}
            disabled={!!validationError || loading}
            isLoading={loading}
          >
            Mover
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default MoverPeriodoModal;
