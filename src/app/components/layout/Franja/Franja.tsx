import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import s from "./Franja.module.scss";

type Props = {
  titulo: ReactNode;
  /** El ícono de la sección, a la izquierda del título. */
  icono?: LucideIcon;
  /** A la derecha del título: sólo un dato corto (el paso de un asistente). */
  lateral?: ReactNode;
  /** Fila de abajo: las solapas. */
  children?: ReactNode;
  /** La pantalla no tiene un contenedor con relleno propio alrededor de la franja. */
  suelta?: boolean;
};

/** Franja azul con la que abren las pantallas del panel: el título en crema, la trama de cruces y, opcionalmente. */
export default function Franja({ titulo, icono: Icono, lateral, children, suelta = false }: Props) {
  return (
    <div className={`${s.franja} ${suelta ? s.suelta : ""}`}>
      <div className={s.cabeza}>
        <h1 className={s.titulo}>
          {Icono && <Icono size={46} strokeWidth={1.8} aria-hidden="true" />}
          {titulo}
        </h1>
        {lateral && <div className={s.lateral}>{lateral}</div>}
      </div>
      {children && (
        <div className={s.pie} role="tablist">
          {children}
        </div>
      )}
    </div>
  );
}

type SolapaProps = {
  activa: boolean;
  onClick: () => void;
  children: ReactNode;
  /** Cantidad a la derecha del rótulo; en cero no se muestra. */
  cuenta?: number;
};

/** Una solapa de la fila de abajo de la franja: lo único que acompaña al título. */
export function Solapa({ activa, onClick, children, cuenta }: SolapaProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={activa}
      className={`${s.solapa} ${activa ? s.solapaActiva : ""}`}
      onClick={onClick}
    >
      {children}
      {cuenta != null && cuenta > 0 && <span className={s.cuenta}>{cuenta}</span>}
    </button>
  );
}
