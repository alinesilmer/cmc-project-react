import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { UserPlus, X } from "lucide-react";
import { crearAfiliado } from "../api";
import type { AfiliadoRead } from "../types";
import styles from "./AltaAfiliadoModal.module.scss";

interface Props {
  isOpen: boolean;
  dni: string;
  onClose: () => void;
  onCreated: (afiliado: AfiliadoRead) => void;
}

const MIN_DIGITS = 6;

const AltaAfiliadoModal: React.FC<Props> = ({ isOpen, dni, onClose, onCreated }) => {
  const [dniInput, setDniInput] = useState(dni);
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cada vez que se abre, precargamos el DNI que ya se hubiera tipeado/elegido
  // en el selector, pero queda editable por si el operador lo quiere corregir.
  useEffect(() => {
    if (isOpen) setDniInput(dni);
  }, [isOpen, dni]);

  const handleSubmit = async () => {
    if (!nombre.trim() || dniInput.length < MIN_DIGITS) return;
    setLoading(true);
    setError(null);
    try {
      const afiliado = await crearAfiliado({ dni: dniInput, nombre: nombre.trim() });
      onCreated(afiliado);
      setNombre("");
      onClose();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "No se pudo dar de alta el afiliado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ duration: 0.16 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={styles.header}>
              <span className={styles.headerIcon}><UserPlus size={18} /></span>
              <div>
                <h2 className={styles.title}>Agregar afiliado</h2>
                <p className={styles.subtitle}>Cargá el DNI y el nombre para poder facturar a este paciente.</p>
              </div>
              <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Cerrar" disabled={loading}>
                <X size={16} />
              </button>
            </div>

            <div className={styles.body}>
              <div className={styles.field}>
                <label className={styles.label}>DNI <span className={styles.req}>*</span></label>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="numeric"
                  value={dniInput}
                  onChange={(e) => setDniInput(e.target.value.replace(/\D/g, ""))}
                  placeholder="DNI (mín. 6 dígitos)"
                  maxLength={15}
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Nombre <span className={styles.req}>*</span></label>
                <input
                  className={styles.input}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value.toUpperCase())}
                  placeholder="APELLIDO NOMBRE"
                  disabled={loading}
                  autoFocus
                />
              </div>

              {error && <span className={styles.errorText}>{error}</span>}
            </div>

            <div className={styles.footer}>
              <button type="button" className={styles.btnGhost} onClick={onClose} disabled={loading}>
                Cancelar
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={handleSubmit}
                disabled={!nombre.trim() || dniInput.length < MIN_DIGITS || loading}
              >
                {loading ? "Guardando…" : "Dar de alta"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AltaAfiliadoModal;
