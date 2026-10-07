import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Pencil, UserPlus, X } from "lucide-react";
import { actualizarAfiliado, crearAfiliado } from "../api";
import type { AfiliadoRead } from "../types";
import { mensajeDeError } from "@/app/shared/lib/httpErrors";
import styles from "./AltaAfiliadoModal.module.scss";

interface Props {
  isOpen: boolean;
  /** Alta: el identificador que ya se hubiera tipeado o elegido en el selector. */
  dni: string;
  /** Con un afiliado, el modal lo edita en vez de dar de alta uno nuevo. */
  afiliado?: AfiliadoRead | null;
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

/**
 * Alta o edición de un afiliado del padrón. Ningún campo es obligatorio por sí solo:
 * alcanza con el nombre o con el número (de los dos, al menos uno).
 */
const AltaAfiliadoModal: React.FC<Props> = ({ isOpen, dni, afiliado, onClose, onCreated }) => {
  const editando = !!afiliado;
  const [dniInput, setDniInput] = useState(dni);
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cada vez que se abre: en edición, los datos del afiliado; en alta, el
  // identificador que ya se hubiera tipeado, editable por si hay que corregirlo.
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (afiliado) {
      setDniInput(afiliado.dni ?? "");
      setNombre(afiliado.nombre ?? "");
    } else {
      setDniInput(limpiarId(dni));
      setNombre("");
    }
  }, [isOpen, dni, afiliado]);

  const idIncompleto = dniInput.length > 0 && dniInput.length < ID_MIN;
  const vacio = !dniInput && !nombre.trim();
  const puedeGuardar = !vacio && !idIncompleto && !loading;

  const handleSubmit = async () => {
    if (!puedeGuardar) return;
    setLoading(true);
    setError(null);
    const body = { dni: dniInput || null, nombre: nombre.trim() || null };
    try {
      const guardado = afiliado ? await actualizarAfiliado(afiliado.id, body) : await crearAfiliado(body);
      onCreated(guardado);
      setNombre("");
      onClose();
    } catch (e) {
      setError(mensajeDeError(e, editando ? "No se pudo guardar el afiliado." : "No se pudo dar de alta el afiliado."));
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
          // El modal se monta dentro del formulario de carga: que el foco y las teclas no
          // le lleguen (centra el campo enfocado scrolleando la página y usa Enter para avanzar).
          onFocus={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
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
              <span className={styles.headerIcon}>{editando ? <Pencil size={18} /> : <UserPlus size={18} />}</span>
              <div>
                <h2 className={styles.title}>{editando ? "Editar afiliado" : "Agregar afiliado"}</h2>
                <p className={styles.subtitle}>
                  {editando
                    ? "Se corrige también en sus prestaciones de facturas abiertas."
                    : "Cargá el nombre, el DNI o nro de afiliado, o los dos."}
                </p>
              </div>
              <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Cerrar" disabled={loading}>
                <X size={16} />
              </button>
            </div>

            <div className={styles.body}>
              <div className={styles.field}>
                <label className={styles.label}>DNI o Nro de afiliado</label>
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
                {idIncompleto && (
                  <span className={styles.errorText}>Tiene que tener al menos {ID_MIN} caracteres, o dejalo vacío.</span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Nombre</label>
                <input
                  className={styles.input}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value.toUpperCase())}
                  placeholder="APELLIDO NOMBRE"
                  disabled={loading}
                />
              </div>

              {vacio && <span className={styles.subtitle}>Cargá al menos el nombre o el número.</span>}
              {error && <span className={styles.errorText}>{error}</span>}
            </div>

            <div className={styles.footer}>
              <button type="button" className={styles.btnGhost} onClick={onClose} disabled={loading}>
                Cancelar
              </button>
              <button type="button" className={styles.btnPrimary} onClick={handleSubmit} disabled={!puedeGuardar}>
                {loading ? "Guardando…" : editando ? "Guardar" : "Dar de alta"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AltaAfiliadoModal;
