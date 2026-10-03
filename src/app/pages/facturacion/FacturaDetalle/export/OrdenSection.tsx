import { Info } from "lucide-react";
import type { AgrupacionExport, OrdenExport } from "./types";
import { OPCIONES_ORDEN } from "./types";
import s from "./export.module.scss";

interface Props {
  orden: OrdenExport;
  agrupacion: AgrupacionExport;
  onChange: (orden: OrdenExport) => void;
}

export default function OrdenSection({ orden, agrupacion, onChange }: Props) {
  // "Separado por socio" tiene orden fijo en el backend (`export/armado.py`).
  const fijo = agrupacion === "por_socio";
  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <h3 className={s.sectionTitle}>Ordenar por</h3>
      </div>
      <select
        className={s.filterSelect}
        value={orden}
        disabled={fijo}
        onChange={(e) => onChange(e.target.value as OrdenExport)}
      >
        {OPCIONES_ORDEN.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {fijo && (
        <div className={s.hintCallout}>
          <Info size={14} className={s.hintIcon} />
          <p className={s.hintText}>Orden fijo: médicos A-Z (consultas y prácticas de la más nueva a la más vieja, honorarios individuales por paciente) y al final las clínicas A-Z, por paciente.</p>
        </div>
      )}
    </div>
  );
}
