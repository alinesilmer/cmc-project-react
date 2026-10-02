import { useEffect, useState } from "react";
import { MapPin, ExternalLink } from "lucide-react";
import { CONTACTO } from "../../lib/contacto";
import styles from "./MapaSede.module.scss";

const MAPA_EMBEBIDO =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3540.1035993211517!2d-58.8279958!3d-27.466033900000003!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94456ca75442b0d5%3A0x6579bf31d9d171fc!2sColegio%20M%C3%A9dico%20de%20Corrientes!5e0!3m2!1ses!2sar!4v1761223450529!5m2!1ses!2sar";

/** Si el mapa no cargó en este tiempo, casi seguro lo bloqueó una extensión. */
const ESPERA_MS = 8_000;

/** Mapa de la sede, con un aviso si un bloqueador no lo deja cargar. */
export default function MapaSede() {
  const [cargado, setCargado] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);

  useEffect(() => {
    if (cargado) return;
    const t = setTimeout(() => setBloqueado(true), ESPERA_MS);
    return () => clearTimeout(t);
  }, [cargado]);

  return (
    <div className={styles.mapWrap}>
      {bloqueado ? (
        <div className={styles.mapFallback}>
          <MapPin size={28} className={styles.mapFallbackIcon} aria-hidden="true" />
          <p className={styles.mapFallbackText}>El mapa no pudo cargarse (puede estar bloqueado por una extensión).</p>
        </div>
      ) : (
        <iframe
          className={styles.mapIframe}
          src={MAPA_EMBEBIDO}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Mapa — Colegio Médico de Corrientes"
          onLoad={() => setCargado(true)}
        />
      )}

      <a href={CONTACTO.mapa} target="_blank" rel="noopener noreferrer" className={styles.mapChip}>
        <ExternalLink size={13} aria-hidden="true" />
        Cómo llegar
      </a>
    </div>
  );
}
