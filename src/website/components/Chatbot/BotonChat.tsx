import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import styles from "./BotonChat.module.scss";

type Props = { idDialogo: string; onAbrir: () => void };

/** El botón flotante «CONSULTAS» que abre el asistente. */
export default function BotonChat({ idDialogo, onAbrir }: Props) {
  return (
    <motion.div
      className={styles.root}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.18 }}
    >
      <button
        type="button"
        className={styles.fab}
        onClick={onAbrir}
        aria-label="Abrir el asistente del Colegio"
        aria-haspopup="dialog"
        aria-controls={idDialogo}
      >
        <span className={styles.fabIcon}>
          <MessageCircle aria-hidden="true" />
        </span>
        <span className={styles.fabLabel}>CONSULTAS</span>
      </button>
    </motion.div>
  );
}
