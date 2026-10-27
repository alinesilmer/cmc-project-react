import type { ReactNode } from "react";
import { AlertTriangle, Info } from "lucide-react";

import s from "./Aviso.module.scss";

type Props = {
  /** `aviso` advierte sin bloquear; `info` explica. */
  tono?: "aviso" | "info";
  children: ReactNode;
};

/** Franja de aviso dentro de un paso: lo que conviene saber antes de seguir. */
export default function Aviso({ tono = "aviso", children }: Props) {
  const Icono = tono === "aviso" ? AlertTriangle : Info;
  return (
    <p className={`${s.aviso} ${tono === "aviso" ? s.advertencia : s.info}`} role={tono === "aviso" ? "alert" : undefined}>
      <Icono size={18} aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
