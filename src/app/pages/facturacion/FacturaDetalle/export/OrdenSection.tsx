import type { OrdenExport } from "./types";
import { OPCIONES_ORDEN } from "./types";
import s from "./export.module.scss";

interface Props {
  orden: OrdenExport;
  onChange: (orden: OrdenExport) => void;
}

export default function OrdenSection({ orden, onChange }: Props) {
  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <h3 className={s.sectionTitle}>Ordenar por</h3>
      </div>
      <select
        className={s.filterSelect}
        value={orden}
        onChange={(e) => onChange(e.target.value as OrdenExport)}
      >
        {OPCIONES_ORDEN.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
