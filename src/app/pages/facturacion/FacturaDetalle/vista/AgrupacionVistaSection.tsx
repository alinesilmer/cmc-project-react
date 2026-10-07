import type { AgrupacionVista } from "./types";
import { OPCIONES_AGRUPACION_VISTA } from "./types";
import s from "../export/export.module.scss";

interface Props {
  agrupacion: AgrupacionVista;
  onChangeAgrupacion: (agrupacion: AgrupacionVista) => void;
}

export default function AgrupacionVistaSection({ agrupacion, onChangeAgrupacion }: Props) {
  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <h3 className={s.sectionTitle}>Agrupar</h3>
      </div>
      <div className={s.radioGroup}>
        {OPCIONES_AGRUPACION_VISTA.map((o) => (
          <label key={o.value} className={`${s.radioOption} ${agrupacion === o.value ? s.radioOptionOn : ""}`}>
            <input
              type="radio"
              name="agrupacion-vista"
              value={o.value}
              checked={agrupacion === o.value}
              onChange={() => onChangeAgrupacion(o.value)}
            />
            <span>
              <span className={s.radioLabel}>{o.label}</span>
              <span className={s.radioAyuda}>{o.ayuda}</span>
            </span>
          </label>
        ))}
      </div>

      <p className={s.sectionHint}>
        El ayudante, los gastos y el pediatra de una cirugía van siempre junto al médico de cabecera,
        indentados debajo y sumados en su subtotal; los filtros y el orden se aplican al médico de cabecera.
      </p>
    </div>
  );
}
