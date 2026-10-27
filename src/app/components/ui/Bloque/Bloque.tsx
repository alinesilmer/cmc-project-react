import type { ReactNode } from "react";

import s from "./Bloque.module.scss";

/** Zona de resultados dentro de un paso: la vista previa o el detalle, sobre fondo gris claro. */
export default function Bloque({ children }: { children: ReactNode }) {
  return <div className={s.bloque}>{children}</div>;
}
