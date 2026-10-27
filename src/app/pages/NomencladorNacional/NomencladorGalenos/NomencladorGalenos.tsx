import styles from "./NomencladorGalenos.module.scss";
import { AnimatePresence, motion } from "framer-motion";
import GalenoCreateModal from "./GalenoCreateModal";
import ConfirmModal from "@/app/components/ui/ConfirmModal/ConfirmModal";
import { AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";
import { useGalenos } from "./useGalenos";
import Franja from "@/app/components/layout/Franja/Franja";
import GalenosPorObraSocial from "./GalenosPorObraSocial";
import ModalEditarGaleno from "./ModalEditarGaleno";
import ModalImportarGalenos from "./ModalImportarGalenos";
import ModalHistorialGaleno from "./ModalHistorialGaleno";

export default function NomencladorGalenos() {
  const ctx = useGalenos();
  const { modalKind, setModalKind, toast, selectedOsNro, editTarget, confirmUnidades, setConfirmUnidades, historialTarget, osList, handleCreated, doActualizarUnidades } = ctx;

  return (
    <div className={styles.pagina}>
      <Franja titulo="Galenos" icono={TrendingUp} />

      {/* Obras sociales y los galenos de la elegida */}
      <GalenosPorObraSocial ctx={ctx} />

      {/* ── Modals ── */}
      <AnimatePresence>
        {/* CREATE modal — alta desde plantilla, multi-OS */}
        {modalKind === "create" && (
          <GalenoCreateModal
            osList={osList}
            initialOsNro={selectedOsNro}
            onClose={() => setModalKind(null)}
            onCreated={handleCreated}
          />
        )}

        {/* EDIT modal */}
        {modalKind === "edit" && editTarget && (
          <ModalEditarGaleno ctx={ctx} editTarget={editTarget} />
        )}

        {/* IMPORT modal */}
        {modalKind === "import" && (
          <ModalImportarGalenos ctx={ctx} />
        )}

        {/* HISTORIAL modal */}
        {modalKind === "historial" && historialTarget && (
          <ModalHistorialGaleno ctx={ctx} historialTarget={historialTarget} />
        )}
      </AnimatePresence>

      {/* Confirm actualizar_unidades */}
      <ConfirmModal
        isOpen={confirmUnidades}
        variant="warning"
        title="Confirmar actualización de unidades"
        message={`Esta operación pisará las unidades de TODOS los componentes activos que usan el galeno "${editTarget?.nombre}"${editTarget?.nivel != null ? ` (Nivel ${editTarget.nivel})` : ""}, incluso overrides cargados a mano.\n\n¿Continuar?`}
        confirmLabel="Actualizar"
        onConfirm={doActualizarUnidades}
        onCancel={() => setConfirmUnidades(false)}
      />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className={`${styles.toast} ${toast.type === "success" ? styles.toastSuccess : styles.toastError}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
          >
            {toast.type === "success" ? (
              <CheckCircle2 size={15} />
            ) : (
              <AlertCircle size={15} />
            )}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
