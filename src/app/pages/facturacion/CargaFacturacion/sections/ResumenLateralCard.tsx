import React from "react";
import Card from "../../../../components/atoms/Card/Card";

type CampoMantenible = "obraSocial" | "medico" | "paciente" | "fecha" | "clinica" | "autorizacion";

interface Props {
  mantener: Record<CampoMantenible, boolean>;
  onMantenerChange: (k: CampoMantenible, v: boolean) => void;
  /** En complementaria las prestaciones son rezagadas de fechas distintas: no tiene
   *  sentido mantener la fecha, así que ese checkbox no se muestra. */
  showFecha?: boolean;
  /** En complementaria la obra social es fija (viene de la factura), así que su checkbox
   *  no se muestra. */
  showObraSocial?: boolean;
}

const ETIQUETAS: Record<CampoMantenible, string> = {
  obraSocial: "Obra social",
  medico: "Médico",
  paciente: "Paciente",
  fecha: "Fecha",
  clinica: "Clínica",
  autorizacion: "Nro de autorización",
};

const ResumenLateralCard: React.FC<Props> = ({
  mantener, onMantenerChange, showFecha = true, showObraSocial = true,
}) => {
  const campos = (["obraSocial", "medico", "paciente", "fecha", "clinica", "autorizacion"] as const).filter(
    (k) => (k !== "fecha" || showFecha) && (k !== "obraSocial" || showObraSocial),
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
