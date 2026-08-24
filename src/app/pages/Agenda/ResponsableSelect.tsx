import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";

import type { Responsable } from "./agenda.types";
import s from "./Agenda.module.scss";

type Props = {
  /** El nombre guardado en el evento. Texto libre, puede no estar en la lista. */
  value: string;
  onChange: (nombre: string) => void;
  opciones: Responsable[];
  cargando?: boolean;
};

/**
 * Selector con búsqueda del personal del Colegio.
 *
 * **Acepta texto que no esté en la lista**, y eso no es una concesión: la
 * columna `responsable` también se usa para áreas ("Facturación", "Mesa de
 * entradas") y ya tiene valores cargados a mano. Un select cerrado obligaría a
 * dar de alta un usuario ficticio por cada área, o a perder lo que ya estaba.
 *
 * Por eso el input es el valor real y el menú sólo ayuda a completarlo: lo que
 * se ve escrito es exactamente lo que se guarda.
 */
export default function ResponsableSelect({ value, onChange, opciones, cargando }: Props) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  // Cerrar al clickear afuera. Sin esto el menú queda abierto tapando el resto
  // del formulario después de elegir con el mouse en otro lado.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);

  const filtradas = useMemo(() => {
    const aguja = value.trim().toLowerCase();
    // Con el valor ya elegido exacto no se filtra: si se filtrara, el menú
    // mostraría una sola opción (la elegida) y no se podría cambiar sin borrar.
    if (!aguja || opciones.some((o) => o.nombre.toLowerCase() === aguja)) return opciones;
    return opciones.filter((o) => o.nombre.toLowerCase().includes(aguja));
  }, [opciones, value]);

  return (
    <div className={s.selectWrap} ref={caja}>
      <div className={s.selectBox}>
        <input
          className={s.selectInput}
          value={value}
          placeholder={cargando ? "Cargando…" : "Buscar o escribir…"}
          onChange={(e) => {
            onChange(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={(e) => e.key === "Escape" && setAbierto(false)}
        />
        {value ? (
          <button
            type="button"
            className={s.selectIcon}
            title="Limpiar"
            onClick={() => {
              onChange("");
              setAbierto(false);
            }}
          >
            <X size={14} />
          </button>
        ) : (
          <button
            type="button"
            className={s.selectIcon}
            tabIndex={-1}
            onClick={() => setAbierto((a) => !a)}
          >
            <ChevronDown size={14} />
          </button>
        )}
      </div>

      {abierto && (
        <ul className={s.selectMenu}>
          {filtradas.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                className={s.selectOption}
                onClick={() => {
                  onChange(o.nombre);
                  setAbierto(false);
                }}
              >
                <span className={s.selectNombre}>{o.nombre}</span>
                <span className={s.selectRol}>{o.roles.join(" · ")}</span>
                {o.nombre === value && <Check size={13} className={s.selectCheck} />}
              </button>
            </li>
          ))}

          {!filtradas.length && (
            <li className={s.selectVacio}>
              {cargando
                ? "Cargando…"
                : value.trim()
                  ? `Sin coincidencias. Se guarda «${value.trim()}».`
                  : "Sin personal cargado."}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
