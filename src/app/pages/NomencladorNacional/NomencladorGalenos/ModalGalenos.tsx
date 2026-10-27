import type { ReactNode } from "react";
import { X as XIcon } from "lucide-react";
import styles from "./NomencladorGalenos.module.scss";
import MarcoModal from "@/app/components/ui/MarcoModal/MarcoModal";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

// ─── Modal sub-component ──────────────────────────────────────────────────────

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <MarcoModal className={`${styles.modal} ${wide ? styles.modalWide : ""}`}>
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>{title}</h2>
            {subtitle && <p className={styles.modalSubtitle}>{subtitle}</p>}
          </div>
          <BotonPlano className={styles.modalClose} onClick={onClose}>
            <XIcon size={18} />
          </BotonPlano>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </MarcoModal>
  );
}
