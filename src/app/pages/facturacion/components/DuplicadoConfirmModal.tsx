import React from "react";
import Modal from "../../../components/atoms/Modal/Modal";
import Button from "../../../components/atoms/Button/Button";

interface Props {
  isOpen: boolean;
  mensaje: string;
  duplicadoId?: number;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

const DuplicadoConfirmModal: React.FC<Props> = ({ isOpen, mensaje, onClose, onConfirm, loading }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Prestación duplicada" size="small">
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 13, color: "#334155", margin: 0 }}>{mensaje}</p>
      <p style={{ fontSize: 13, color: "#334155", margin: 0 }}>¿Guardar de todos modos?</p>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button variant="primary" onClick={onConfirm} disabled={loading} isLoading={loading}>
          Sí, guardar
        </Button>
      </div>
    </div>
  </Modal>
);

export default DuplicadoConfirmModal;
