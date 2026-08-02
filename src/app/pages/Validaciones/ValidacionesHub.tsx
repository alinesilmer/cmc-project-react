import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Globe,
  Info,
  Search,
  ShieldCheck,
  Wrench,
  Zap,
} from "lucide-react";

import { OBRAS_EXTERNAS, OBRAS_INTEGRADAS } from "./validaciones.config";
import { iniciales } from "./validaciones.types";
import type { ObraSocialConfig } from "./validaciones.types";
import s from "./ValidacionesHub.module.scss";

function EstadoBadge({ os }: { os: ObraSocialConfig }) {
  if (os.estado === "mantenimiento")
    return (
      <span className={`${s.badge} ${s.badgeWarn}`}>
        <Wrench size={12} /> En mantenimiento
      </span>
    );

  return (
    <span className={`${s.badge} ${s.badgeOk}`}>
      <Zap size={12} />
      {os.validacion === "online" ? "Validación en línea" : "Carga manual"}
    </span>
  );
}

function ObraSocialCard({ os }: { os: ObraSocialConfig }) {
  const deshabilitada = os.estado === "mantenimiento";

  const contenido = (
    <>
      <span className={s.accent} style={{ background: os.color }} aria-hidden />

      <div className={s.cardHead}>
        {os.logo ? (
          <img src={os.logo} alt="" className={s.cardLogo} loading="lazy" />
        ) : (
          <span className={s.avatar} style={{ background: os.color }}>
            {iniciales(os.nombre)}
          </span>
        )}
        <div className={s.cardTitles}>
          <h3 className={s.cardName}>{os.nombre}</h3>
          {os.codigo != null && <span className={s.cardCode}>O.S. {os.codigo}</span>}
        </div>
      </div>

      <p className={s.cardDesc}>{os.descripcion}</p>

      <div className={s.cardBadges}>
        <EstadoBadge os={os} />
      </div>

      <span className={s.cardAction}>
        {deshabilitada ? "No disponible por ahora" : "Cargar prestación"}
        {!deshabilitada && <ArrowUpRight size={15} />}
      </span>
    </>
  );

  if (deshabilitada)
    return (
      <div className={`${s.card} ${s.cardDisabled}`} aria-disabled="true">
        {contenido}
      </div>
    );

  return (
    <Link className={s.card} to={`/panel/validaciones/${os.slug}`}>
      {contenido}
    </Link>
  );
}

export default function ValidacionesHub() {
  const [busqueda, setBusqueda] = useState("");

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return OBRAS_INTEGRADAS;
    return OBRAS_INTEGRADAS.filter(
      (os) =>
        os.nombre.toLowerCase().includes(q) ||
        os.descripcion.toLowerCase().includes(q) ||
        String(os.codigo ?? "").includes(q)
    );
  }, [busqueda]);

  return (
    <div className={s.container}>
      <header className={s.header}>
        <div className={s.headerLeft}>
          <ShieldCheck size={34} className={s.headerIcon} />
          <div>
            <h1 className={s.title}>Validación de prestaciones</h1>
            <p className={s.subtitle}>
              Elegí la obra social para autorizar y cargar tus prestaciones del período.
            </p>
          </div>
        </div>

        <div className={s.searchBox}>
          <Search size={17} />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar obra social o número…"
            aria-label="Buscar obra social"
          />
        </div>
      </header>

      {resultados.length === 0 ? (
        <div className={s.empty}>
          <Search size={30} />
          <p>No encontramos obras sociales que coincidan con «{busqueda}».</p>
        </div>
      ) : (
        <div className={s.grid}>
          {resultados.map((os) => (
            <ObraSocialCard key={os.slug} os={os} />
          ))}
        </div>
      )}

      {/* Acceso a las obras sociales que se validan fuera del panel. */}
      <Link to="/panel/validaciones/portales" className={s.portalesBanner}>
        <Globe size={26} />
        <div className={s.portalesTexto}>
          <strong>Otras obras sociales</strong>
          <span>
            {OBRAS_EXTERNAS.map((os) => os.nombre).join(" · ")} se validan en su propio
            portal.
          </span>
        </div>
        <span className={s.portalesLogos} aria-hidden>
          {OBRAS_EXTERNAS.filter((os) => os.logo).map((os) => (
            <img key={os.slug} src={os.logo} alt="" loading="lazy" />
          ))}
        </span>
        <ArrowUpRight size={18} className={s.portalesArrow} />
      </Link>

      <p className={s.hint}>
        <Info size={15} />
        Las prestaciones autorizadas quedan cargadas en el período del mes y se rinden
        con tu facturación.
      </p>
    </div>
  );
}
