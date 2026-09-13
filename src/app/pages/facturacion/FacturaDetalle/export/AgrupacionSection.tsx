import type { AgrupacionExport } from "./types";
import { OPCIONES_AGRUPACION } from "./types";
import s from "./export.module.scss";

interface Props {
  agrupacion: AgrupacionExport;
  onChange: (agrupacion: AgrupacionExport) => void;
}

export default function AgrupacionSection({ agrupacion, onChange }: Props) {
  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <h3 className={s.sectionTitle}>Agrupar</h3>
      </div>
      <div className={s.radioGroup}>
        {OPCIONES_AGRUPACION.map((o) => (
          <label key={o.value} className={`${s.radioOption} ${agrupacion === o.value ? s.radioOptionOn : ""}`}>
            <input
              type="radio"
              name="agrupacion"
              value={o.value}
              checked={agrupacion === o.value}
              onChange={() => onChange(o.value)}
            />
            <span>
              <span className={s.radioLabel}>{o.label}</span>
              <span className={s.radioAyuda}>{o.ayuda}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
