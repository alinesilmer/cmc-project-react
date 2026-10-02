import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { CloudUpload, FileText, X } from "lucide-react";
import { PDF, accept, motivoDeRechazo } from "../../../lib/subidas";
import styles from "./ZonaCarga.module.scss";

type Props = {
  subiendo: boolean;
  onSubir: (archivo: File, observaciones: string) => Promise<boolean>;
  onError: (mensaje: string | null) => void;
};

const enMb = (bytes: number) => (bytes / 1024 / 1024).toFixed(2);

/** Observaciones, zona para arrastrar el PDF y el botón de carga. */
export default function ZonaCarga({ subiendo, onSubir, onError }: Props) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [observaciones, setObservaciones] = useState("");
  const [arrastrando, setArrastrando] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  // Se valida extensión y tamaño: el `type` del navegador llega vacío para
  // varios archivos y el `accept` del input es sólo una sugerencia.
  const elegir = (f: File | null) => {
    if (!f) return;
    const motivo = motivoDeRechazo(f, PDF);
    onError(motivo);
    if (!motivo) setArchivo(f);
  };

  const limpiar = () => {
    setArchivo(null);
    setObservaciones("");
  };

  const subir = async () => {
    if (archivo && (await onSubir(archivo, observaciones))) limpiar();
  };

  return (
    <>
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
        className={`${styles.eticaDropzone} ${arrastrando ? styles.eticaDropzoneActive : ""} ${archivo ? styles.eticaDropzoneFilled : ""}`}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          elegir(e.dataTransfer.files[0] ?? null);
        }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
      >
        <input
          ref={input}
          type="file"
          accept={accept(PDF)}
          className={styles.eticaFileInput}
          aria-label="Elegir PDF"
          onChange={(e) => {
            elegir(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
        {archivo ? (
          <div className={styles.eticaFilePreview}>
            <FileText size={28} aria-hidden="true" />
            <span className={styles.eticaFileName}>{archivo.name}</span>
            <span className={styles.eticaFileSize}>{enMb(archivo.size)} MB</span>
            <button
              type="button"
              className={styles.eticaRemoveFile}
              onClick={(e) => {
                e.stopPropagation();
                setArchivo(null);
              }}
              aria-label="Quitar archivo"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className={styles.eticaDropzoneEmpty}>
            <CloudUpload size={36} className={styles.eticaUploadIcon} aria-hidden="true" />
            <p className={styles.eticaDropzoneText}>
              Arrastrá un PDF acá o <span>hacé click para seleccionar</span>
            </p>
            <p className={styles.eticaDropzoneHint}>Solo archivos PDF · Máx. 20 MB</p>
          </div>
        )}
      </motion.div>

      <div className={styles.eticaActions}>
        <button type="button" className={styles.eticaUploadBtn} disabled={!archivo || subiendo} onClick={subir}>
          <CloudUpload size={16} aria-hidden="true" />
          {subiendo ? "Subiendo…" : "Subir y reemplazar PDF"}
        </button>
        {archivo && !subiendo && (
          <button type="button" className={styles.eticaCancelBtn} onClick={limpiar}>
            Cancelar
          </button>
        )}
      </div>
    </>
  );
}
