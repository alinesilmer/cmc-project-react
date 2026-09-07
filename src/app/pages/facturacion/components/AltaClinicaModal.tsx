import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, X } from "lucide-react";
import { crearClinica } from "../api";
import type { ClinicaOption } from "../types";
import styles from "./AltaAfiliadoModal.module.scss";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (clinica: ClinicaOption) => void;
}

const NOMBRE_MAX = 40; // NOMBRE es VARCHAR(40) en listado_medico

const AltaClinicaModal: React.FC<Props> = ({ isOpen, onClose, onCreated }) => {
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) { setNombre(""); setError(null); }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!nombre.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const clinica = await crearClinica({ nombre: nombre.trim() });
      onCreated(clinica);
      setNombre("");
      onClose();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "No se pudo dar de alta la clínica.");
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
              <span className={styles.headerIcon}><Building2 size={18} /></span>
              <div>
                <h2 className={styles.title}>Agregar clínica</h2>
                <p className={styles.subtitle}>
                  Cargá el nombre para poder facturar bajo esta clínica.
                </p>
              </div>
              <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Cerrar" disabled={loading}>
                <X size={16} />
              </button>
            </div>

            <div className={styles.body}>
              <div className={styles.field}>
                <label className={styles.label}>Nombre <span className={styles.req}>*</span></label>
                <input
                  className={styles.input}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value.toUpperCase().slice(0, NOMBRE_MAX))}
                  placeholder="NOMBRE DE LA CLÍNICA"
                  maxLength={NOMBRE_MAX}
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
                disabled={!nombre.trim() || loading}
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

export default AltaClinicaModal;
