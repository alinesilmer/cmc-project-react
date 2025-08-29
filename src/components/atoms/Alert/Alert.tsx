"use client";

import { motion } from "framer-motion";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import styles from "./Alert.module.scss";
import Button from "../Button/Button";

interface AlertProps {
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  onClose?: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  showActions?: boolean;
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

export default function Alert({
  type,
  title,
  message,
  onClose,
  onConfirm,
  onCancel,
  confirmLabel = "Sí",
  cancelLabel = "No",
  showActions = false,
}: AlertProps) {
  const Icon = icons[type];

  return (
    <div className={styles.backdrop}>
      <motion.div
        className={`${styles.alert} ${styles[type]}`}
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="alert-title"
        aria-describedby="alert-message"
      >
        <Button
          variant="ghost"
          className={styles.closeIcon}
          onClick={onClose}
          aria-label="Cerrar"
        >
          <X size={15} />
        </Button>

        <div className={styles.content}>
          <div className={styles.icon}>
            <Icon size="sm" />
          </div>
          <div className={styles.text}>
            <h4 id="alert-title" className={styles.title}>
              {title}
            </h4>
            <p id="alert-message" className={styles.message}>
              {message}
            </p>
          </div>
        </div>

        {showActions && (
          <div className={styles.actions}>
            <Button size="sm" variant="secondary" onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button size="sm" variant="danger" onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
