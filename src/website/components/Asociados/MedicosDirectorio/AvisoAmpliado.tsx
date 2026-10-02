import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ImageOff, X } from "lucide-react";
import { useModal } from "../../../hooks/useModal";
import { iniciales, nombreDe } from "./avisos";
import type { PubAd } from "../../../lib/ads.client";
import styles from "./AvisoAmpliado.module.scss";

type Props = {
  /** Los avisos que se ven en la grilla (ya filtrados por la búsqueda). */
  avisos: PubAd[];
  indice: number;
  onCambiar: (indice: number) => void;
  onCerrar: () => void;
};

/**
 * El aviso de un médico a tamaño completo. Con las flechas (o ← →) se pasa al
 * siguiente sin cerrar: así se recorren los avisos como una galería.
 */
export default function AvisoAmpliado({ avisos, indice, onCambiar, onCerrar }: Props) {
  const cerrarRef = useRef<HTMLButtonElement>(null);
  useModal(true, onCerrar);

  const ad = avisos[indice];
  const nombre = nombreDe(ad);
  const total = avisos.length;
  const anterior = () => onCambiar((indice - 1 + total) % total);
  const siguiente = () => onCambiar((indice + 1) % total);

  useEffect(() => {
    cerrarRef.current?.focus();
  }, []);

  // Ref para no reinstalar el listener en cada cambio de aviso.
  const mover = useRef({ anterior, siguiente });
  mover.current = { anterior, siguiente };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") mover.current.anterior();
      if (e.key === "ArrowRight") mover.current.siguiente();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return createPortal(
    <motion.div
      className={styles.fondo}
      onClick={onCerrar}
      role="presentation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className={styles.dialogo}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Aviso de ${nombre}`}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        <button ref={cerrarRef} type="button" className={styles.cerrar} onClick={onCerrar} aria-label="Cerrar">
          <X aria-hidden="true" />
        </button>

        <div className={styles.media}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={ad.id}
              className={styles.imagen}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {ad.adjunto_path ? (
                <img src={ad.adjunto_path} alt={`Aviso de ${nombre}`} decoding="async" />
              ) : (
                <ImageOff aria-hidden="true" className={styles.sinImagen} />
              )}
            </motion.div>
          </AnimatePresence>

          {total > 1 && (
            <>
              <button type="button" className={`${styles.flecha} ${styles.izquierda}`} onClick={anterior} aria-label="Aviso anterior">
                <ChevronLeft aria-hidden="true" />
              </button>
              <button type="button" className={`${styles.flecha} ${styles.derecha}`} onClick={siguiente} aria-label="Aviso siguiente">
                <ChevronRight aria-hidden="true" />
              </button>
            </>
          )}
        </div>

        <div className={styles.pie}>
          <span className={styles.iniciales} aria-hidden="true">
            {iniciales(nombre)}
          </span>
          <span className={styles.datos}>
            <strong>{nombre}</strong>
            {total > 1 && (
              <span>
                {indice + 1} / {total}
              </span>
            )}
          </span>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
