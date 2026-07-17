import React from "react";
import Card from "../../../../components/atoms/Card/Card";

interface Props {
  mantener: { paciente: boolean; servicio: boolean; medico: boolean };
  onMantenerChange: (k: "paciente" | "servicio" | "medico", v: boolean) => void;
  /** En complementaria las prestaciones son rezagadas de fechas distintas: no tiene
   *  sentido mantener fecha+clínica, así que el checkbox Servicio no se muestra. */
  showServicio?: boolean;
}

const ETIQUETAS = { servicio: "Servicio", medico: "Médico", paciente: "Paciente" } as const;

const ResumenLateralCard: React.FC<Props> = ({ mantener, onMantenerChange, showServicio = true }) => {
  const campos = (["servicio", "medico", "paciente"] as const).filter(
    (k) => k !== "servicio" || showServicio,
  );

  return (
  // Barra fija arriba del formulario: el título y los checkboxes van en una sola
  // línea, y bajan de renglón solos si no entran.
  <aside>
    <Card>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: 18,
        }}
      >
        <p style={{ fontSize: 12, fontWeight: 600, color: "#1a1f2e", margin: 0 }}>
          Mantener entre cargas
        </p>
        {campos.map((k) => (
          <label
            key={k}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={mantener[k]}
              onChange={(e) => onMantenerChange(k, e.target.checked)}
            />
            {ETIQUETAS[k]}
          </label>
        ))}
      </div>
    </Card>
  </aside>
  );
};

export default ResumenLateralCard;
