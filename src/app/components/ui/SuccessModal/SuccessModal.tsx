"use client";

import React, { useEffect, useState } from "react";
import Lottie from "lottie-react";
import styles from "./SuccessModal.module.scss";

type SuccessModalProps = {
  open: boolean;
  onClose: () => void;
  name?: string;
  title?: string;
  message?: string;
  animationData?: object;
};

const SuccessModal: React.FC<SuccessModalProps> = ({
  open,
  onClose,
  name,
  title,
  message,
  animationData,
}) => {
  const [animData, setAnimData] = useState<object | null>(
    animationData || null
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || animationData) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/animations/success.json");
        if (!res.ok) throw new Error("Animation not found");
        const json = await res.json();
        if (!cancelled) setAnimData(json);
      } catch {
        setAnimData(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, animationData]);

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
          {animData ? (
            <Lottie
              animationData={animData}
              loop={false}
              autoplay
              style={{ width: 140, height: 140 }}
            />
          ) : (
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
          )}
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
