import React from "react";
import MedicoAutocomplete from "../../components/MedicoAutocomplete";
import type { MedicoOption } from "../../types";
import { parseMoney } from "../../money";

export interface MiembroEquipo {
  cod_medico: string | null;
  medico: MedicoOption | null;
  honorarios: string;
  gastos: string;
  ayudante: string;
  porcentaje: number;
}

export const DEFAULT_MEDICO: MiembroEquipo = {
  cod_medico: null, medico: null,
  honorarios: "0", gastos: "0", ayudante: "0",
  porcentaje: 100,
};

export const DEFAULT_AYUDANTE: MiembroEquipo = {
  cod_medico: null, medico: null,
  honorarios: "0", gastos: "0", ayudante: "0",
  porcentaje: 30,
};

interface Props {
  miembros: MiembroEquipo[];
  precioHonorarios?: string;
  precioAyudante?: string;
  onMiembrosChange: (m: MiembroEquipo[]) => void;
  disabled?: boolean;
}

const EquipoQuirurgicoSection: React.FC<Props> = ({
  miembros, precioHonorarios, precioAyudante, onMiembrosChange, disabled,
}) => {
  const updateMiembro = (idx: number, patch: Partial<MiembroEquipo>) => {
    const next = miembros.map((m, i) => i === idx ? { ...m, ...patch } : m);
    onMiembrosChange(next);
  };

  const addAyudante = () => {
    onMiembrosChange([...miembros, { ...DEFAULT_AYUDANTE, ayudante: precioAyudante ?? "0" }]);
  };

  const removeMiembro = (idx: number) => {
    if (miembros.length <= 1) return;
    onMiembrosChange(miembros.filter((_, i) => i !== idx));
  };

  const codsUsados = miembros.map((m) => m.cod_medico).filter(Boolean) as string[];
  const hasDuplicates = codsUsados.length !== new Set(codsUsados).size;
  const ningunoConMonto = miembros.every(
    (m) => parseMoney(m.honorarios) === 0 && parseMoney(m.gastos) === 0 && parseMoney(m.ayudante) === 0
  );

  return (
    <section>
      <h3 style={{ fontSize: "0.86rem", fontWeight: 600, color: "#0c2a52", borderTop: "1px solid #e2e8f0", paddingTop: 12, marginBottom: 12 }}>
        Equipo quirúrgico
      </h3>
      <p style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
        El concepto facturado por cada miembro es el monto enviado en &gt; 0
        (honorarios = médico principal, ayudante = ayudante, gastos = gastos).
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {miembros.map((m, idx) => (
          <div
            key={idx}
            style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "#94a3b8", minWidth: 28, fontWeight: 600 }}>#{idx + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <MedicoAutocomplete
                  value={m.cod_medico}
                  onChange={(cod, med) => updateMiembro(idx, { cod_medico: cod, medico: med })}
                  disabled={disabled}
                />
              </div>
              {miembros.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeMiembro(idx)}
                  disabled={disabled}
                  style={{ fontSize: 12, color: "#cc2a2a", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}
                >
                  ✕
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div>
                <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 2 }}>Honorarios</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={m.honorarios}
                  onChange={(e) => updateMiembro(idx, { honorarios: e.target.value })}
                  disabled={disabled}
                  style={{ width: 110 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 2 }}>Gastos</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={m.gastos}
                  onChange={(e) => updateMiembro(idx, { gastos: e.target.value })}
                  disabled={disabled}
                  style={{ width: 110 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 2 }}>Ayudante</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={m.ayudante}
                  onChange={(e) => updateMiembro(idx, { ayudante: e.target.value })}
                  disabled={disabled}
                  style={{ width: 110 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 2 }}>%</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={m.porcentaje}
                  onChange={(e) => updateMiembro(idx, { porcentaje: Number(e.target.value) })}
                  disabled={disabled}
                  style={{ width: 60 }}
                />
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addAyudante}
          disabled={disabled}
          style={{
            fontSize: 13, color: "#0c2a52", background: "none",
            border: "1px dashed #cbd5e1", borderRadius: 6, padding: "6px 12px",
            cursor: "pointer", alignSelf: "flex-start",
          }}
        >
          + Agregar miembro
        </button>

        {hasDuplicates && (
          <span style={{ fontSize: 12, color: "#cc2a2a" }}>⚠ Los médicos del equipo no pueden repetirse.</span>
        )}
        {ningunoConMonto && (
          <span style={{ fontSize: 12, color: "#f59e0b" }}>⚠ Al menos un miembro debe tener algún monto &gt; 0.</span>
        )}

        <div style={{ fontSize: 13, color: "#64748b" }}>
          {miembros.length} prestación{miembros.length !== 1 ? "es" : ""} a guardar
        </div>
      </div>
    </section>
  );
};

export default EquipoQuirurgicoSection;
