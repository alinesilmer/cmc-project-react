import type { ReactNode } from "react";

import styles from "./ProgressLoader.module.scss";
import Cargando from "@/app/components/ui/Cargando/Cargando";

interface ProgressLoaderProps {
  /** Qué se está haciendo («Importando prestaciones…»). */
  title: ReactNode;
  /** Línea chica debajo del título (el destino, el archivo…). */
  subtitle?: ReactNode;
  /** Avance de 0 a 100. Sin él la barra es indeterminada (no se sabe cuánto falta). */
  percent?: number;
  /** Texto sobre la barra, a la izquierda («Validando fila 37 de 84»). Se anuncia a lectores de pantalla. */
  label?: ReactNode;
  /** Id del título, para que un diálogo lo use en `aria-labelledby`. */
  titleId?: string;
  className?: string;
}

/**
 * Loader con barra de avance: spinner + título + barra con porcentaje.
 *
 * Es sólo la parte visual: no sabe de dónde sale el avance. Quien lo usa le pasa `percent`
 * (y `label`) cada vez que cambian. Pensado para ir dentro de un modal o de una tarjeta
 * mientras corre un trabajo largo; ver `ImportarPrestaciones/ModalImportacion.tsx`.
 *
 * Respeta `prefers-reduced-motion`: el spinner gira más lento y la barra indeterminada
 * queda quieta.
 */
export default function ProgressLoader({
  title,
  subtitle,
  percent,
  label,
  titleId,
  className,
}: ProgressLoaderProps) {
  const determinada = typeof percent === "number";
  const valor = determinada ? Math.min(100, Math.max(0, Math.round(percent))) : 0;

  return (
    <div className={`${styles.root} ${className ?? ""}`}>
      <div className={styles.cabecera}>
        <Cargando size={30} className={styles.spinner} aria-hidden="true" />
        <div>
          <h2 id={titleId} className={styles.titulo}>
            {title}
          </h2>
          {subtitle && <p className={styles.subtitulo}>{subtitle}</p>}
        </div>
      </div>

      <div className={styles.avance}>
        {(label || determinada) && (
          <div className={styles.texto}>
            <span aria-live="polite">{label}</span>
            {determinada && <span>{valor} %</span>}
          </div>
        )}
        <div
          className={styles.pista}
          role="progressbar"
          aria-label={typeof title === "string" ? title : "Avance"}
          aria-valuemin={determinada ? 0 : undefined}
          aria-valuemax={determinada ? 100 : undefined}
          aria-valuenow={determinada ? valor : undefined}
        >
          <div
            className={determinada ? styles.relleno : `${styles.relleno} ${styles.indeterminada}`}
            style={determinada ? { width: `${valor}%` } : undefined}
          />
        </div>
      </div>
    </div>
  );
}
