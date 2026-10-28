import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import DatePicker, { registerLocale } from "react-datepicker";
import { es } from "date-fns/locale/es";
import "react-datepicker/dist/react-datepicker.css";

import { fechaAISO, parseFechaLocal } from "@/app/shared/lib/fechas";
import "./calendario.scss";
import s from "./CampoFecha.module.scss";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

registerLocale("es", es);

// El primero es el que se muestra; los demás, otras formas de tipearla.
const FORMATOS = ["dd/MM/yyyy", "d/M/yyyy", "dd-MM-yyyy", "ddMMyyyy"];
const ANIO_MINIMO = 1900;
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

type Props = {
  /** `YYYY-MM-DD` o vacío: lo mismo que entrega un `<input type="date">`. */
  value: string;
  onChange: (valor: string) => void;
  min?: string;
  max?: string;
  id?: string;
  ariaLabel?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  /** El calendario sólo se abre al tocar el ícono; el campo queda para escribir. */
  calendarioSoloEnIcono?: boolean;
};

/** `12102026` → `12/10/2026` mientras se escribe, sin tener que tipear las barras. */
function conBarras(texto: string): string | null {
  // Sólo si viene de corrido o con dos dígitos por tramo: `1/2/2026` se respeta.
  if (!/^(\d{2}\/){0,2}\d*$/.test(texto)) return null;
  const digitos = texto.replace(/\D/g, "").slice(0, 8);
  return [digitos.slice(0, 2), digitos.slice(2, 4), digitos.slice(4)].filter(Boolean).join("/");
}

/** Los años del desplegable: de los límites del campo o, si no hay, un siglo largo. */
function aniosPosibles(min: Date | undefined, max: Date | undefined): number[] {
  const hasta = max?.getFullYear() ?? new Date().getFullYear() + 10;
  const desde = min?.getFullYear() ?? ANIO_MINIMO;
  return Array.from({ length: hasta - desde + 1 }, (_, i) => hasta - i);
}

/** EL campo de fecha del panel. */
export default function CampoFecha({
  value,
  onChange,
  min,
  max,
  id,
  ariaLabel,
  disabled = false,
  required = false,
  className,
  calendarioSoloEnIcono = false,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const minimo = min ? (parseFechaLocal(min) ?? undefined) : undefined;
  const maximo = max ? (parseFechaLocal(max) ?? undefined) : undefined;
  const anios = aniosPosibles(minimo, maximo);

  const elegir = (fecha: Date | null) => {
    if (!fecha) return onChange("");
    // A medio escribir el año (`12/10/20`) todavía no es una fecha: no se avisa.
    if (fecha.getFullYear() < ANIO_MINIMO) return;
    onChange(fechaAISO(fecha));
  };

  return (
    <div className={`${s.campo} ${className ?? ""}`}>
      <DatePicker
        id={id}
        selected={value ? parseFechaLocal(value) : null}
        onChange={elegir}
        onChangeRaw={(e) => {
          const entrada = e?.target;
          if (!(entrada instanceof HTMLInputElement)) return;
          const armado = conBarras(entrada.value);
          if (armado !== null) entrada.value = armado;
        }}
        dateFormat={FORMATOS}
        placeholderText="dd/mm/aaaa"
        locale="es"
        minDate={minimo}
        maxDate={maximo}
        todayButton="Hoy"
        showPopperArrow={false}
        popperProps={{ strategy: "fixed" }}
        renderCustomHeader={({
          date,
          changeMonth,
          changeYear,
          decreaseMonth,
          increaseMonth,
          prevMonthButtonDisabled,
          nextMonthButtonDisabled,
        }) => (
          <div className="calendario-cabeza">
            <select
              className="calendario-mes"
              aria-label="Mes"
              value={date.getMonth()}
              onChange={(e) => changeMonth(Number(e.target.value))}
            >
              {MESES.map((mes, i) => (
                <option key={mes} value={i}>
                  {mes}
                </option>
              ))}
            </select>
            <select
              className="calendario-anio"
              aria-label="Año"
              value={date.getFullYear()}
              onChange={(e) => changeYear(Number(e.target.value))}
            >
              {anios.map((anio) => (
                <option key={anio} value={anio}>
                  {anio}
                </option>
              ))}
            </select>
            <BotonPlano
              type="button"
              className="calendario-flecha"
              onClick={decreaseMonth}
              disabled={prevMonthButtonDisabled}
              aria-label="Mes anterior"
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </BotonPlano>
            <BotonPlano
              type="button"
              className="calendario-flecha"
              onClick={increaseMonth}
              disabled={nextMonthButtonDisabled}
              aria-label="Mes siguiente"
            >
              <ChevronRight size={18} aria-hidden="true" />
            </BotonPlano>
          </div>
        )}
        // Con `open` controlado el campo no abre el calendario al enfocarlo ni al hacer clic.
        {...(calendarioSoloEnIcono && {
          open: abierto,
          onClickOutside: () => setAbierto(false),
          onSelect: () => setAbierto(false),
          onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
            if (e.key === "Escape" || e.key === "Tab") setAbierto(false);
          },
        })}
        disabled={disabled}
        required={required}
        aria-label={ariaLabel}
        autoComplete="off"
        className={s.entrada}
      />
      {calendarioSoloEnIcono ? (
        <BotonPlano
          type="button"
          className={`${s.icono} ${s.iconoBoton}`}
          onClick={() => setAbierto((a) => !a)}
          disabled={disabled}
          aria-label="Abrir calendario"
          aria-expanded={abierto}
          tabIndex={-1}
        >
          <CalendarDays size={17} aria-hidden="true" />
        </BotonPlano>
      ) : (
        <CalendarDays size={17} className={s.icono} aria-hidden="true" />
      )}
    </div>
  );
}
