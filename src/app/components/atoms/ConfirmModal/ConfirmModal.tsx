import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Trash2, Info } from "lucide-react";
import styles from "./ConfirmModal.module.scss";

export type ConfirmVariant = "danger" | "warning" | "info";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

const ICON = {
  danger:  <Trash2 size={20} />,
  warning: <AlertTriangle size={20} />,
  info:    <Info size={20} />,
};

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onCancel}
        >
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ duration: 0.16 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={styles.header}>
              <span className={`${styles.iconWrap} ${styles[`iconWrap${capitalize(variant)}`]}`}>
                {ICON[variant]}
              </span>
              <h2 className={styles.title}>{title}</h2>
            </div>
            <p className={styles.body}>{message}</p>
            <div className={styles.footer}>
              <button className={styles.btnCancel} onClick={onCancel}>
                {cancelLabel}
              </button>
              <button
                className={`${styles.btnConfirm} ${styles[`btnConfirm${capitalize(variant)}`]}`}
                onClick={onConfirm}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
