import type { ReactNode } from "react";
import { motion } from "framer-motion";
import PanelLema, { type Destacado } from "@/website/components/UI/PanelLema/PanelLema";
import styles from "./PantallaAcceso.module.scss";

export type { Destacado };

type Props = {
  /** La frase grande del panel de la derecha. */
  lema: ReactNode;
  /** Tarjetitas flotantes sobre la foto: qué se puede hacer adentro. */
  destacados: Destacado[];
  children: ReactNode;
};

/**
 * El marco de las pantallas de acceso (login y cambio de contraseña): el
 * formulario a la izquierda y el panel azul a la derecha. En el celular el
 * panel queda como franja arriba del formulario.
 */
export default function PantallaAcceso({ lema, destacados, children }: Props) {
  return (
    <div className={styles.pantalla}>
      <div className={styles.manchaUno} aria-hidden="true" />
      <div className={styles.manchaDos} aria-hidden="true" />

      <div className={styles.marco}>
        <motion.main
          className={styles.formulario}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.main>

        <PanelLema lema={lema} destacados={destacados} className={styles.visual} />
      </div>
    </div>
  );
}
