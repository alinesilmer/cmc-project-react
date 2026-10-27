import styles from "./NomencladorPorOS.module.scss";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import { Save } from "lucide-react";
import type { PorOSCtx } from "./useNomencladorPorOS";

export default function ModalCrearPie({ ctx }: { ctx: PorOSCtx }) {
  const { setModalKind, saving, parCargando, replicaTerminada, bloqueadoPorAlta, replicaActiva, handleSave } = ctx;
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
              Cancelar
            </button>
            <button
              className={styles.btnPrimary}
              onClick={handleSave}
              disabled={saving || parCargando || bloqueadoPorAlta}
            >
              {saving ? (
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
          </>
        )}
      </div>
    </>
  );
}
