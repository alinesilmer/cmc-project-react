"use client";

import type React from "react";
import { useState } from "react";
import HelpModal from "../HelpModal/HelpModal";
import styles from "./HelpButton.module.scss";

const HelpButton: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        className={styles.helpButton}
        onClick={() => setIsModalOpen(true)}
        type="button"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M11,18H13V16H11V18M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20C7.59,20 4,16.41 4,12C7.59,4 4,12A10,10 0 0,0 12,2Z" />
          <path d="M12,6A4,4 0 0,0 8,10H10A2,2 0 0,1 12,8A2,2 0 0,1 14,10C14,12 11,11.75 11,15H13C13,12.75 16,12.5 16,10A4,4 0 0,0 12,6Z" />
        </svg>
        ¿Cómo subir documentos?
      </button>

      <HelpModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export default HelpButton;
