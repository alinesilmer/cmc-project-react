import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import s from "./PaginaPasos.module.scss";
import Franja from "@/app/components/layout/Franja/Franja";

type Props = {
  titulo: string;
  icono: LucideIcon;
  /** Para pasos que llevan una tabla: la columna se ensancha. */
  ancha?: boolean;
  /** Las solapas de la franja (`Solapa`), cuando la pantalla tiene secciones. */
  solapas?: ReactNode;
  children: ReactNode;
};

/** Pantalla de un flujo por pasos: la franja y debajo una columna de bloques numerados (`Paso`). */
export default function PaginaPasos({ titulo, icono, ancha = false, solapas, children }: Props) {
  return (
    <div className={s.container}>
      <Franja titulo={titulo} icono={icono}>{solapas}</Franja>
      <div className={`${s.columna} ${ancha ? s.ancha : ""}`}>{children}</div>
    </div>
  );
}
