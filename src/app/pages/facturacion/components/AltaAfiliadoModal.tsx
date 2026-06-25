import React, { useState } from "react";
import Modal from "../../../components/atoms/Modal/Modal";
import Button from "../../../components/atoms/Button/Button";
import { crearAfiliado } from "../api";
import type { AfiliadoRead } from "../types";

interface Props {
  isOpen: boolean;
  dni: string;
  onClose: () => void;
  onCreated: (afiliado: AfiliadoRead) => void;
}

const AltaAfiliadoModal: React.FC<Props> = ({ isOpen, dni, onClose, onCreated }) => {
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!nombre.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const afiliado = await crearAfiliado({ dni, nombre: nombre.trim() });
      onCreated(afiliado);
      setNombre("");
      onClose();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "No se pudo dar de alta el afiliado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Dar de alta afiliado" size="small">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>DNI</label>
          <input value={dni} disabled style={{ width: "100%" }} />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Nombre *</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value.toUpperCase())}
            placeholder="APELLIDO NOMBRE"
            disabled={loading}
            style={{ width: "100%" }}
            autoFocus
          />
          <p style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
            Sin alta, la carga fallará con error 422.
          </p>
        </div>
        {error && <span style={{ fontSize: 12, color: "#cc2a2a" }}>{error}</span>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!nombre.trim() || loading} isLoading={loading}>
            Dar de alta
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AltaAfiliadoModal;
