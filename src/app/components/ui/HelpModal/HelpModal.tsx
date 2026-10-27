"use client";

import type React from "react";
import styles from "./HelpModal.module.scss";
import { Lightbulb } from "lucide-react";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={handleBackdropClick}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3>¿Cómo subir documentos?</h3>
          <BotonPlano className={styles.closeButton} onClick={onClose}>
            ×
          </BotonPlano>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <div className={styles.stepContent}>
              <h4>Prepará tu documento</h4>
              <p>
                Asegurate de que tu documento esté en formato PDF y no supere
                los 10MB.
              </p>
            </div>
          </div>

          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <div className={styles.stepContent}>
              <h4>Subí el archivo</h4>
              <p>
                Hacé click en el ícono de PDF o arrastrá tu archivo PDF
                directamente.
              </p>
            </div>
          </div>

          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <div className={styles.stepContent}>
              <h4>Verificá y continuá</h4>
              <p>
                Una vez subido, verás el nombre del archivo. Podés eliminarlo y
                subir otro si es necesario.
              </p>
            </div>
          </div>

          <div className={styles.tips}>
            <h4><Lightbulb size={16} style={{ verticalAlign: "-2px" }} aria-hidden="true" /> Consejos útiles</h4>
            <ul>
              <li>Solo se aceptan archivos PDF</li>
              <li>El tamaño máximo es de 10MB</li>
              <li>Asegurate de que el documento sea legible</li>
              <li>Podés cambiar el archivo antes de enviar</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
