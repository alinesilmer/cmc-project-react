"use client";
import React, { useEffect, useState } from "react";
import Lottie from "lottie-react";
import styles from "./PadronesPromptModal.module.scss";

type Props = {
  open: boolean;
  onClose: () => void;
  onGoToPadrones: () => void;
};

const PadronesPromptModal: React.FC<Props> = ({
  open,
  onClose,
  onGoToPadrones,
}) => {
  const [animData, setAnimData] = useState<object | null>(null);

  useEffect(() => {
    if (!open) return;
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
  }, [open]);

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
            <div className={styles.fallback}>📋</div>
          )}
        </div>
        <h3 className={styles.title}>¿Vas a trabajar con Obras Sociales?</h3>
        <p className={styles.msg}>
          Necesitamos que completes el formulario de padrones. Una vez listo,
          podrás acceder al resto de beneficios de la página. ¡Gracias!
        </p>
        <div className={styles.actions}>
          <button className={styles.secondary} onClick={onClose}>
            Más tarde
          </button>
          <button className={styles.primary} onClick={onGoToPadrones}>
            Completar formulario
          </button>
        </div>
      </div>
    </div>
  );
};

export default PadronesPromptModal;
