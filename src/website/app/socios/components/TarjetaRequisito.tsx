import { motion } from "framer-motion";
import { AlertTriangle, Info } from "lucide-react";
import Acordeon from "../../../components/UI/Acordeon/Acordeon";
import type { Requisito } from "../socios.data";
import styles from "./TarjetaRequisito.module.scss";

const CLASES = {
  raiz: styles.tarjeta,
  raizAbierta: styles.abierta,
  cabecera: styles.cabecera,
  chevron: styles.chevron,
  chevronAbierto: styles.chevronAbierto,
  cuerpo: styles.detalle,
};

const aparecer = {
  hidden: { opacity: 0, y: 14, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 320, damping: 26 } },
};

/**
 * Un requisito: ícono y dos o tres palabras. El texto completo —con la
 * aclaración, si la hay— aparece recién al tocarla.
 */
export default function TarjetaRequisito({ item }: { item: Requisito }) {
  const Icono = item.icono;
  const importante = item.tags?.includes("importante");

  return (
    <motion.li variants={aparecer}>
      <Acordeon
        clases={CLASES}
        cabecera={
          <>
            <span className={styles.icono} aria-hidden="true">
              <Icono />
            </span>
            <span className={styles.nombre}>{item.corto}</span>
            {importante && (
              <span className={styles.importante} title="Importante">
                <AlertTriangle aria-hidden="true" />
                <span className={styles.srOnly}>Importante</span>
              </span>
            )}
          </>
        }
      >
        <p className={styles.texto}>{item.text}</p>
        {item.hint && (
          <p className={styles.hint}>
            <Info aria-hidden="true" />
            {item.hint}
          </p>
        )}
      </Acordeon>
    </motion.li>
  );
}
