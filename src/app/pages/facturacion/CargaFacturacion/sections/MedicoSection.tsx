import React from "react";
import MedicoAutocomplete from "../../components/MedicoAutocomplete";
import type { MedicoOption } from "../../types";

interface Props {
  codMedico: string | null;
  onMedicoChange: (cod: string | null, medico: MedicoOption | null) => void;
  disabled?: boolean;
  error?: string | null;
}

const MedicoSection: React.FC<Props> = ({ codMedico, onMedicoChange, disabled, error }) => (
  <section>
    <h3 style={{ fontSize: "0.86rem", fontWeight: 600, color: "#0c2a52", borderTop: "1px solid #e2e8f0", paddingTop: 12, marginBottom: 12 }}>
      Médico / prestador
    </h3>
    <div style={{ maxWidth: 420 }}>
      <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>
        Nº colegio *
      </label>
      <MedicoAutocomplete
        value={codMedico}
        onChange={onMedicoChange}
        disabled={disabled}
      />
      {error && <span style={{ fontSize: 12, color: "#cc2a2a", display: "block", marginTop: 4 }}>{error}</span>}
    </div>
  </section>
);

export default MedicoSection;
