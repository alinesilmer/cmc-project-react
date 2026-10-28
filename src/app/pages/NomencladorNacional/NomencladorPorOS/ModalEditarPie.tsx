import styles from "./NomencladorPorOS.module.scss";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import { Save } from "lucide-react";
import type { PorOSCtx } from "./useNomencladorPorOS";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

export default function ModalEditarPie({ ctx }: { ctx: PorOSCtx }) {
  const { setModalKind, savingMeta, editMode, replicaTerminada, replicaActiva, handleSaveNucleo } = ctx;
  return (
    <>
      <div className={styles.modalFooter}>
        {replicaTerminada ? (
          <BotonPlano
            className={styles.btnPrimary}
            onClick={() => setModalKind(null)}
          >
            Cerrar
          </BotonPlano>
        ) : (
          <>
            <BotonPlano
              className={styles.btnGhost}
              onClick={() => setModalKind(null)}
            >
              {editMode === "nucleo" ? "Cancelar" : "Cerrar"}
            </BotonPlano>
            {editMode === "nucleo" && (
              <BotonPlano
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
              </BotonPlano>
            )}
          </>
        )}
      </div>
    </>
  );
}
