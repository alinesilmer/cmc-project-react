import styles from "./NomencladorPorOS.module.scss";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import { Save } from "lucide-react";
import type { PorOSCtx } from "./useNomencladorPorOS";

export default function ModalEditarPie({ ctx }: { ctx: PorOSCtx }) {
  const { setModalKind, savingMeta, editMode, replicaTerminada, replicaActiva, handleSaveNucleo } = ctx;
  return (
    <>
      <div className={styles.modalFooter}>
        {replicaTerminada ? (
          <button
            className={styles.btnPrimary}
            onClick={() => setModalKind(null)}
          >
            Cerrar
          </button>
        ) : (
          <>
            <button
              className={styles.btnGhost}
              onClick={() => setModalKind(null)}
            >
              {editMode === "nucleo" ? "Cancelar" : "Cerrar"}
            </button>
            {editMode === "nucleo" && (
              <button
                className={styles.btnPrimary}
                onClick={handleSaveNucleo}
                disabled={savingMeta}
              >
                {savingMeta ? (
                  <>
                    <Cargando size={14} /> Guardando…
                  </>
                ) : (
                  <>
                    <Save size={15} />{" "}
                    {replicaActiva ? "Guardar y replicar" : "Guardar"}
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </>
  );
}
