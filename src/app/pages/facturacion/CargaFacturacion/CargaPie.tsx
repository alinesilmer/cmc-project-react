import styles from "./CargaFacturacion.module.scss";
import comun from "./Comun.module.scss";
import type { CargaCtx } from "./useCargaFacturacion";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

export default function CargaPie({ ctx }: { ctx: CargaCtx }) {
  const { isEdit, guardando, resetForm, doGuardar, canGuardar } = ctx;
  return (
    <>
      <div className={styles.formFooter}>
        <BotonPlano
          type="button"
          data-field="guardar"
          className={styles.btnPrimary}
          onClick={() => doGuardar()}
          disabled={!canGuardar}
        >
          {guardando
            ? "Guardando…"
            : isEdit
              ? "Guardar cambios"
              : "Guardar (Ctrl+↵)"}
        </BotonPlano>
        {!isEdit && (
          <BotonPlano
            type="button"
            className={comun.btnGhost}
            onClick={resetForm}
            disabled={guardando}
          >
            Limpiar (Ctrl+L)
          </BotonPlano>
        )}
      </div>
    </>
  );
}
