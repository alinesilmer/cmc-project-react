"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./PdfUpload.module.scss";

type ValidationReason = "type" | "size";

interface PdfUploadProps {
  label: string;
  required?: boolean;
  onFileSelect: (file: File | null) => void;
  error?: string;
  onValidationError?: (reason: ValidationReason) => void;
}

const MAX_MB = 10;

const PdfUpload: React.FC<PdfUploadProps> = ({
  label,
  required = true,
  onFileSelect,
  error,
  onValidationError,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [open, setOpen] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const inputId = "pdf-upload-input";
  const errorId = "pdf-upload-error";

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
    setUploaded(true);
    setShowToast(true);
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(
      () => setShowToast(false),
      2200
    );
  };

  const validateAndSet = (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      onFileSelect(null);
      setUploaded(false);
      return;
    }
    if (file.type !== "application/pdf") {
      onValidationError?.("type");
      setSelectedFile(null);
      onFileSelect(null);
      setUploaded(false);
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      onValidationError?.("size");
      setSelectedFile(null);
      onFileSelect(null);
      setUploaded(false);
      return;
    }
    setSelectedFile(file);
    onFileSelect(file);
    showSuccess();
  };

  const handleFileSelect = (file: File) => validateAndSet(file);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files?.length) handleFileSelect(files[0]);
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
    if (files?.length) handleFileSelect(files[0]);
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
            aria-labelledby="pdf-upload-title"
            ref={dialogRef}
          >
            <div className={styles.modalHeader}>
              <h3 id="pdf-upload-title" className={styles.modalTitle}>
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
              <div
                className={styles.successBanner}
                role="status"
                aria-live="polite"
              >
                Documento cargado correctamente
              </div>
            )}

            <div
              className={`${styles.uploadArea} ${
                dragActive ? styles.dragActive : ""
              } ${error ? styles.error : ""}`}
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
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className={styles.hiddenInput}
                aria-required={required}
              />

              {selectedFile ? (
                <div className={styles.fileSelected}>
                  <div className={styles.fileInfo}>
                    <svg
                      className={styles.pdfIcon}
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
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
                  <svg
                    className={styles.uploadIcon}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    <path d="M12,11L16,15H13V19H11V15H8L12,11Z" />
                  </svg>
                  <p className={styles.uploadText}>
                    <strong>Haz clic para subir</strong> o arrastra tu PDF aquí
                  </p>
                  <p className={styles.uploadSubtext}>
                    Máximo {MAX_MB}MB • Solo archivos PDF
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
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={closeModal}
              >
                Cerrar
              </button>
              {selectedFile && (
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={closeModal}
                >
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
            aria-labelledby="help-modal-title"
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

            <div
              style={{ padding: "1rem 0", lineHeight: "1.6", color: "#374151" }}
            >
              <p style={{ margin: "0 0 1rem 0" }}>
                <strong>Pasos simples:</strong>
              </p>
              <ol style={{ margin: "0 0 1rem 0", paddingLeft: "1.5rem" }}>
                <li style={{ marginBottom: "0.5rem" }}>
                  Haz clic en el botón de adjuntar PDF
                </li>
                <li style={{ marginBottom: "0.5rem" }}>
                  Selecciona tu archivo PDF desde tu computadora
                </li>
                <li style={{ marginBottom: "0.5rem" }}>
                  O simplemente arrastra el archivo al área de carga
                </li>
              </ol>
              <p
                style={{ margin: "0", fontSize: "0.875rem", color: "#6b7280" }}
              >
                <strong>Importante:</strong> Solo se aceptan archivos PDF de
                máximo 10MB.
              </p>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={closeHelpModal}
              >
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "0.5rem",
          }}
        >
          <label className={styles.label}>
            {label}
            {required && <span className={styles.required}> *</span>}
            <span className={styles.pdfOnly}>(Solo PDF)</span>
          </label>
        </div>

        <button
          type="button"
          className={`${styles.iconTrigger} ${
            uploaded ? styles.iconSuccess : ""
          }`}
          onClick={openModal}
          aria-label={label}
          title={label}
        >
          <svg
            className={styles.pdfImg}
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{ width: "24px", height: "24px", color: "#dc2626" }}
          >
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
            PDF subido correctamente
          </div>,
          document.body
        )}
    </>
  );
};

export default PdfUpload;
