import { ArrowUp, ArrowDown, Info } from "lucide-react";
import type { AgrupacionVista, OrdenDireccion, OrdenVista } from "./types";
import { OPCIONES_ORDEN_VISTA } from "./types";
import s from "../export/export.module.scss";

interface Props {
  orden: OrdenVista;
  direccion: OrdenDireccion;
  // Sólo para el texto de ayuda de abajo: con agrupación este criterio ordena
  // DENTRO de cada grupo, no la tabla entera — sin esto no queda claro por qué
  // elegir "Nombre del socio" no hace nada visible en el modo "Por socio" (los
  // grupos ya van A-Z por nombre; acá adentro todas las filas son del mismo socio).
  agrupacion: AgrupacionVista;
  onChangeOrden: (orden: OrdenVista) => void;
  onChangeDireccion: (direccion: OrdenDireccion) => void;
}

const HINT_POR_AGRUPACION: Record<AgrupacionVista, string> = {
  por_socio: "Orden fijo: médicos A-Z (consultas y prácticas de la más nueva a la más vieja, honorarios individuales por paciente) y al final las clínicas A-Z, por paciente.",
  por_tipo: "Los grupos van en orden fijo (Consultas → Prácticas → Honorarios → Sanatorios). Este criterio ordena las filas dentro de cada uno.",
  plana: "Sin agrupación: este criterio ordena toda la tabla, de punta a punta.",
};

export default function OrdenVistaSection({
  orden, direccion, agrupacion, onChangeOrden, onChangeDireccion,
}: Props) {
  // En "Por socio" el orden es fijo (ver `vistaGrupos` en FacturaDetalle.tsx).
  const fijo = agrupacion === "por_socio";
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
            className={`${s.chipToggle} ${orden === o.value && !fijo ? s.chipToggleOn : ""}`}
            disabled={fijo}
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
            className={`${s.dirBtn} ${direccion === "asc" && !fijo ? s.dirBtnOn : ""}`}
            disabled={fijo}
            onClick={() => onChangeDireccion("asc")}
          >
            <ArrowUp size={12} /> Ascendente
          </button>
          <button
            type="button"
            className={`${s.dirBtn} ${s.dirBtnRight} ${direccion === "desc" && !fijo ? s.dirBtnOn : ""}`}
            disabled={fijo}
            onClick={() => onChangeDireccion("desc")}
          >
            <ArrowDown size={12} /> Descendente
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
