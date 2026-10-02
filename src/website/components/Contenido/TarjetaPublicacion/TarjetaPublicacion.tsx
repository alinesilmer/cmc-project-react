import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar } from "lucide-react";
import styles from "./TarjetaPublicacion.module.scss";
import type { Noticia } from "../../../types";
import { formatearFecha } from "../../../lib/fechas";

const PORTADA_POR_DEFECTO =
  "https://res.cloudinary.com/dcfkgepmp/image/upload/q_auto/f_auto/w_800,c_limit/v1764076138/20251125_1004_Portada_M%C3%A9dica_Moderna_simple_compose_01kaxhrn6nfm2t5ftq9htn6c9v_q4kx1d.png";

type Props = {
  publicacion: Noticia;
  /** A dónde lleva la tarjeta. */
  href: string;
};

const MotionLink = motion.create(Link);

/**
 * Tarjeta de noticia o curso. Es un enlace de verdad y no un `<article>` con
 * `role="button"`: así se puede abrir en otra pestaña, el lector de pantalla
 * la anuncia como enlace y no hay un `<button>` anidado adentro.
 */
export default function TarjetaPublicacion({ publicacion, href }: Props) {
  const portada = publicacion.portada?.trim() || PORTADA_POR_DEFECTO;

  return (
    <MotionLink
      to={href}
      className={styles.card}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      aria-label={`Leer: ${publicacion.titulo}`}
    >
      <div className={styles.imagen}>
        <img src={portada} alt="" loading="lazy" decoding="async" />
        {publicacion.badge && <span className={styles.etiqueta}>{publicacion.badge}</span>}
      </div>

      <div className={styles.cuerpo}>
        <span className={styles.fecha}>
          <Calendar aria-hidden="true" />
          {formatearFecha(publicacion.fechaCreacion)}
        </span>
        <h3 className={styles.titulo}>{publicacion.titulo}</h3>
        {publicacion.resumen && <p className={styles.resumen}>{publicacion.resumen}</p>}
        <span className={styles.leer} aria-hidden="true">
          Leer más <ArrowRight />
        </span>
      </div>
    </MotionLink>
  );
}
