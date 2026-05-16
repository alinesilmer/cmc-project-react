import { useCallback, useEffect, useRef, useState } from "react";
import {
  FiUploadCloud,
  FiFileText,
  FiX,
  FiTrash2,
  FiChevronDown,
  FiExternalLink,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./dashboard.module.scss";
import {
  getUltimo,
  listValoresEticos,
  uploadValorEtico,
  deleteValorEtico,
  type ValoresEticosOut,
} from "./valoresEticos.api";

function fmtDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const pdfUrl = (pdf_path: string) => `/${pdf_path}`;
const fileName = (pdf_path: string) => pdf_path.split("/").pop() ?? pdf_path;

export default function ValoresEticos() {
  const [ultimo, setUltimo] = useState<ValoresEticosOut | null>(null);
  const [historial, setHistorial] = useState<ValoresEticosOut[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [observaciones, setObservaciones] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showHistorial, setShowHistorial] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const [u, h] = await Promise.all([getUltimo(), listValoresEticos()]);
    setUltimo(u);
    setHistorial(h);
  }, []);

  useEffect(() => {
    refresh()
      .catch(() => setError("No se pudo cargar el archivo actual."))
      .finally(() => setLoadingInit(false));
  }, [refresh]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 4000);
    return () => clearTimeout(t);
  }, [success]);

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (f.type !== "application/pdf") {
      setError("Solo se aceptan archivos PDF.");
      return;
    }
    setError(null);
    setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0] ?? null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await uploadValorEtico(file, observaciones);
      setFile(null);
      setObservaciones("");
      await refresh();
      setSuccess("PDF subido correctamente.");
    } catch {
      setError("Error al subir el archivo. Intentá de nuevo.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este registro y su archivo?")) return;
    setDeleting(id);
    setError(null);
    try {
      await deleteValorEtico(id);
      await refresh();
    } catch {
      setError("Error al eliminar. Intentá de nuevo.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className={styles.eticaSection}>
      <div className={styles.eticaHeader}>
        <h2>Valores Éticos</h2>
        <p className={styles.eticaDesc}>
          Subí un nuevo PDF para reemplazar el Boletín de Valores Éticos Mínimos
          que se muestra en el Inicio y en el Login. El archivo actual seguirá
          visible hasta que confirmes la carga.
        </p>
      </div>

      {success && (
        <div className={`${styles.eticaBanner} ${styles.eticaSuccessBanner}`}>
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess(null)} aria-label="Cerrar">×</button>
        </div>
      )}
      {error && (
        <div className={`${styles.eticaBanner} ${styles.eticaErrorBanner}`}>
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Cerrar">×</button>
        </div>
      )}

      <div className={styles.eticaCurrent}>
        <FiFileText className={styles.eticaCurrentIcon} />
        <div>
          <span className={styles.eticaCurrentLabel}>Archivo actual</span>
          {loadingInit ? (
            <span className={styles.eticaLoadingText}>Cargando…</span>
          ) : ultimo ? (
            <>
              <span className={styles.eticaCurrentName}>{fileName(ultimo.pdf_path)}</span>
              <span className={styles.eticaCurrentDate}>{fmtDate(ultimo.fecha_update)}</span>
              {ultimo.observaciones && (
                <span className={styles.eticaCurrentObs}>{ultimo.observaciones}</span>
              )}
            </>
          ) : (
            <span className={styles.eticaCurrentEmpty}>Sin archivo cargado</span>
          )}
        </div>
        {ultimo && (
          <a
            href={pdfUrl(ultimo.pdf_path)}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.eticaViewLink}
            aria-label="Ver PDF actual"
          >
            <FiExternalLink size={14} />
            Ver PDF
          </a>
        )}
      </div>

      <div className={styles.eticaObsField}>
        <label htmlFor="etica-obs">Observaciones (opcional)</label>
        <textarea
          id="etica-obs"
          className={styles.eticaObsTextarea}
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          placeholder="Ej: Versión aprobada mayo 2026"
          rows={2}
        />
      </div>

      <motion.div
        className={`${styles.eticaDropzone} ${dragOver ? styles.eticaDropzoneActive : ""} ${file ? styles.eticaDropzoneFilled : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className={styles.eticaFileInput}
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <div className={styles.eticaFilePreview}>
            <FiFileText size={28} />
            <span className={styles.eticaFileName}>{file.name}</span>
            <span className={styles.eticaFileSize}>
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </span>
            <button
              type="button"
              className={styles.eticaRemoveFile}
              onClick={(e) => { e.stopPropagation(); setFile(null); }}
              aria-label="Quitar archivo"
            >
              <FiX size={16} />
            </button>
          </div>
        ) : (
          <div className={styles.eticaDropzoneEmpty}>
            <FiUploadCloud size={36} className={styles.eticaUploadIcon} />
            <p className={styles.eticaDropzoneText}>
              Arrastrá un PDF acá o <span>hacé click para seleccionar</span>
            </p>
            <p className={styles.eticaDropzoneHint}>Solo archivos PDF · Máx. 20 MB</p>
          </div>
        )}
      </motion.div>

      <div className={styles.eticaActions}>
        <button
          type="button"
          className={styles.eticaUploadBtn}
          disabled={!file || uploading}
          onClick={handleUpload}
        >
          <FiUploadCloud size={16} />
          {uploading ? "Subiendo…" : "Subir y reemplazar PDF"}
        </button>
        {file && !uploading && (
          <button
            type="button"
            className={styles.eticaCancelBtn}
            onClick={() => { setFile(null); setObservaciones(""); }}
          >
            Cancelar
          </button>
        )}
      </div>

      {!loadingInit && (
        <div className={styles.eticaHistorial}>
          <button
            type="button"
            className={styles.eticaHistorialToggle}
            onClick={() => setShowHistorial((v) => !v)}
          >
            <FiChevronDown
              size={16}
              style={{
                transform: showHistorial ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            />
            Historial ({historial.length})
          </button>

          <AnimatePresence>
            {showHistorial && (
              <motion.div
                className={styles.eticaHistorialList}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: "hidden" }}
              >
                {historial.length === 0 ? (
                  <p className={styles.eticaNoData}>Sin registros anteriores.</p>
                ) : (
                  historial.map((item) => (
                    <div key={item.id} className={styles.eticaHistorialItem}>
                      <FiFileText size={16} style={{ color: "#8a99b3", flexShrink: 0 }} />
                      <div className={styles.eticaHistorialMeta}>
                        <span className={styles.eticaHistorialName}>{fileName(item.pdf_path)}</span>
                        <span className={styles.eticaHistorialDate}>{fmtDate(item.fecha_update)}</span>
                        {item.observaciones && (
                          <span className={styles.eticaHistorialObs}>{item.observaciones}</span>
                        )}
                      </div>
                      <div className={styles.eticaHistorialActions}>
                        <a
                          href={pdfUrl(item.pdf_path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.eticaViewLink}
                          aria-label="Ver PDF"
                        >
                          <FiExternalLink size={13} />
                          Ver
                        </a>
                        <button
                          type="button"
                          className={styles.eticaDeleteBtn}
                          onClick={() => handleDelete(item.id)}
                          disabled={deleting === item.id}
                          aria-label="Eliminar"
                        >
                          <FiTrash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
