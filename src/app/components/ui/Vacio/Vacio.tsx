import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import s from "./Vacio.module.scss";

/** El lugar de lo que todavía no hay: un ícono y una línea que dice qué hacer. */
export default function Vacio({ icono: Icono, children }: { icono: LucideIcon; children: ReactNode }) {
  return (
    <div className={s.vacio}>
      <Icono size={34} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
