import type { ReactNode } from "react";

import s from "./Caja.module.scss";

/** Fila de cajas debajo de la franja (hoy: «Configuración» y «Descargas»). */
export function Cajas({ children }: { children: ReactNode }) {
  return <div className={s.cajas}>{children}</div>;
}

/** Caja con título para agrupar los controles de una pantalla: qué se está viendo («Configuración») o qué se puede bajar («Descargas»). */
export default function Caja({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className={s.caja}>
      <h2 className={s.titulo}>{titulo}</h2>
      {children}
    </section>
  );
}
