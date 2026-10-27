import React from "react";
import { X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import styles from "./ConfirmActionModal.module.scss";
import MarcoModal from "@/app/components/ui/MarcoModal/MarcoModal";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

interface Props {
  isOpen: boolean;
  icon: LucideIcon;
  variant?: "danger" | "primary";
  title: string;
  message: React.ReactNode;
  warning?: React.ReactNode;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

const ConfirmActionModal: React.FC<Props> = ({
  isOpen, icon: Icon, variant = "primary", title, message, warning, confirmLabel, onClose, onConfirm, loading,
}) => (
  <>
    {isOpen && (
      <MarcoModal onClose={onClose} className={styles.modal}>
          <div className={styles.header}>
            <span className={`${styles.headerIcon} ${variant === "danger" ? styles.headerIconDanger : ""}`}>
              <Icon size={18} />
            </span>
            <h2 className={styles.title}>{title}</h2>
            <BotonPlano type="button" className={styles.closeBtn} onClick={onClose} aria-label="Cerrar" disabled={loading}>
              <X size={16} />
            </BotonPlano>
          </div>

          <div className={styles.body}>
            <div className={styles.message}>{message}</div>
            {warning && <div className={styles.warningBox}>{warning}</div>}
          </div>

          <div className={styles.footer}>
            <BotonPlano type="button" className={styles.btnGhost} onClick={onClose} disabled={loading}>
              Cancelar
            </BotonPlano>
            <BotonPlano
              type="button"
              className={variant === "danger" ? styles.btnDanger : styles.btnPrimary}
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? "Procesando…" : confirmLabel}
            </BotonPlano>
          </div>
        </MarcoModal>
    )}
  </>
);

export default ConfirmActionModal;
