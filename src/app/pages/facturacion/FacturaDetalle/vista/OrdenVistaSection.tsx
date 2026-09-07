import type { OrdenVista } from "./types";
import { OPCIONES_ORDEN_VISTA } from "./types";
import s from "../export/export.module.scss";

interface Props {
  orden: OrdenVista;
  onChange: (orden: OrdenVista) => void;
}

export default function OrdenVistaSection({ orden, onChange }: Props) {
  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <h3 className={s.sectionTitle}>Ordenar por</h3>
      </div>
      <select
        className={s.filterSelect}
        value={orden}
        onChange={(e) => onChange(e.target.value as OrdenVista)}
      >
        {OPCIONES_ORDEN_VISTA.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
