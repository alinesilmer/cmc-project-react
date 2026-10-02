import type React from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { CalendarClock, MapPin, Tag, X } from "lucide-react";
import { useModal } from "../../../hooks/useModal";
import { formatearFechaISO } from "../../../lib/fechas";
import type { BeneficioPublico } from "../../../lib/beneficios.client";
import { largoDescuento } from "../descuento";
import styles from "./DetalleBeneficio.module.scss";

type Props = {
  beneficio: BeneficioPublico;
  /** El mismo color de la tarjeta: `--acento` y `--sobre-acento`. */
  colores?: React.CSSProperties;
  onCerrar: () => void;
};

/** El beneficio completo, para cuando el texto no entra en la tarjeta. */
export default function DetalleBeneficio({ beneficio: b, colores, onCerrar }: Props) {
  useModal(true, onCerrar);
  const vigencia = formatearFechaISO(b.vigencia_hasta);

  return createPortal(
    <motion.div
      className={styles.fondo}
      onClick={onCerrar}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.article
        className={styles.ventana}
        style={colores}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`beneficio-${b.id}`}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        <header className={styles.banda}>
          <span className={styles.descuento} data-largo={largoDescuento(b.descuento)}>
            {b.descuento ?? <Tag aria-hidden="true" />}
          </span>
          <button type="button" className={styles.cerrar} onClick={onCerrar} aria-label="Cerrar" autoFocus>
            <X aria-hidden="true" />
          </button>
        </header>

        <div className={styles.cuerpo}>
          <span className={styles.categoria}>{b.categoria}</span>
          <h2 id={`beneficio-${b.id}`} className={styles.titulo}>
            {b.titulo}
          </h2>
          <p className={styles.texto}>{b.descripcion}</p>

          {(b.ubicacion || vigencia) && (
            <footer className={styles.meta}>
              {b.ubicacion && (
                <span>
                  <MapPin aria-hidden="true" />
                  {b.ubicacion}
                </span>
              )}
              {vigencia && (
                <span>
                  <CalendarClock aria-hidden="true" />
                  Hasta el {vigencia}
                </span>
              )}
            </footer>
          )}
        </div>
      </motion.article>
    </motion.div>,
    document.body
  );
}
