import type { EstadoCodigoOS } from "../nomenclador.types";
import { ESTADO_CODIGO_OS_LABEL } from "../nomenclador.types";
import s from "./estadoCodigoPill.module.scss";

/**
 * Estado de un código en una obra social, igual en todas las pantallas del flujo
 * (Ficha del código, Códigos por obra social, Precios por obra social):
 * Sin alta · Sin precio · Con precio · Suspendido.
 */
export default function EstadoCodigoPill({
  estado,
  texto,
}: {
  estado: EstadoCodigoOS;
  /** Reemplaza la etiqueta por defecto (ej. el precio vigente). */
  texto?: string;
}) {
  return <span className={`${s.pill} ${s[estado]}`}>{texto ?? ESTADO_CODIGO_OS_LABEL[estado]}</span>;
}
