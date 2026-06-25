import React, { useEffect, useState } from "react";
import AfiliadoLookup from "../../components/AfiliadoLookup";
import AltaAfiliadoModal from "../../components/AltaAfiliadoModal";
import type { AfiliadoRead } from "../../types";

const MIN_DIGITS = 8;

interface Props {
  dni: string;
  nombrePaciente: string;
  onDniChange: (dni: string) => void;
  onAfiliadoFound: (afiliado: AfiliadoRead) => void;
  disabled?: boolean;
  error?: string | null;
}

const PacienteSection: React.FC<Props> = ({
  dni, nombrePaciente, onDniChange, onAfiliadoFound, disabled, error,
}) => {
  const [showAlta, setShowAlta] = useState(false);
  const [dniNoEncontrado, setDniNoEncontrado] = useState("");

  useEffect(() => {
    if (dni.length < MIN_DIGITS) {
      setDniNoEncontrado("");
      setShowAlta(false);
    }
  }, [dni]);

  const handleNotFound = (d: string) => {
    setDniNoEncontrado(d);
    setShowAlta(true);
  };

  return (
    <section>
      <h3 style={{ fontSize: "0.86rem", fontWeight: 600, color: "#0c2a52", borderTop: "1px solid #e2e8f0", paddingTop: 12, marginBottom: 12 }}>
        Paciente / afiliado <span style={{ fontWeight: 400, color: "#94a3b8" }}>(opcional)</span>
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 420 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>DNI</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AfiliadoLookup
              dni={dni}
              onDniChange={onDniChange}
              onFound={onAfiliadoFound}
              onNotFound={handleNotFound}
              disabled={disabled}
              error={error}
            />
            {dniNoEncontrado && !showAlta && (
              <button
                type="button"
                onClick={() => setShowAlta(true)}
                style={{ fontSize: 12, color: "#0c2a52", textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}
              >
                + Dar de alta
              </button>
            )}
          </div>
        </div>
        {nombrePaciente && (
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Nombre</label>
            <input value={nombrePaciente} disabled style={{ background: "#f1f5f9" }} />
          </div>
        )}
      </div>

      <AltaAfiliadoModal
        isOpen={showAlta}
        dni={dniNoEncontrado}
        onClose={() => setShowAlta(false)}
        onCreated={(afiliado) => {
          setShowAlta(false);
          setDniNoEncontrado("");
          onAfiliadoFound(afiliado);
        }}
      />
    </section>
  );
};

export default PacienteSection;
