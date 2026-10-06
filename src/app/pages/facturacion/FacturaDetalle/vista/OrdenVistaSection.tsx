import { ArrowUp, ArrowDown, Info } from "lucide-react";
import type { AgrupacionVista, OrdenDireccion, OrdenVista } from "./types";
import { OPCIONES_ORDEN_VISTA } from "./types";
import s from "../export/export.module.scss";

interface Props {
  orden: OrdenVista;
  direccion: OrdenDireccion;
  // Sólo para el texto de ayuda de abajo: con agrupación este criterio ordena
  // DENTRO de cada grupo, no la tabla entera. En "Por socio" la sección no se muestra
  // (orden fijo, ver `VistaPanel`).
  agrupacion: Exclude<AgrupacionVista, "por_socio">;
  onChangeOrden: (orden: OrdenVista) => void;
  onChangeDireccion: (direccion: OrdenDireccion) => void;
}

const HINT_POR_AGRUPACION: Record<Exclude<AgrupacionVista, "por_socio">, string> = {
  por_tipo: "Los grupos van en orden fijo (Consultas → Prácticas → Honorarios → Sanatorios) y, dentro de cada uno, por médico A-Z con su subtotal. Este criterio ordena las filas de cada médico; para ordenar toda la tabla por fecha de carga usá la planilla plana. En Honorarios individuales y Sanatorios, los botones del subtítulo permiten ordenar por paciente A-Z.",
  plana: "Sin agrupación: este criterio ordena toda la tabla, de punta a punta.",
};

export default function OrdenVistaSection({
  orden, direccion, agrupacion, onChangeOrden, onChangeDireccion,
}: Props) {
  // Con "Fecha de carga" la dirección se lee como viejo/nuevo en vez de asc/desc.
  const porCarga = orden === "fecha_carga";
  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <h3 className={s.sectionTitle}>Ordenar por</h3>
      </div>

      <div className={s.chipToggleRow}>
        {OPCIONES_ORDEN_VISTA.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`${s.chipToggle} ${orden === o.value ? s.chipToggleOn : ""}`}
            onClick={() => onChangeOrden(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className={s.dirRow}>
        <span className={s.dirLabel}>Dirección:</span>
        <div className={s.dirGroup}>
          <button
            type="button"
            className={`${s.dirBtn} ${direccion === "asc" ? s.dirBtnOn : ""}`}
            onClick={() => onChangeDireccion("asc")}
          >
            <ArrowUp size={12} /> {porCarga ? "Más viejo primero" : "Ascendente"}
          </button>
          <button
            type="button"
            className={`${s.dirBtn} ${s.dirBtnRight} ${direccion === "desc" ? s.dirBtnOn : ""}`}
            onClick={() => onChangeDireccion("desc")}
          >
            <ArrowDown size={12} /> {porCarga ? "Más nuevo primero" : "Descendente"}
          </button>
        </div>
      </div>

      <div className={s.hintCallout}>
        <Info size={14} className={s.hintIcon} />
        <p className={s.hintText}>{HINT_POR_AGRUPACION[agrupacion]}</p>
      </div>
    </div>
  );
}
