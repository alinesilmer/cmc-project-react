import type { ColumnaExport } from "./types";
import { COLUMNAS_DISPONIBLES } from "./types";
import s from "./export.module.scss";

interface Props {
  columnas: ColumnaExport[];
  onChange: (columnas: ColumnaExport[]) => void;
}

export default function ColumnasSection({ columnas, onChange }: Props) {
  const toggle = (key: ColumnaExport) => {
    onChange(
      columnas.includes(key) ? columnas.filter((c) => c !== key) : [...columnas, key],
    );
  };

  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <h3 className={s.sectionTitle}>Columnas</h3>
        <span className={s.fieldCount}>{columnas.length} de {COLUMNAS_DISPONIBLES.length}</span>
      </div>
      <p className={s.sectionHint}>Socio, subtotal y tipo siempre se incluyen.</p>
      <div className={s.fieldGrid}>
        {COLUMNAS_DISPONIBLES.map((c) => {
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
