import React from "react";
import MedicoAutocomplete from "../../components/MedicoAutocomplete";
import type { MedicoOption, PrecioResponse, TipoCalculo } from "../../types";
import { formatMoney, parseMoney } from "../../money";

export interface AyudanteEquipoState {
  activo: boolean;
  codMedico: string | null;
  medico: MedicoOption | null;
  porcentaje: number;
  tipoCalculo: TipoCalculo;
  precioManual: string;
}

export const DEFAULT_AYUDANTE_EQUIPO: AyudanteEquipoState = {
  activo: false,
  codMedico: null,
  medico: null,
  porcentaje: 30,
  tipoCalculo: "A",
  precioManual: "0",
};

interface Props {
  precio: PrecioResponse;
  ayudante: AyudanteEquipoState;
  onChange: (a: AyudanteEquipoState) => void;
  codMedicoMain: string | null;
  disabled?: boolean;
  error?: string | null;
}

const AyudanteSection: React.FC<Props> = ({
  precio, ayudante, onChange, codMedicoMain, disabled, error,
}) => {
  const set = (patch: Partial<AyudanteEquipoState>) => onChange({ ...ayudante, ...patch });
  const isDuplicate = !!(codMedicoMain && ayudante.codMedico === codMedicoMain);
  const ayAmount = ayudante.tipoCalculo === "A"
    ? parseMoney(precio.ayudante)
    : parseMoney(ayudante.precioManual);
  const ayTotal = ayAmount * (ayudante.porcentaje / 100);

  if (!ayudante.activo) {
    return (
      <button
        type="button"
        onClick={() => onChange({ ...DEFAULT_AYUDANTE_EQUIPO, activo: true, precioManual: precio.ayudante })}
        disabled={disabled}
        style={{
          fontSize: 13, color: "#0c2a52", background: "none",
          border: "1px dashed #cbd5e1", borderRadius: 8, padding: "10px 16px",
          cursor: "pointer", width: "100%", textAlign: "left",
          display: "flex", alignItems: "center", gap: 8,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <span style={{ fontSize: 16 }}>+</span>
        <span>Agregar ayudante</span>
        <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 4 }}>
          (valor automático: {formatMoney(precio.ayudante)})
        </span>
      </button>
    );
  }

  return (
    <section style={{ border: "1px solid #bfdbfe", borderRadius: 8, padding: 16, background: "#f0f7ff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h3 style={{ fontSize: "0.86rem", fontWeight: 600, color: "#0c2a52", margin: 0 }}>
          Ayudante quirúrgico
        </h3>
        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_AYUDANTE_EQUIPO })}
          disabled={disabled}
          style={{ fontSize: 12, color: "#cc2a2a", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}
        >
          ✕ Quitar
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 420 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Médico ayudante *</label>
          <MedicoAutocomplete
            value={ayudante.codMedico}
            onChange={(cod, med) => set({ codMedico: cod, medico: med })}
            disabled={disabled}
          />
          {isDuplicate && (
            <span style={{ fontSize: 12, color: "#cc2a2a", display: "block", marginTop: 3 }}>
              El ayudante no puede ser el mismo médico principal.
            </span>
          )}
          {error && !isDuplicate && (
            <span style={{ fontSize: 12, color: "#cc2a2a", display: "block", marginTop: 3 }}>{error}</span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Porcentaje (%)</label>
            <input
              type="number" min={1} max={100}
              value={ayudante.porcentaje}
              onChange={(e) => set({ porcentaje: Math.min(100, Math.max(1, Number(e.target.value))) })}
              disabled={disabled}
              style={{ width: 70 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4 }}>Valor automático del código</label>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#0c2a52" }}>{formatMoney(precio.ayudante)}</span>
          </div>
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>Tipo de cálculo</label>
          <div style={{ display: "flex", gap: 20 }}>
            {([["A", "Automático"], ["M", "Manual"]] as const).map(([v, label]) => (
              <label key={v} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="ayudanteTipoCalculo"
                  value={v}
                  checked={ayudante.tipoCalculo === v}
                  onChange={() => set({ tipoCalculo: v })}
                  disabled={disabled}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {ayudante.tipoCalculo === "M" && (
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Precio del ayudante</label>
            <input
              type="number" min={0} step="0.01"
              value={ayudante.precioManual}
              onChange={(e) => set({ precioManual: e.target.value })}
              disabled={disabled}
              style={{ width: 150 }}
            />
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#dbeafe", borderRadius: 6 }}>
          <span style={{ fontSize: 12, color: "#1e40af" }}>Total ayudante estimado:</span>
          <strong style={{ fontSize: 13, color: "#1e3a8a" }}>{formatMoney(ayTotal)}</strong>
        </div>
      </div>
    </section>
  );
};

export default AyudanteSection;
