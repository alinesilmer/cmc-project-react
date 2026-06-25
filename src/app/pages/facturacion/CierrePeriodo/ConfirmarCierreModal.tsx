import React from "react";
import Modal from "../../../components/atoms/Modal/Modal";
import Button from "../../../components/atoms/Button/Button";
import type { CierrePreviewResponse } from "../types";
import { formatMoney } from "../money";

interface Props {
  isOpen: boolean;
  preview: CierrePreviewResponse;
  osNombre: string;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

const ConfirmarCierreModal: React.FC<Props> = ({ isOpen, preview, osNombre, onClose, onConfirm, loading }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Confirmar cierre de período" size="small">
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 13, color: "#334155", margin: 0 }}>
        Vas a cerrar <strong>{osNombre}</strong> · período {preview.periodo}.
      </p>
      <ul style={{ fontSize: 13, color: "#334155", margin: 0, paddingLeft: 20 }}>
        <li>{preview.cantidad} prestaciones</li>
        <li>{formatMoney(preview.importe_total)}</li>
      </ul>
      <div style={{ background: "#fffbeb", border: "1px solid #f59e0b", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: "#92400e" }}>
        ⚠ Esta acción <strong>NO se puede deshacer</strong> y habilita la liquidación.
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button variant="danger" onClick={onConfirm} disabled={loading} isLoading={loading}>
          Sí, cerrar período
        </Button>
      </div>
    </div>
  </Modal>
);

export default ConfirmarCierreModal;
