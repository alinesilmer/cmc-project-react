import type { MouseEvent } from "react";
import { Link } from "react-router-dom";
import { Eye } from "lucide-react";

import s from "./BotonVer.module.scss";

type Props = {
  /** Qué se abre, para el lector de pantalla y el globo: «Ver ficha», «Ver OSDE». */
  etiqueta?: string;
  disabled?: boolean;
} & (
  | { onClick: (e: MouseEvent<HTMLButtonElement>) => void; to?: undefined }
  | { to: string; onClick?: undefined }
);

/** EL botón «Ver» de las filas del panel: un ojo, siempre igual. */
export default function BotonVer({ etiqueta = "Ver", disabled = false, onClick, to }: Props) {
  const ojo = <Eye size={18} aria-hidden="true" />;
  if (to !== undefined) {
    return (
      <Link className={s.ver} to={to} title={etiqueta} aria-label={etiqueta}>
        {ojo}
      </Link>
    );
  }
  return (
    <button type="button" className={s.ver} onClick={onClick} disabled={disabled} title={etiqueta} aria-label={etiqueta}>
      {ojo}
    </button>
  );
}
