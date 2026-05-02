import { useRef, useState } from "react";
import { FiUploadCloud, FiFileText, FiX } from "react-icons/fi";
import { motion } from "framer-motion";
import styles from "./dashboard.module.scss";

export default function ValoresEticos() {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (f.type !== "application/pdf") {
      alert("Solo se aceptan archivos PDF.");
      return;
    }
    setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0] ?? null);
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

      {/* Current file indicator */}
      <div className={styles.eticaCurrent}>
        <FiFileText className={styles.eticaCurrentIcon} />
        <div>
          <span className={styles.eticaCurrentLabel}>Archivo actual</span>
          <span className={styles.eticaCurrentName}>CMC_03_2026.pdf</span>
        </div>
      </div>

      {/* Drop zone */}
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

      {/* Upload action */}
      <div className={styles.eticaActions}>
        <button
          type="button"
          className={styles.eticaUploadBtn}
          disabled={!file}
        >
          <FiUploadCloud size={16} />
          Subir y reemplazar PDF
        </button>
        {file && (
          <button
            type="button"
            className={styles.eticaCancelBtn}
            onClick={() => setFile(null)}
          >
            Cancelar
          </button>
        )}
      </div>

      {/*
        TODO: Backend integration

        1. Create POST /api/valores-eticos/upload — multipart/form-data with
           field "pdf" (File). Save to S3/Cloudinary replacing the current PDF
           (or persist the new URL in DB/config). Return { url: string }.

        2. On submit:
             const fd = new FormData();
             fd.append("pdf", file);
             const { data } = await http.post("/valores-eticos/upload", fd);

        3. After success: show a success banner, clear `file` state, and
           update the "Archivo actual" indicator with the new filename/URL.

        4. Add loading + disabled state to the upload button during the request.

        5. Update ETICA_PDF in Welcome.tsx and the pdf import in Login.tsx to
           use the dynamic URL returned by the backend.
      */}
    </div>
  );
}
