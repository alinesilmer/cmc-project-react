"use client";

import React, { useEffect } from "react";
import styles from "./SuccessModal.module.scss";

type SuccessModalProps = {
  open: boolean;
  onClose: () => void;
  name?: string;
  title?: string;
  message?: string;
};

const SuccessModal: React.FC<SuccessModalProps> = ({
  open,
  onClose,
  name,
  title,
  message,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const defaultTitle = title || "¡Solicitud enviada con éxito!";
  const defaultMsg =
    message ||
    "Recibirás un email de confirmación y nuestro equipo revisará tu alta a la brevedad.";

  return (
    <div
      className={styles.modalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="success-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal} role="document">
        <button
          type="button"
          aria-label="Cerrar"
          className={styles.modalClose}
          onClick={onClose}
        >
          ×
        </button>

        <div className={styles.successAnim}>
          <svg
            className={styles.successIcon}
            viewBox="0 0 120 120"
            aria-hidden="true"
          >
            <circle
              className={styles.successCircle}
              cx="60"
              cy="60"
              r="46"
              fill="none"
            />
            <path
              className={styles.successCheck}
              d="M40 62 L54 74 L82 46"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className={styles.modalBody}>
          <h3 id="success-title">{defaultTitle}</h3>
          <p>
            {name ? (
              <>
                Gracias, <strong>{name}</strong>.{" "}
              </>
            ) : null}
            {defaultMsg}
          </p>
        </div>

        <div className={styles.modalActions}>
          <button className={styles.modalPrimary} onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;
