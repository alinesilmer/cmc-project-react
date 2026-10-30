import React, { useEffect, useState } from "react";
import { Trash2, X } from "lucide-react";

import { MOTIVO_ELIMINACION_LABEL, MOTIVOS_ELIMINACION_ELEGIBLES } from "../types";
import type { MotivoEliminacion } from "../types";
import base from "./ConfirmActionModal.module.scss";
import styles from "./EliminarPrestacionModal.module.scss";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";
import MarcoModal from "@/app/components/ui/MarcoModal/MarcoModal";

interface Props {
  isOpen: boolean;
  prestacionId: number;
  /** Lo que identifica a la prestación debajo del título (médico, período…). */
  descripcion?: React.ReactNode;
  /** Qué más se lleva puesta la eliminación (el equipo) y que no se puede deshacer. */
  aviso?: React.ReactNode;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (motivo: MotivoEliminacion, detalle: string | null) => void;
}

// El personal del Colegio siempre dice por qué elimina; el detalle es obligatorio sólo con «Otro».
const EliminarPrestacionModal: React.FC<Props> = ({
  isOpen, prestacionId, descripcion, aviso, loading, onClose, onConfirm,
}) => {
  const [motivo, setMotivo] = useState<MotivoEliminacion | null>(null);
  const [detalle, setDetalle] = useState("");

  // Cada apertura arranca limpia: el motivo de la anterior no tiene que quedar elegido.
  useEffect(() => {
    if (isOpen) {
      setMotivo(null);
      setDetalle("");
    }
  }, [isOpen, prestacionId]);

  const detalleObligatorio = motivo === "otro";
  const faltaDetalle = detalleObligatorio && !detalle.trim();
  const valido = motivo !== null && !faltaDetalle;

  const confirmar = () => {
    if (valido && motivo) onConfirm(motivo, detalle.trim() || null);
  };

  if (!isOpen) return null;

  // El fondo fijo y el centrado los pone MarcoModal (como en ConfirmActionModal): sin él, el panel
  // quedaba en el flujo de la página, al final de la tabla. Mientras elimina no se cierra.
  return (
    <MarcoModal
      onClose={loading ? undefined : onClose}
      className={`${base.modal} ${styles.modal}`}
      aria-labelledby="eliminar-prestacion-titulo"
    >
      <div className={base.header}>
        <span className={`${base.headerIcon} ${base.headerIconDanger}`}>
          <Trash2 size={18} />
        </span>
        <div className={styles.titulo}>
          <h2 id="eliminar-prestacion-titulo" className={base.title}>Eliminar prestación</h2>
          <span className={styles.subtitulo}>
            <strong>ID Nº {prestacionId}</strong>
            {descripcion && <> · {descripcion}</>}
          </span>
        </div>
        <BotonPlano type="button" className={base.closeBtn} onClick={onClose} aria-label="Cerrar" disabled={loading}>
          <X size={16} />
        </BotonPlano>
      </div>

      <div className={base.body}>
        <fieldset className={styles.motivos}>
          <legend className={styles.label}>
            ¿Por qué se elimina? <span className={styles.requerido}>*</span>
          </legend>
          <div className={styles.chips}>
            {MOTIVOS_ELIMINACION_ELEGIBLES.map((m) => (
              <BotonPlano
                key={m}
                type="button"
                aria-pressed={motivo === m}
                className={`${styles.chip} ${motivo === m ? styles.chipActivo : ""}`}
                onClick={() => setMotivo(m)}
                disabled={loading}
              >
                {MOTIVO_ELIMINACION_LABEL[m]}
              </BotonPlano>
            ))}
          </div>
        </fieldset>

        <div className={styles.campo}>
          <label htmlFor="eliminar-prestacion-detalle" className={styles.label}>
            Detalle{" "}
            {detalleObligatorio
              ? <span className={styles.requerido}>*</span>
              : <span className={styles.opcional}>(opcional)</span>}
          </label>
          <input
            id="eliminar-prestacion-detalle"
            type="text"
            maxLength={255}
            className={`${styles.input} ${faltaDetalle ? styles.inputError : ""}`}
            placeholder={detalleObligatorio ? "Contá por qué se elimina" : "Ej.: duplicada con el ID 184120"}
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") confirmar(); }}
            aria-invalid={faltaDetalle}
            aria-describedby={faltaDetalle ? "eliminar-prestacion-error" : undefined}
            disabled={loading}
          />
          {faltaDetalle && (
            <span id="eliminar-prestacion-error" className={styles.error}>
              Con «Otro», el detalle es obligatorio.
            </span>
          )}
        </div>

        {aviso && <p className={styles.aviso}>{aviso}</p>}
      </div>

      <div className={base.footer}>
        <BotonPlano type="button" className={base.btnGhost} onClick={onClose} disabled={loading}>
          Cancelar
        </BotonPlano>
        <BotonPlano type="button" className={base.btnDanger} onClick={confirmar} disabled={loading || !valido}>
          {loading ? "Procesando…" : "Eliminar"}
        </BotonPlano>
      </div>
    </MarcoModal>
  );
};

export default EliminarPrestacionModal;
