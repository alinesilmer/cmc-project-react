import type React from "react";
import type { LucideIcon } from "lucide-react";
import Revelar from "../Revelar/Revelar";
import styles from "./Pilares.module.scss";

export type Pilar = { icono: LucideIcon; titulo: string; texto?: string };

type Props = {
  items: Pilar[];
  /** En escritorio; en el celular siempre va una debajo de la otra. */
  columnas?: 1 | 2;
  /** `false` para lo que está arriba de todo y anima apenas se monta. */
  alVerse?: boolean;
  /** Segundos antes de que entre la primera. */
  retraso?: number;
  className?: string;
};

/**
 * Filas con ícono azul, una palabra fuerte y, si hace falta, una línea: qué hace el Colegio
 * en Nosotros, por qué asociarse en la portada.
 */
export default function Pilares({ items, columnas = 1, alVerse = true, retraso = 0, className }: Props) {
  return (
    <ul
      className={`${styles.pilares} ${className ?? ""}`}
      style={{ "--columnas": columnas } as React.CSSProperties}
    >
      {items.map(({ icono: Icono, titulo, texto }, i) => (
        <Revelar
          key={titulo}
          como="li"
          className={styles.pilar}
          distancia={14}
          retraso={retraso + i * 0.08}
          alVerse={alVerse}
        >
          <span className={styles.icono} aria-hidden="true">
            <Icono />
          </span>
          <span>
            <strong>{titulo}</strong>
            {texto}
          </span>
        </Revelar>
      ))}
    </ul>
  );
}
