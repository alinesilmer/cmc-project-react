import styles from "./NomencladorPorOS.module.scss";
import { X as XIcon } from "lucide-react";
import type { PorOSCtx } from "./useNomencladorPorOS";

export default function ModalCrearCabecera({ ctx }: { ctx: PorOSCtx }) {
  const { setModalKind, selectedOS } = ctx;
  return (
    <>
      <div className={styles.modalHeader}>
        <div>
          <h2 className={styles.modalTitle}>Cargar precio</h2>
          <p className={styles.modalSubtitle}>{selectedOS?.nombre}</p>
        </div>
        <button
          className={styles.modalClose}
          onClick={() => setModalKind(null)}
        >
          <XIcon size={18} />
        </button>
      </div>
    </>
  );
}
