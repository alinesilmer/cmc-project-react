import React from "react";
import { Check, Pin } from "lucide-react";

import s from "./ResumenLateralCard.module.scss";

type CampoMantenible =
  | "obraSocial" | "medico" | "paciente" | "fecha" | "clinica" | "autorizacion" | "codigo";

interface Props {
  mantener: Record<CampoMantenible, boolean>;
  onMantenerChange: (k: CampoMantenible, v: boolean) => void;
  /** En complementaria las prestaciones son rezagadas de fechas distintas: no tiene sentido mantener la fecha, así que ese checkbox no se muestra. */
  showFecha?: boolean;
  /** En complementaria la obra social es fija (viene de la factura), así que su checkbox no se muestra. */
  showObraSocial?: boolean;
}

const ETIQUETAS: Record<CampoMantenible, string> = {
  obraSocial: "Obra social",
  medico: "Médico",
  paciente: "Paciente",
  fecha: "Fecha",
  clinica: "Clínica",
  autorizacion: "Autorización",
  codigo: "Código",
};

/** Qué datos quedan puestos después de guardar, para cargar varias seguidas sin volver a escribirlos. */
const ResumenLateralCard: React.FC<Props> = ({
  mantener, onMantenerChange, showFecha = true, showObraSocial = true,
}) => {
  const campos = (
    ["obraSocial", "medico", "paciente", "fecha", "clinica", "autorizacion", "codigo"] as const
  ).filter(
    (k) => (k !== "fecha" || showFecha) && (k !== "obraSocial" || showObraSocial),
  );

  return (
    <aside className={s.banda}>
      <p className={s.titulo}>
        <Pin size={18} aria-hidden="true" />
        Mantener
      </p>
      <div className={s.opciones}>
        {campos.map((k) => (
          <label key={k} className={`${s.opcion} ${mantener[k] ? s.puesta : ""}`}>
            <input
              type="checkbox"
              checked={mantener[k]}
              onChange={(e) => onMantenerChange(k, e.target.checked)}
            />
            <span className={s.tilde} aria-hidden="true">
              {mantener[k] && <Check size={13} strokeWidth={3} />}
            </span>
            {ETIQUETAS[k]}
          </label>
        ))}
      </div>
    </aside>
  );
};

export default ResumenLateralCard;
