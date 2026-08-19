import { Link } from "react-router-dom";
import { ExternalLink, Globe, KeyRound, Wrench, ArrowUpRight } from "lucide-react";

import { destinoObraSocial } from "../validaciones.config";
import { iniciales } from "../validaciones.types";
import type { ObraSocialConfig } from "../validaciones.types";
import s from "./ObraSocialCard.module.scss";

export { s as obraSocialCardStyles };

interface Props {
  os: ObraSocialConfig;
  /** Abre la guía de usuario y clave del portal (Swiss Medical, Unión Personal). */
  onAbrirGuia?: (os: ObraSocialConfig) => void;
}

/**
 * Tarjeta única del catálogo de validaciones. No distingue entre obras sociales
 * integradas y externas: cambia sólo el destino y el texto de la acción, así el
 * médico ve todas las obras sociales en la misma grilla.
 */
export default function ObraSocialCard({ os, onAbrirGuia }: Props) {
  const { href, tipo } = destinoObraSocial(os);
  const deshabilitada = os.estado === "mantenimiento";

  const cuerpo = (
    <>
      <span className={s.logoWrap} style={{ ["--os-color" as string]: os.color }}>
        {os.logo ? (
          <img src={os.logo} alt="" className={s.logo} loading="lazy" />
        ) : (
          <span className={s.logoFallback} style={{ background: os.color }}>
            {iniciales(os.nombre)}
          </span>
        )}
      </span>

      <h2 className={s.nombre}>{os.nombre}</h2>

      {deshabilitada ? (
        <span className={`${s.accion} ${s.accionDisabled}`}>
          <Wrench size={15} /> En mantenimiento
        </span>
      ) : (
        <span className={s.accion}>
          {tipo === "panel" && (
            <>
              Cargar prestación <ArrowUpRight size={15} />
            </>
          )}
          {tipo === "cmc" && (
            <>
              <Globe size={15} /> Ver en el sitio del Colegio
            </>
          )}
          {tipo === "portal" && (
            <>
              <ExternalLink size={15} /> Ir al portal
            </>
          )}
        </span>
      )}
    </>
  );

  return (
    <div className={s.cell}>
      {deshabilitada ? (
        <div className={`${s.card} ${s.cardDisabled}`} aria-disabled="true">
          {cuerpo}
        </div>
      ) : tipo === "portal" ? (
        <a className={s.card} href={href} target="_blank" rel="noopener noreferrer">
          {cuerpo}
        </a>
      ) : (
        <Link className={s.card} to={href}>
          {cuerpo}
        </Link>
      )}

      {os.guia && onAbrirGuia && (
        <button
          type="button"
          className={s.guiaChip}
          onClick={() => onAbrirGuia(os)}
          aria-label={`${os.guia.chip} de ${os.nombre}`}
        >
          <KeyRound size={16} />
          {os.guia.chip}
        </button>
      )}
    </div>
  );
}
