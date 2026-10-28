import styles from "./NomencladorPorOS.module.scss";
import { origenBadgeLabel } from "./porOS.helpers";
import { X as XIcon } from "lucide-react";
import type { PorOSCtx } from "./useNomencladorPorOS";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

export default function ModalEditarCabecera({ ctx, editTarget }: { ctx: PorOSCtx; editTarget: NonNullable<PorOSCtx["editTarget"]> }) {
  const { setModalKind, editMode, espMap } = ctx;
  return (
    <>
      <div className={styles.modalHeader}>
        <div>
          <h2 className={styles.modalTitle}>
            Editar —{" "}
            <span className={styles.codeCell}>{editTarget.codigo}</span>
            {editMode === "nucleo" ? " (código)" : ""}
          </h2>
          <p className={styles.modalSubtitle}>
            {origenBadgeLabel(editTarget.origen)}
            {editTarget.especialidad_id_colegio
              ? ` · ${espMap[editTarget.especialidad_id_colegio] ?? `Esp. ${editTarget.especialidad_id_colegio}`}`
              : ""}
            {editTarget.nivel != null
              ? ` · Niv. ${editTarget.nivel}`
              : ""}
          </p>
        </div>
        <BotonPlano
          className={styles.modalClose}
          onClick={() => setModalKind(null)}
        >
          <XIcon size={18} />
        </BotonPlano>
      </div>
    </>
  );
}
