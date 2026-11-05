import type { FormEventHandler, ReactNode } from "react";

import s from "./Caja.module.scss";

/** Fila de cajas debajo de la franja (hoy: «Configuración» y «Descargas»). */
export function Cajas({ children }: { children: ReactNode }) {
  return <div className={s.cajas}>{children}</div>;
}

/**
 * Fila de filtros dentro de una `Caja` (o de una barra propia, con `className`): los controles van uno al lado del otro
 * y, si no entran, pasan al renglón de abajo sin dejar escalones. Cada hijo directo es un control (un `<label>` con su
 * rótulo, un botón...). Los buscadores y los campos largos llevan además `filtroAncho` (ver filtroAncho.ts). Con `onSubmit` es un `<form>`
 * (Enter en cualquier campo consulta).
 */
export function Filtros({
  children,
  className,
  onSubmit,
}: {
  children: ReactNode;
  className?: string;
  onSubmit?: FormEventHandler<HTMLFormElement>;
}) {
  const clase = className ? `${s.filtros} ${className}` : s.filtros;
  return onSubmit ? (
    <form className={clase} onSubmit={onSubmit}>{children}</form>
  ) : (
    <div className={clase}>{children}</div>
  );
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
