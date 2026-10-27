import { Loader2 } from "lucide-react";

import s from "./Cargando.module.scss";

interface Props {
  /** Lado del ícono en px. */
  size?: number;
  /** `marca`: el azul del Colegio, para el indicador de toda una pantalla o tabla. Sin él toma el color del texto. */
  tono?: "marca";
  /** Para colocarlo; el giro ya viene incluido. */
  className?: string;
  "aria-label"?: string;
  "aria-hidden"?: boolean | "true" | "false";
}

/** EL indicador de carga del panel: un ícono que gira, del color del texto que lo rodea. */
export default function Cargando({ size = 16, tono, className, ...aria }: Props) {
  const clases = [s.giro, tono === "marca" ? s.marca : "", className ?? ""].filter(Boolean).join(" ");
  return <Loader2 size={size} className={clases} {...aria} />;
}
