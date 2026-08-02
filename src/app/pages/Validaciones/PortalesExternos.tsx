import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, Globe, Info } from "lucide-react";

import { OBRAS_EXTERNAS, destinoExterno } from "./validaciones.config";
import { iniciales } from "./validaciones.types";
import type { ObraSocialConfig } from "./validaciones.types";
import s from "./PortalesExternos.module.scss";

/**
 * Obras sociales que no se validan desde el panel. Reemplaza la grilla de
 * logos de `menu.php`: cada tarjeta lleva al sitio del Colegio cuando la obra
 * social tiene página propia, y al portal de la obra social cuando no.
 */
function PortalCard({ os }: { os: ObraSocialConfig }) {
  const { href, interno } = destinoExterno(os);

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
      <p className={s.descripcion}>{os.descripcion}</p>

      {os.nota && (
        <p className={s.nota}>
          <Info size={14} />
          {os.nota}
        </p>
      )}

      <span className={s.accion}>
        {interno ? (
          <>
            <Globe size={15} /> Ver en el sitio del Colegio
          </>
        ) : (
          <>
            <ExternalLink size={15} /> Ir al portal
          </>
        )}
      </span>
    </>
  );

  if (interno)
    return (
      <Link to={href} className={s.card}>
        {cuerpo}
      </Link>
    );

  return (
    <a className={s.card} href={href} target="_blank" rel="noopener noreferrer">
      {cuerpo}
    </a>
  );
}

export default function PortalesExternos() {
  return (
    <div className={s.container}>
      <Link to="/panel/validaciones" className={s.back}>
        <ArrowLeft size={16} /> Volver a validaciones
      </Link>

      <header className={s.header}>
        <Globe size={32} className={s.headerIcon} />
        <div>
          <h1 className={s.title}>Portales de obras sociales</h1>
          <p className={s.subtitle}>
            Estas obras sociales se validan fuera del panel. Hacé click para entrar
            directo al portal que corresponde.
          </p>
        </div>
      </header>

      <div className={s.grid}>
        {OBRAS_EXTERNAS.map((os) => (
          <PortalCard key={os.slug} os={os} />
        ))}
      </div>

      <p className={s.pie}>
        <Info size={15} />
        ¿Necesitás usuario o clave para alguno de estos portales? Consultá en el
        Colegio Médico de lunes a viernes de 8 a 14 h.
      </p>
    </div>
  );
}
