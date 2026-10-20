import { CalendarClock } from "lucide-react";

import { DIA_CORTE_DESDE_ULTIMO } from "../../ObrasSociales/obrasSociales.types";
import s from "./DiaLimite.module.scss";

interface Props {
  /** `dia_corte` de la obra social: desde el 28 (se guarda 31) es el último día del mes. */
  dia: number;
  /** Para columnas angostas: la hoja del almanaque arriba del texto. */
  compacto?: boolean;
}

/** Día límite de presentación de prestaciones, hecho para que nadie lo pase por alto. */
export default function DiaLimite({ dia, compacto = false }: Props) {
  const finDeMes = dia >= DIA_CORTE_DESDE_ULTIMO;
  return (
    <div className={`${s.corte} ${compacto ? s.compacto : ""}`} role="note">
      <span className={s.corteRotulo}>
        <CalendarClock size={20} aria-hidden="true" />
        Día límite de presentación de prestaciones
      </span>
      <div className={s.cuerpo}>
        <div className={s.hoja} aria-hidden="true">
          <span className={s.hojaBanda}>{finDeMes ? "Último día" : "Cada mes"}</span>
          <span className={s.hojaDia}>{finDeMes ? "Fin" : dia}</span>
        </div>
        <strong className={s.corteValor}>
          {finDeMes ? "Hasta fin de mes" : `Hasta el día ${dia} de cada mes`}
        </strong>
      </div>
    </div>
  );
}
