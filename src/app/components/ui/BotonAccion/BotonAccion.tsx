import type { ComponentType, MouseEvent } from "react";

import s from "./BotonAccion.module.scss";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

type Props = {
  /** Un ícono de lucide o cualquier SVG que acepte `size`. */
  icono: ComponentType<{ size?: number | string; "aria-hidden"?: boolean | "true" | "false" }>;
  /** Qué hace, para el lector de pantalla y el globo: «Editar», «Eliminar». */
  etiqueta: string;
  /** Rojo al pasar el mouse: para borrar. */
  peligro?: boolean;
  disabled?: boolean;
} & (
  | { onClick: (e: MouseEvent<HTMLButtonElement>) => void; href?: undefined }
  | { href: string; onClick?: undefined }
);

/** El botón de ícono de las acciones de una fila (editar, eliminar, compartir); `BotonVer` es el del ojo. */
export default function BotonAccion({ icono: Icono, etiqueta, peligro = false, disabled = false, onClick, href }: Props) {
  const clases = `${s.accion} ${peligro ? s.peligro : ""}`;
  const icon = <Icono size={18} aria-hidden="true" />;
  if (href !== undefined) {
    return (
      <a className={clases} href={href} target="_blank" rel="noopener noreferrer" title={etiqueta} aria-label={etiqueta}>
        {icon}
      </a>
    );
  }
  return (
    <BotonPlano type="button" className={clases} onClick={onClick} disabled={disabled} title={etiqueta} aria-label={etiqueta}>
      {icon}
    </BotonPlano>
  );
}
