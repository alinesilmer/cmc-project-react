import type { ReactNode } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { EASE } from "../../../lib/motion";
import LineaPulso from "../LineaPulso/LineaPulso";
import styles from "./PanelLema.module.scss";

export type Destacado = { icono: LucideIcon; texto: string };

type Props = {
  /** La frase grande. Lo que va en `<em>` sale en crema. */
  lema: ReactNode;
  /** Tarjetitas flotantes sobre el círculo. */
  destacados: Destacado[];
  className?: string;
  /** Más bajo, para las páginas donde lo importante está debajo (listados). */
  compacto?: boolean;
};

/**
 * Panel azul con un círculo crema, un lema y tarjetas flotantes. Es la pieza
 * visual de las pantallas de acceso y de Socios. En pantallas chicas se reduce
 * a una franja, sin las tarjetas.
 */
export default function PanelLema({ lema, destacados, className, compacto = false }: Props) {
  return (
    <aside className={`${styles.panel} ${compacto ? styles.compacto : ""} ${className ?? ""}`} aria-hidden="true">
      <div className={styles.circulo} />
      <div className={styles.aro} />
      <div className={styles.cruces} />
      <LineaPulso className={styles.pulso} retraso={0.5} latiendo />

      <p className={styles.lema}>{lema}</p>

      <ul className={styles.destacados}>
        {destacados.map(({ icono: Icono, texto }, i) => (
          <motion.li
            key={texto}
            className={styles.destacado}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.25 + i * 0.12, ease: EASE }}
          >
            <span className={styles.destacadoIcono}>
              <Icono />
            </span>
            {texto}
          </motion.li>
        ))}
      </ul>
    </aside>
  );
}
