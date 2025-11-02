"use client";
import React, { useEffect, useState } from "react";
import Lottie from "lottie-react";
import styles from "./AdherentePromptModal.module.scss";

type Props = {
  open: boolean;
  onClose: () => void;
  onGoAdherente: () => void;
  title?: string;
  message?: string;
  animationData?: object;
};

const AdherentePromptModal: React.FC<Props> = ({
  open,
  onClose,
  onGoAdherente,
  title,
  message,
  animationData,
}) => {
  const [animData, setAnimData] = useState<object | null>(
    animationData || null
  );

  useEffect(() => {
    if (!open || animationData) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/animations/choice.json");
        if (!res.ok) throw new Error();
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

  return (
    <div
      className={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={styles.modal}>
        <button className={styles.close} onClick={onClose} aria-label="Cerrar">
          ×
        </button>
        <div className={styles.animWrap}>
          {animData ? (
            <Lottie
              animationData={animData}
              loop={false}
              autoplay
              style={{ width: 140, height: 140 }}
            />
          ) : (
            <div className={styles.fallback}>✨</div>
          )}
        </div>
        <h3 className={styles.title}>
          {title || "¿Querés ser Socio Adherente?"}
        </h3>
        <p className={styles.msg}>
          {message ||
            "Podés ir a un formulario más corto ahora o seguir con el registro completo."}
        </p>
        <div className={styles.actions}>
          <button className={styles.secondary} onClick={onClose}>
            Seguir con registro
          </button>
          <button className={styles.primary} onClick={onGoAdherente}>
            Quiero ser socio adherente
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdherentePromptModal;
