import type { MouseEvent, ReactNode } from "react";
import { Link } from "react-router-dom";

import { iniciales } from "../validaciones.types";
import s from "./ObraSocialCard.module.scss";

interface Props {
  nombre: string;
  logo?: string;
  /** Sin destino, la carpeta sólo abre lo que diga `onAbrir` (la solapa «Otros»). */
  href?: string;
  /** El destino está fuera del panel: se abre en otra pestaña. */
  externo?: boolean;
  deshabilitada?: boolean;
  /** Por qué está deshabilitada («En mantenimiento», «Próximamente»). */
  aviso?: string;
  /** Lo que va sobre la carpeta (la etiqueta de la guía, por ejemplo). */
  children?: ReactNode;
  /** Reemplaza la navegación (para avisar algo antes de salir al portal). */
  onAbrir?: () => void;
}

/** La carpeta de archivero del panel: la hoja con el logo asomando y el frente con el nombre. */
export default function Carpeta({ nombre, logo, href, externo, deshabilitada, aviso, children, onAbrir }: Props) {
  const interceptar = onAbrir
    ? (e: MouseEvent) => {
        e.preventDefault();
        onAbrir();
      }
    : undefined;

  const cuerpo = (
    <>
      <span className={s.hoja}>
        {logo ? (
          <img src={logo} alt="" className={s.logo} loading="lazy" />
        ) : (
          <span className={s.logoFallback}>{iniciales(nombre)}</span>
        )}
      </span>

      <div className={s.frente}>
        <h2 className={s.nombre}>{nombre}</h2>
        {deshabilitada && aviso && <span className={s.aviso}>{aviso}</span>}
      </div>
    </>
  );

  return (
    <div className={s.cell}>
      {!href ? (
        // Sin destino abre un detalle: un div con rol de botón porque el cuerpo lleva un h2.
        <div
          className={s.card}
          role="button"
          tabIndex={0}
          onClick={onAbrir}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onAbrir?.();
            }
          }}
        >
          {cuerpo}
        </div>
      ) : deshabilitada ? (
        <div className={`${s.card} ${s.cardDisabled}`} aria-disabled="true">
          {cuerpo}
        </div>
      ) : externo ? (
        <a className={s.card} href={href} target="_blank" rel="noopener noreferrer" onClick={interceptar}>
          {cuerpo}
        </a>
      ) : (
        <Link className={s.card} to={href} onClick={interceptar}>
          {cuerpo}
        </Link>
      )}

      {children}
    </div>
  );
}

export { s as carpetaStyles };
