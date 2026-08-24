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

// El identificador del paciente puede ser un DNI o un nro de afiliado de la obra
// social (alfanumérico y con separadores, ej. "1231233/00"). Mismo criterio que
// `AfiliadoCreate` en el backend: ^[A-Za-z0-9./-]+$ de 4 a 20 caracteres.
const ID_MIN = 4;
const ID_MAX = 20;
/** Descarta lo que el backend rechazaría — incluidos los espacios. */
const limpiarId = (v: string) => v.replace(/[^A-Za-z0-9./-]/g, "").slice(0, ID_MAX);

const AltaAfiliadoModal: React.FC<Props> = ({ isOpen, dni, onClose, onCreated }) => {
  const [dniInput, setDniInput] = useState(dni);
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cada vez que se abre, precargamos el identificador que ya se hubiera tipeado o
  // elegido en el selector, pero queda editable por si el operador lo quiere corregir.
  useEffect(() => {
    if (isOpen) setDniInput(limpiarId(dni));
  }, [isOpen, dni]);

  const idValido = dniInput.length >= ID_MIN;

  const handleSubmit = async () => {
    if (!nombre.trim() || !idValido) return;
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
                <p className={styles.subtitle}>
                  Cargá el DNI o el nro de afiliado y el nombre para poder facturar a este paciente.
                </p>
              </div>
              <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Cerrar" disabled={loading}>
                <X size={16} />
              </button>
            </div>

            <div className={styles.body}>
              <div className={styles.field}>
                <label className={styles.label}>
                  DNI o Nro de afiliado <span className={styles.req}>*</span>
                </label>
                <input
                  className={styles.input}
                  type="text"
                  value={dniInput}
                  onChange={(e) => setDniInput(limpiarId(e.target.value))}
                  placeholder="Ej.: 12345678 o 1231233/00"
                  maxLength={ID_MAX}
                  disabled={loading}
                  autoFocus
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
                disabled={!nombre.trim() || !idValido || loading}
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
