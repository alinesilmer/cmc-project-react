import { CalendarClock } from "lucide-react";

import { DIA_CORTE_ULTIMO } from "../../ObrasSociales/obrasSociales.types";
import s from "./DiaLimite.module.scss";

interface Props {
  /** `dia_corte` de la obra social: 1 = el período es el mes calendario y 31 = último día del mes; en ambos el límite es fin de mes. */
  dia: number;
  /** Para columnas angostas: la hoja del almanaque arriba del texto. */
  compacto?: boolean;
}

/** Día límite de presentación de prestaciones, hecho para que nadie lo pase por alto. */
export default function DiaLimite({ dia, compacto = false }: Props) {
  const finDeMes = dia === 1 || dia >= DIA_CORTE_ULTIMO;
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
