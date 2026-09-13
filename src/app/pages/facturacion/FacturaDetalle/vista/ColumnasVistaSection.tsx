import type { ColumnaVista } from "./types";
import { COLUMNAS_VISTA_DISPONIBLES } from "./types";
import s from "../export/export.module.scss";

interface Props {
  columnas: ColumnaVista[];
  onChange: (columnas: ColumnaVista[]) => void;
}

export default function ColumnasVistaSection({ columnas, onChange }: Props) {
  const toggle = (key: ColumnaVista) => {
    onChange(
      columnas.includes(key) ? columnas.filter((c) => c !== key) : [...columnas, key],
    );
  };

  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <h3 className={s.sectionTitle}>Columnas</h3>
        <span className={s.fieldCount}>{columnas.length} de {COLUMNAS_VISTA_DISPONIBLES.length}</span>
      </div>
      <p className={s.sectionHint}>ID, Socio y Acciones siempre se muestran.</p>
      <div className={s.fieldGrid}>
        {COLUMNAS_VISTA_DISPONIBLES.map((c) => {
          const on = columnas.includes(c.key);
          return (
            <label key={c.key} className={`${s.fieldToggle} ${on ? s.fieldToggleOn : ""}`}>
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggle(c.key)}
                className={s.fieldCheckbox}
              />
              <span className={s.fieldLabel}>{c.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
