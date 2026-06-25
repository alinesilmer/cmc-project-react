import React from "react";
import Card from "../../../../components/atoms/Card/Card";
import ImporteDisplay from "../../components/ImporteDisplay";
import PrestacionStateChip from "../../components/PrestacionStateChip";
import type { PrestacionRead } from "../../types";

interface Props {
  totalEstimado: number;
  recientes: PrestacionRead[];
  mantener: { paciente: boolean; servicio: boolean; medico: boolean };
  onMantenerChange: (k: "paciente" | "servicio" | "medico", v: boolean) => void;
}

const ResumenLateralCard: React.FC<Props> = ({ totalEstimado, recientes, mantener, onMantenerChange }) => (
  <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <Card>
      <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 4px" }}>Total estimado</p>
      <ImporteDisplay value={totalEstimado} large />
    </Card>

    {recientes.length > 0 && (
      <Card>
        <p style={{ fontSize: 12, fontWeight: 600, color: "#0c2a52", marginBottom: 8 }}>Últimas cargadas</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {recientes.slice(0, 6).map((p) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
              <span style={{ color: "#334155" }}>{p.cod_nomenclador} · {p.cod_medico}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <ImporteDisplay value={p.importe_total} />
                {p.estado && <PrestacionStateChip estado={p.estado} />}
              </div>
            </div>
          ))}
        </div>
      </Card>
    )}

    <Card>
      <p style={{ fontSize: 12, fontWeight: 600, color: "#0c2a52", marginBottom: 8 }}>Mantener entre cargas</p>
      {(["servicio", "medico", "paciente"] as const).map((k) => (
        <label key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", marginBottom: 4 }}>
          <input type="checkbox" checked={mantener[k]} onChange={(e) => onMantenerChange(k, e.target.checked)} />
          {{servicio: "Servicio", medico: "Médico", paciente: "Paciente"}[k]}
        </label>
      ))}
    </Card>
  </aside>
);

export default ResumenLateralCard;
