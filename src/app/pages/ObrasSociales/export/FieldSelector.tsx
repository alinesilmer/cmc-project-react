import type { ExportField } from "./exportService";
import s from "./export.module.scss";

interface Props {
  fields: ExportField[];
  onChange: (fields: ExportField[]) => void;
}

export default function FieldSelector({ fields, onChange }: Props) {
  const toggle = (key: string) => {
    onChange(fields.map((f) => (f.key === key ? { ...f, enabled: !f.enabled } : f)));
  };

  const enabledCount = fields.filter((f) => f.enabled).length;

  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <h3 className={s.sectionTitle}>Columnas a exportar</h3>
        <span className={s.fieldCount}>{enabledCount} de {fields.length}</span>
      </div>

      <div className={s.fieldGrid}>
        {fields.map((f) => (
          <label key={f.key} className={`${s.fieldToggle} ${f.enabled ? s.fieldToggleOn : ""}`}>
            <input
              type="checkbox"
              checked={f.enabled}
              onChange={() => toggle(f.key)}
              className={s.fieldCheckbox}
            />
            <span className={s.fieldLabel}>{f.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
