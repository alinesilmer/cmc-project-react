import type React from "react";
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

/** Línea de pulso, el detalle médico del sitio: se dibuja una vez al aparecer. */
export default function LineaPulso({ className, retraso = 0.2, latiendo = false }: Props) {
  return (
    <svg
      className={`${styles.linea} ${className ?? ""}`}
      style={{ "--lp-retraso": `${retraso}s` } as React.CSSProperties}
      viewBox="0 0 240 48"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d={TRAZO} pathLength={1} className={styles.trazo} />
      {latiendo && (
        // Un tramo corto y brillante que corre sobre el trazo, como el punto de un monitor.
        <path d={TRAZO} pathLength={1} className={styles.brillo} />
      )}
    </svg>
  );
}
