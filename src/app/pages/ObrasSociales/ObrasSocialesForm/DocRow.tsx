import { useRef, useState } from "react";
import { Camera, X, FileText, Trash2 } from "lucide-react";
import { deleteDocumento } from "../obrasSociales.api";
import { TIPO_DOCUMENTO_LABELS } from "../obrasSociales.types";
import type { TipoDocumento, Documento } from "../obrasSociales.types";
import { abrirAdjunto } from "@/app/shared/lib/archivos";
import { useNotify } from "@/app/hooks/useNotify";
import s from "./ObrasSocialesForm.module.scss";
import { DOC_ACCEPT, validateDocFile } from "./documentos.helpers";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

// ─── Document row (fixed types) ───────────────────────────────────────────────

export interface DocRowProps {
  obraId?: number;
  tipo: TipoDocumento;
  existing?: Documento;
  onUploaded: () => void;
  onQueue: (tipo: TipoDocumento, files: File[]) => void;
  onRemoveQueued: (tipo: TipoDocumento, index: number) => void;
  queued?: File[];
}

export function DocRow({
  obraId,
  tipo,
  existing,
  onUploaded,
  onQueue,
  onRemoveQueued,
  queued,
}: DocRowProps) {
  const [deleting, setDeleting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const notify = useNotify();

  const clearInputs = () => {
    if (inputRef.current) inputRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  };

  const handleDelete = async () => {
    if (!obraId || !existing) return;
    setDeleting(true);
    setUploadError(null);
    try {
      await deleteDocumento(obraId, existing.id);
      onUploaded();
    } catch {
      setUploadError("No se pudo eliminar el documento.");
    } finally {
      setDeleting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(e.target.files ?? []);
    if (!fileList.length) return;
    for (const f of fileList) {
      const err = validateDocFile(f);
      if (err) { setUploadError(err); return; }
    }
    setUploadError(null);
    // Alta y edición se comportan igual: lo elegido queda encolado y se sube al guardar.
    onQueue(tipo, fileList);
    clearInputs();
  };

  const removeFile = (index: number) => {
    onRemoveQueued(tipo, index);
    clearInputs();
  };

  return (
    <div className={s.docRow}>
      <div className={s.docHeader}>
        <span className={s.docTipo}>
          <FileText size={14} aria-hidden="true" />
          {TIPO_DOCUMENTO_LABELS[tipo]}
        </span>
        {existing && <span className={s.docActiveBadge}>Archivo activo</span>}
      </div>

      {existing && (
        <div className={s.existingFileRow}>
          <BotonPlano
            type="button"
            className={s.docFileLink}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit", textAlign: "left" }}
            onClick={() => abrirAdjunto(existing.url).catch((e) => notify.error(e.message))}
          >
            {TIPO_DOCUMENTO_LABELS[tipo]}
          </BotonPlano>
          <BotonPlano
            type="button"
            className={s.docHistoryBtn}
            onClick={handleDelete}
            disabled={deleting}
            aria-label="Eliminar documento"
            title="Eliminar documento"
          >
            <Trash2 size={13} />
            {deleting ? "Eliminando…" : "Eliminar"}
          </BotonPlano>
        </div>
      )}

      <div className={s.uploadArea}>
        <div className={s.uploadInputRow}>
          <input
            ref={inputRef}
            type="file"
            accept={DOC_ACCEPT}
            multiple
            onChange={handleFileChange}
            className={s.fileInput}
            aria-label={`Seleccionar archivo para ${TIPO_DOCUMENTO_LABELS[tipo]}`}
          />
          <label className={s.cameraBtn}>
            <Camera size={14} aria-hidden="true" />
            Tomar foto
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
          </label>
        </div>

        {queued && queued.length > 0 && (
          <div className={s.queuedFileList}>
            {queued.map((f, i) => (
              <div key={i} className={s.queuedFile}>
                <span className={s.queuedFileName}>{f.name}</span>
                <span className={s.queuedNote}>Se subirá al guardar</span>
                <BotonPlano
                  type="button"
                  className={s.contactoRemoveBtn}
                  onClick={() => removeFile(i)}
                  aria-label="Quitar archivo"
                >
                  <X size={14} />
                </BotonPlano>
              </div>
            ))}
          </div>
        )}

        {uploadError && (
          <span className={s.fieldError} role="alert">{uploadError}</span>
        )}
      </div>
    </div>
  );
}
