import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import s from "./Paso.module.scss";

type Props = {
  /** El número del paso; con `icono` se dibuja el ícono en su lugar. */
  numero?: number;
  icono?: LucideIcon;
  titulo: string;
  /** Borde y círculo rojos: para lo que deshace algo. */
  peligro?: boolean;
  children: ReactNode;
};

/** Un bloque del flujo: círculo con el paso, el título y el contenido en una columna. */
export default function Paso({ numero, icono: Icono, titulo, peligro = false, children }: Props) {
  return (
    <section className={`${s.paso} ${peligro ? s.peligro : ""}`}>
      <h2 className={s.titulo}>
        <span className={s.marca} aria-hidden="true">
          {Icono ? <Icono size={18} /> : numero}
        </span>
        {titulo}
      </h2>
      {children}
    </section>
  );
}
