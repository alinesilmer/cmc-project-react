import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { EASE } from "../../../lib/motion";
import styles from "./CaminoPasos.module.scss";

type Paso = { icono: LucideIcon; palabra: string };

type Props = {
  pasos: Paso[];
  /** La frase completa para el lector de pantalla: «Entrá, abrí tu perfil y mostrala». */
  descripcion: string;
};

/** Tiempo entre un paso y el siguiente. */
const PAUSA = 0.45;

/**
 * Pasos como un camino: la línea se dibuja y cada paso se enciende al llegar.
 * El último queda latiendo, porque es a donde se llega. Cuenta un trámite con
 * una palabra por paso en vez de un párrafo.
 */
export default function CaminoPasos({ pasos, descripcion }: Props) {
  const reducido = useReducedMotion();

  return (
    <ol
      className={styles.camino}
      style={{ gridTemplateColumns: `repeat(${pasos.length}, minmax(0, 1fr))` }}
      aria-label={descripcion}
    >
      <motion.span
        className={styles.linea}
        style={{ left: `calc(100% / ${pasos.length * 2})`, right: `calc(100% / ${pasos.length * 2})` }}
        aria-hidden="true"
        initial={{ scaleX: reducido ? 1 : 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: PAUSA * (pasos.length - 1) * 1.2, ease: EASE, delay: 0.3 }}
      />
      {pasos.map(({ icono: Icono, palabra }, i) => (
        <motion.li
          key={palabra}
          className={`${styles.paso} ${i === pasos.length - 1 ? styles.final : ""}`}
          initial={{ opacity: 0, scale: reducido ? 1 : 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.3 + i * PAUSA }}
        >
          <span className={styles.nodo} aria-hidden="true">
            <Icono />
            <span className={styles.numero}>{i + 1}</span>
          </span>
          <span className={styles.palabra}>{palabra}</span>
        </motion.li>
      ))}
    </ol>
  );
}
