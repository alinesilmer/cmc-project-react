import ActionModal from "@/app/components/ui/ActionModal/ActionModal";
import { useNotify } from "@/app/hooks/useNotify";
import { clearMedicoAttach, deleteMedicoDocumento } from "../api";
import styles from "../DoctorProfilePage.module.scss";
import {
  ATTACH_KEYS,
  DEFAULT_LABELS,
  formatOption,
  normalizeForCompare,
  prettyFromAnyLabel,
  stripAttach,
  mensajeDe,
} from "./legajo.helpers";
import type { LegajoDocumentos } from "./useLegajoDocumentos";

type Props = { medicoId: string; documentos: LegajoDocumentos };

export default function ModalesDocumentos({ medicoId, documentos }: Props) {
  const notify = useNotify();
  const { docOpen, setDocOpen, docLabel, setDocLabel, docCustom, setDocCustom, docFile, setDocFile, labelOptions, replaceOpen, setReplaceOpen, replacePretty, setPendingUpload, delDocOpen, setDelDocOpen, docToDelete, setDocToDelete, reloadDocs, tryUploadDocumento, handleConfirmReplace } = documentos;

  return (
    <>
      <ActionModal
        open={docOpen}
        onClose={() => setDocOpen(false)}
        size="sm"
        title="Agregar documento"
        confirmText="Subir"
        confirmDisabled={!docFile || (docLabel === "otro" && !docCustom.trim())}
        onConfirm={async () => {
          try {
            await tryUploadDocumento();
            notify.success(
              "Documento agregado",
              "El archivo se subió correctamente."
            );
          } catch (e: unknown) {
            notify.error("No se pudo agregar el documento", mensajeDe(e));
            throw e;
          }
        }}
      >
        <div className={styles.rsField}>
          <label>Tipo de documento</label>
          <select
            className={styles.select}
            value={docLabel}
            onChange={(e) => setDocLabel(e.target.value)}
          >
            {(labelOptions || DEFAULT_LABELS).map((l) => (
              <option key={l} value={l}>
                {formatOption(l)}
              </option>
            ))}
          </select>
        </div>

        {docLabel === "otro" && (
          <div className={styles.rsField}>
            <label>Descripción (label)</label>
            <input
              className={styles.input}
              value={docCustom}
              onChange={(e) => setDocCustom(e.target.value)}
              placeholder="Ej: constancia_especial"
            />
            <small className={styles.muted}>
              Se guardará como etiqueta{" "}
              <code>
                {docCustom.trim().toLowerCase().replace(/\s+/g, "_") ||
                  "constancia_especial"}
              </code>
            </small>
          </div>
        )}

        <div className={styles.rsField}>
          <label>Archivo</label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </ActionModal>

      <ActionModal
        open={replaceOpen}
        onClose={() => {
          setReplaceOpen(false);
          setPendingUpload(null);
        }}
        size="xs"
        title="Reemplazar documento"
        confirmText="Reemplazar"
        onConfirm={async () => {
          try {
            await handleConfirmReplace();
            notify.success("Documento reemplazado", "Se actualizó el archivo.");
          } catch (e: unknown) {
            notify.error("No se pudo reemplazar el documento", mensajeDe(e));
            throw e;
          }
        }}
      >
        <p style={{ lineHeight: 1.5 }}>
          Ya existe un documento del tipo <strong>{replacePretty}</strong>. Si
          continuás, el archivo actual será <strong>reemplazado</strong>.
        </p>
        <p>¿Querés continuar?</p>
      </ActionModal>

      <ActionModal
        open={delDocOpen}
        onClose={() => setDelDocOpen(false)}
        size="xs"
        title="Eliminar documento"
        confirmText="Eliminar"
        onConfirm={async () => {
          if (!docToDelete) return;
          try {
            const normalized = normalizeForCompare(docToDelete.label);
            const attachKey = ATTACH_KEYS.find(
              (k) => stripAttach(k) === normalized
            );
            if (attachKey) {
              await clearMedicoAttach(medicoId, attachKey);
            }
            await deleteMedicoDocumento(medicoId, docToDelete.id);
            await reloadDocs();
            setDocToDelete(null);
            notify.success("Documento eliminado");
          } catch (e: unknown) {
            notify.error("No se pudo eliminar el documento", mensajeDe(e));
            throw e;
          }
        }}
      >
        <p>
          ¿Seguro que querés eliminar{" "}
          <strong>
            {docToDelete
              ? prettyFromAnyLabel(docToDelete.label)
              : "este documento"}
          </strong>
          ?
        </p>
      </ActionModal>
    </>
  );
}
