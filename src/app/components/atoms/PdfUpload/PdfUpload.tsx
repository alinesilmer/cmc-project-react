"use client";

import type React from "react";
import { useState, useRef, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import styles from "./PdfUpload.module.scss";

type ValidationReason = "type" | "size";

interface PdfUploadProps {
  label: string;
  required?: boolean;
  value?: File | null;                 // ⬅️ NUEVO (controlado)
  onFileSelect: (file: File | null) => void;
  error?: string;
  onValidationError?: (reason: ValidationReason) => void;
  maxMb?: number;                      // ⬅️ opcional (default 20MB)
}

const DEFAULT_MAX_MB = 20;

const PdfUpload: React.FC<PdfUploadProps> = ({
  label,
  required = true,
  value,
  onFileSelect,
  error,
  onValidationError,
  maxMb = DEFAULT_MAX_MB,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(value ?? null);
  const [dragActive, setDragActive] = useState(false);
  const [open, setOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // ⬅️ IDs únicos por instancia (evita colisiones entre inputs)
  const uid = useId();
  const inputId = `file-upload-input-${uid}`;
  const errorId = `file-upload-error-${uid}`;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  // ⬅️ Sincronizá con la prop controlada
  useEffect(() => {
    setSelectedFile(value ?? null);
  }, [value]);

  // Esc y bloqueo scroll si hay modales
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setShowHelpModal(false);
      }
    };
    if (open || showHelpModal) {
      document.addEventListener("keydown", onKey);
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", onKey);
        document.body.style.overflow = prev;
      };
    }
  }, [open, showHelpModal]);

  const showSuccess = () => {
    setShowToast(true);
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => setShowToast(false), 2200);
  };

  const isAllowedType = (f: File) =>
    f.type === "application/pdf" || f.type.startsWith("image/");

  const validateAndSet = (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      onFileSelect(null);
      return;
    }
    if (!isAllowedType(file)) {
      onValidationError?.("type");
      setSelectedFile(null);
      onFileSelect(null);
      return;
    }
    if (file.size > maxMb * 1024 * 1024) {
      onValidationError?.("size");
      setSelectedFile(null);
      onFileSelect(null);
      return;
    }
    setSelectedFile(file);
    onFileSelect(file);
    showSuccess();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files?.length) validateAndSet(files[0]);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleClickUpload = () => fileInputRef.current?.click();
  const handleKeyDownUpload = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClickUpload();
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.length) validateAndSet(files[0]);
  };

  const closeModal = () => setOpen(false);
  const openModal = () => setOpen(true);
  const closeHelpModal = () => setShowHelpModal(false);

  const modal = open
    ? createPortal(
        <div
          className={styles.modalOverlay}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`file-upload-title-${uid}`}
            ref={dialogRef}
          >
            <div className={styles.modalHeader}>
              <h3 id={`file-upload-title-${uid}`} className={styles.modalTitle}>
                {label}
              </h3>
              <button
                type="button"
                className={styles.modalClose}
                aria-label="Cerrar"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            {selectedFile && (
              <div className={styles.successBanner} role="status" aria-live="polite">
                Archivo cargado correctamente
              </div>
            )}

            <div
              className={`${styles.uploadArea} ${dragActive ? styles.dragActive : ""} ${error ? styles.error : ""}`}
              role="button"
              tabIndex={0}
              onKeyDown={handleKeyDownUpload}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={handleClickUpload}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
            >
              <input
                id={inputId}
                ref={fileInputRef}
                type="file"
                // ⬅️ PDF + imágenes
                accept=".pdf,application/pdf,image/*"
                onChange={handleFileChange}
                className={styles.hiddenInput}
                aria-required={required}
              />

              {selectedFile ? (
                <div className={styles.fileSelected}>
                  <div className={styles.fileInfo}>
                    <svg className={styles.pdfIcon} viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                    <div className={styles.fileName}>
                      <span>{selectedFile.name}</span>
                      <span className={styles.fileSize}>
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      validateAndSet(null);
                    }}
                    aria-label="Eliminar archivo"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className={styles.uploadPrompt}>
                  <svg className={styles.uploadIcon} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    <path d="M12,11L16,15H13V19H11V15H8L12,11Z" />
                  </svg>
                  <p className={styles.uploadText}>
                    <strong>Haz clic para subir</strong> o arrastra tu archivo aquí
                  </p>
                  <p className={styles.uploadSubtext}>
                    Máximo {maxMb}MB • PDF o imagen (PNG/JPG/WEBP)
                  </p>
                </div>
              )}
            </div>

            {error && (
              <span id={errorId} className={styles.errorMessage} role="alert">
                {error}
              </span>
            )}

            <div className={styles.modalFooter}>
              <button type="button" className={styles.secondaryBtn} onClick={closeModal}>
                Cerrar
              </button>
              {selectedFile && (
                <button type="button" className={styles.primaryBtn} onClick={closeModal}>
                  Listo
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  const helpModal = showHelpModal
    ? createPortal(
        <div
          className={styles.modalOverlay}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeHelpModal();
          }}
        >
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`help-modal-title-${uid}`}
            style={{ maxWidth: "500px" }}
          >
            <div className={styles.modalHeader}>
              <button
                type="button"
                className={styles.modalClose}
                aria-label="Cerrar"
                onClick={closeHelpModal}
              >
                ×
              </button>
            </div>

            <div style={{ padding: "1rem 0", lineHeight: "1.6", color: "#374151" }}>
              <p style={{ margin: "0 0 1rem 0" }}>
                <strong>Pasos simples:</strong>
              </p>
              <ol style={{ margin: "0 0 1rem 0", paddingLeft: "1.5rem" }}>
                <li style={{ marginBottom: "0.5rem" }}>Haz clic en “Adjuntar”</li>
                <li style={{ marginBottom: "0.5rem" }}>Selecciona tu archivo</li>
                <li style={{ marginBottom: "0.5rem" }}>O suéltalo en el área de carga</li>
              </ol>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "#6b7280" }}>
                <strong>Importante:</strong> Solo PDF o imagen, hasta {maxMb}MB.
              </p>
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.primaryBtn} onClick={closeHelpModal}>
                Entendido
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <div className={styles.uploadContainer}>
        <div>
          <label className={styles.label}>{label}{required && <span className={styles.required}> *</span>}</label>
        </div>

        <button
          type="button"
          className={`${styles.iconTrigger} ${selectedFile ? styles.iconSuccess : ""}`}
          onClick={openModal}
          aria-label={label}
          title={label}
        >
          <svg className={styles.pdfImg} viewBox="0 0 24 24" fill="currentColor" style={{ width: 24, height: 24 }}>
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
            <path d="M12,11L16,15H13V19H11V15H8L12,11Z" />
          </svg>
        </button>

        {error && !selectedFile && (
          <span className={styles.errorMessage} role="alert">
            {error}
          </span>
        )}
      </div>

      {modal}
      {helpModal}
      {showToast &&
        createPortal(
          <div className={styles.toast} role="status" aria-live="polite">
            Archivo subido correctamente
          </div>,
          document.body
        )}
    </>
  );
};

export default PdfUpload;
