import type { AgrupacionVista } from "./types";
import { OPCIONES_AGRUPACION_VISTA } from "./types";
import s from "../export/export.module.scss";

interface Props {
  agrupacion: AgrupacionVista;
  agruparEquipo: boolean;
  onChangeAgrupacion: (agrupacion: AgrupacionVista) => void;
  onChangeAgruparEquipo: (agruparEquipo: boolean) => void;
}

export default function AgrupacionVistaSection({
  agrupacion, agruparEquipo, onChangeAgrupacion, onChangeAgruparEquipo,
}: Props) {
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

      <label className={`${s.fieldToggle} ${agruparEquipo ? s.fieldToggleOn : ""}`}>
        <input
          type="checkbox"
          className={s.fieldCheckbox}
          checked={agruparEquipo}
          onChange={(e) => onChangeAgruparEquipo(e.target.checked)}
        />
        <span className={s.fieldLabel}>Agrupar equipo quirúrgico</span>
      </label>
      <p className={s.sectionHint}>
        Muestra al ayudante/gastos indentados debajo del cirujano, sin sumar su
        honorario al subtotal de él — cada uno sigue con su propia fila completa
        (y su propio subtotal) en su grupo.
      </p>
    </div>
  );
}
