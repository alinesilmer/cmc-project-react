import DatePicker, { registerLocale } from "react-datepicker";
import { es } from "date-fns/locale/es";
import "react-datepicker/dist/react-datepicker.css";

import "@/app/components/ui/CampoFecha/calendario.scss";
import s from "./SelectorMes.module.scss";

registerLocale("es", es);

// El primero es el que se muestra; los demás, otras formas de tipearlo.
const FORMATOS = ["MM/yyyy", "M/yyyy", "MMyyyy", "MM-yyyy"];

type Props = {
  /** Cualquier día del mes elegido; sólo importan el mes y el año. */
  value: Date | null;
  onChange: (value: Date | null) => void;
  min?: Date;
  max?: Date;
  /** Sin la cruz para vaciarlo: la pantalla siempre necesita un período. */
  obligatorio?: boolean;
  id?: string;
};

/** Filtro de período: elige mes y año. */
export default function SelectorMes({ value, onChange, min, max, obligatorio = false, id }: Props) {
  return (
    <div className={s.wrap}>
      <DatePicker
        selected={value}
        onChange={onChange}
        showMonthYearPicker
        dateFormat={FORMATOS}
        placeholderText="MM/AAAA"
        locale="es"
        isClearable={!obligatorio}
        minDate={min}
        maxDate={max}
        id={id}
        showPopperArrow={false}
        className={s.input}
      />
    </div>
  );
}
