import { motion, useReducedMotion } from "framer-motion";
import styles from "./LineaPulso.module.scss";

type Props = {
  className?: string;
  /** Segundos antes de empezar a dibujarse. */
  retraso?: number;
  /** Con `true`, después de dibujarse un latido recorre la línea cada tanto. */
  latiendo?: boolean;
};

// Un trazo de electrocardiograma: plano, un latido (P-QRS-T) y plano otra vez.
const TRAZO = "M0 24 H70 L78 24 L84 16 L90 24 L98 24 L104 4 L112 42 L118 24 L128 24 L136 18 L144 24 H240";

/**
 * Línea de pulso, el detalle médico del sitio: se dibuja una vez al aparecer.
 * Es decorativa: el lector de pantalla la ignora y con «reducir movimiento»
 * aparece ya dibujada.
 */
export default function LineaPulso({ className, retraso = 0.2, latiendo = false }: Props) {
  const reducido = useReducedMotion();

  return (
    <svg
      className={`${styles.linea} ${className ?? ""}`}
      viewBox="0 0 240 48"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <motion.path
        d={TRAZO}
        className={styles.trazo}
        initial={{ pathLength: reducido ? 1 : 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.4, ease: "easeInOut", delay: retraso }}
      />
      {latiendo && !reducido && (
        // Un tramo corto y brillante que corre sobre el trazo, como el punto
        // de un monitor.
        <motion.path
          d={TRAZO}
          className={styles.brillo}
          initial={{ pathLength: 0.12, pathOffset: 0, opacity: 0 }}
          animate={{ pathOffset: [0, 1], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 2.2, ease: "linear", delay: retraso + 1.6, repeat: Infinity, repeatDelay: 1.8 }}
        />
      )}
    </svg>
  );
}
