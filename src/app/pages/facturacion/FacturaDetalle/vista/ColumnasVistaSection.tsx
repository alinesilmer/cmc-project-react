import type { ColumnaVista } from "./types";
import { COLUMNAS_SOLO_CON_DOCUMENTACION, COLUMNAS_VISTA_DISPONIBLES } from "./types";
import s from "../export/export.module.scss";

interface Props {
  columnas: ColumnaVista[];
  onChange: (columnas: ColumnaVista[]) => void;
  /** La obra social tiene la documentación digital: recién ahí se ofrece la columna «Documentos». */
  conDocumentacion?: boolean;
}

export default function ColumnasVistaSection({ columnas, onChange, conDocumentacion = false }: Props) {
  const disponibles = COLUMNAS_VISTA_DISPONIBLES.filter(
    (c) => conDocumentacion || !COLUMNAS_SOLO_CON_DOCUMENTACION.includes(c.key),
  );
  const toggle = (key: ColumnaVista) => {
    onChange(
      columnas.includes(key) ? columnas.filter((c) => c !== key) : [...columnas, key],
    );
  };

  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <h3 className={s.sectionTitle}>Columnas</h3>
        <span className={s.fieldCount}>{disponibles.filter((c) => columnas.includes(c.key)).length} de {disponibles.length}</span>
      </div>
      <p className={s.sectionHint}>Socio y Acciones siempre se muestran.</p>
      <div className={s.fieldGrid}>
        {disponibles.map((c) => {
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
