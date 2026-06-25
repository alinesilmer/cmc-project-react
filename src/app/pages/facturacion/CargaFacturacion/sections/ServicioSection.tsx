import React from "react";

interface Props {
  fechaPractica: string;
  codClinica: number | null;
  onFechaChange: (v: string) => void;
  onCodClinicaChange: (v: number | null) => void;
  disabled?: boolean;
}

const ServicioSection: React.FC<Props> = ({
  fechaPractica, codClinica, onFechaChange, onCodClinicaChange, disabled,
}) => (
  <section>
    <h3 style={{ fontSize: "0.86rem", fontWeight: 600, color: "#0c2a52", borderTop: "1px solid #e2e8f0", paddingTop: 12, marginBottom: 12 }}>
      Datos de la práctica
    </h3>
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 420 }}>
      <div>
        <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Fecha de práctica</label>
        <input
          type="date"
          value={fechaPractica}
          onChange={(e) => onFechaChange(e.target.value)}
          disabled={disabled}
          style={{ maxWidth: 180 }}
        />
      </div>

      <div>
        <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>
          Clínica (cod)
          <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 6 }}>si se completa → tipo Sanatorio</span>
        </label>
        <input
          type="number"
          min={1}
          value={codClinica ?? ""}
          onChange={(e) => onCodClinicaChange(e.target.value ? Number(e.target.value) : null)}
          disabled={disabled}
          placeholder="— opcional —"
          style={{ maxWidth: 140 }}
        />
      </div>
    </div>
  </section>
);

export default ServicioSection;
