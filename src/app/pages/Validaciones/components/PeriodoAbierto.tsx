import type { CSSProperties } from "react";

import { nombreMes } from "../validaciones.types";
import s from "./PeriodoAbierto.module.scss";

interface Props {
  mes: number;
  anio: number;
  /** `false` mientras todavía no llegó el período que definió el Colegio. */
  listo: boolean;
  /** Prestaciones ya cargadas en el período; sin dato no se muestra. */
  cantidad?: number;
}

/** El período en el que entra lo que se cargue, dibujado como la hoja de un almanaque de escritorio al costado del formulario. */
export default function PeriodoAbierto({ mes, anio, listo, cantidad }: Props) {
  return (
    <aside className={s.almanaque} aria-live="polite">
      <header className={s.lomo}>
        <i aria-hidden="true" />
        <span>Período abierto</span>
        <i aria-hidden="true" />
      </header>

      <div className={s.hoja}>
        {listo ? (
          <>
            <p
              className={s.mes}
              style={{ "--letras": nombreMes(mes).length } as CSSProperties}
            >
              {nombreMes(mes)}
            </p>
            <p className={s.anio}>{anio}</p>
          </>
        ) : (
          <p className={s.cargando}>Cargando…</p>
        )}

        {listo && cantidad != null && (
          <p className={s.cuenta}>
            <b>{cantidad}</b> {cantidad === 1 ? "cargada" : "cargadas"}
          </p>
        )}
      </div>
    </aside>
  );
}
