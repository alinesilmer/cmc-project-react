import { useEffect, useState } from "react";
import { Camera, X, FileText, Plus, Trash2 } from "lucide-react";
import { deleteDocumento } from "../obrasSociales.api";
import type { Documento } from "../obrasSociales.types";
import { abrirAdjunto } from "@/app/shared/lib/archivos";
import { useNotify } from "@/app/hooks/useNotify";
import s from "./ObrasSocialesForm.module.scss";
import { DOC_ACCEPT, validateDocFile } from "./documentos.helpers";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

// ─── Otros documents — dynamic list ──────────────────────────────────────────

export interface OtroEntry {
  tempId: string;
  nombreCustom: string;
  file?: File;
  existing?: Documento;
  uploadError?: string;
}

export interface OtrosDocListProps {
  obraId?: number;
  existingDocs: Documento[];
  onReload: () => void;
  onQueueChange: (entries: Array<{ nombreCustom: string; file: File }>) => void;
}

export function OtrosDocList({ obraId, existingDocs, onReload, onQueueChange }: OtrosDocListProps) {
  const [entries, setEntries] = useState<OtroEntry[]>(() =>
    existingDocs.map((d) => ({
      tempId: String(d.id),
      nombreCustom: d.nombre_custom ?? "",
      existing: d,
    }))
  );
  const notify = useNotify();

  // Al recargar los documentos del servidor se conservan las filas con archivo pendiente: si no, borrar un documento existente te vaciaba la cola visible.
  useEffect(() => {
    setEntries((prev) => [
      ...existingDocs.map((d) => ({
        tempId: String(d.id),
        nombreCustom: d.nombre_custom ?? "",
        existing: d,
      })),
      ...prev.filter((e) => !e.existing && e.file),
    ]);
  }, [existingDocs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sin el nombre escrito el archivo igual se sube: cae el nombre del archivo.
  const notifyQueue = (updated: OtroEntry[]) => {
    onQueueChange(
      updated
        .filter((e) => e.file)
        .map((e) => ({
          nombreCustom: e.nombreCustom.trim() || e.file!.name,
          file: e.file!,
        }))
    );
  };

  const updateEntry = (tempId: string, patch: Partial<OtroEntry>) => {
    setEntries((prev) => {
      const next = prev.map((e) => (e.tempId === tempId ? { ...e, ...patch } : e));
      notifyQueue(next);
      return next;
    });
  };

  const addEntry = () => {
    setEntries((prev) => [
      ...prev,
      { tempId: crypto.randomUUID(), nombreCustom: "" },
    ]);
  };

  const removeEntry = (tempId: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.tempId !== tempId);
      notifyQueue(next);
      return next;
    });
  };

  const handleDeleteExisting = async (entry: OtroEntry) => {
    if (!obraId || !entry.existing) return;
    try {
      await deleteDocumento(obraId, entry.existing.id);
      onReload();
    } catch {
      updateEntry(entry.tempId, { uploadError: "No se pudo eliminar el documento." });
    }
  };

  const handleFileChange = (tempId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(e.target.files ?? []);
    if (!fileList.length) return;

    for (const f of fileList) {
      const err = validateDocFile(f);
      if (err) { updateEntry(tempId, { uploadError: err }); return; }
    }

    // First file goes to the current entry
    updateEntry(tempId, { file: fileList[0], uploadError: undefined });

    // Each additional file becomes a new entry
    if (fileList.length > 1) {
      setEntries((prev) => {
        const newEntries: OtroEntry[] = fileList.slice(1).map((f) => ({
          tempId: crypto.randomUUID(),
          nombreCustom: "",
          file: f,
        }));
        const next = [...prev, ...newEntries];
        notifyQueue(next);
        return next;
      });
    }
  };

  return (
    <div className={s.otrosDocList}>
      {entries.map((entry) => (
        <div key={entry.tempId} className={s.docRow}>
          <div className={s.docHeader}>
            <span className={s.docTipo}>
              <FileText size={14} aria-hidden="true" />
              Documento personalizado
            </span>
            {entry.existing && <span className={s.docActiveBadge}>Archivo activo</span>}
            {!entry.existing && (
              <BotonPlano
                type="button"
                className={s.docHistoryBtn}
                onClick={() => removeEntry(entry.tempId)}
                aria-label="Eliminar entrada"
              >
                <X size={13} /> Quitar
              </BotonPlano>
            )}
            {entry.existing && obraId && (
              <BotonPlano
                type="button"
                className={s.docHistoryBtn}
                onClick={() => handleDeleteExisting(entry)}
                aria-label="Eliminar documento"
                title="Eliminar documento del servidor"
              >
                <Trash2 size={13} /> Eliminar
              </BotonPlano>
            )}
          </div>

          <input
            type="text"
            className={s.nombreCustomInput}
            placeholder="Nombre del documento"
            value={entry.nombreCustom}
            onChange={(e) => updateEntry(entry.tempId, { nombreCustom: e.target.value })}
            maxLength={120}
            aria-label="Nombre del documento personalizado"
            readOnly={Boolean(entry.existing)}
          />

          {entry.existing && (
            <BotonPlano
              type="button"
              className={s.docFileLink}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit", textAlign: "left" }}
              onClick={() =>
                abrirAdjunto(entry.existing!.url).catch((e) => notify.error(e.message))
              }
            >
              {entry.nombreCustom || "Ver archivo"}
            </BotonPlano>
          )}

          <div className={s.uploadArea}>
            <div className={s.uploadInputRow}>
              <input
                type="file"
                accept={DOC_ACCEPT}
                className={s.fileInput}
                onChange={(e) => handleFileChange(entry.tempId, e)}
                aria-label={`Seleccionar archivo para ${entry.nombreCustom || "documento personalizado"}`}
              />
              <label className={s.cameraBtn}>
                <Camera size={14} aria-hidden="true" />
                Tomar foto
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) => handleFileChange(entry.tempId, e)}
                />
              </label>
            </div>

            {entry.file && (
              <div className={s.queuedFile}>
                <span className={s.queuedFileName}>{entry.file.name}</span>
                <span className={s.queuedNote}>Se subirá al guardar</span>
              </div>
            )}

            {entry.uploadError && (
              <span className={s.fieldError} role="alert">{entry.uploadError}</span>
            )}
          </div>
        </div>
      ))}

      <BotonPlano type="button" className={s.contactoAddBtn} onClick={addEntry}>
        <Plus size={14} />
        Agregar documento personalizado
      </BotonPlano>
    </div>
  );
}
