import React from "react";
import MedicoAutocomplete from "../../components/MedicoAutocomplete";
import type { MedicoOption } from "../../types";
import styles from "../CargaFacturacion.module.scss";

interface Props {
  codMedico: string | null;
  /** Controlado por el padre: si lo guardara acá, el remount al resetear borraría
   *  los chips aunque "Mantener médico" esté activo. */
  medico: MedicoOption | null;
  onMedicoChange: (cod: string | null, medico: MedicoOption | null) => void;
  disabled?: boolean;
  error?: string | null;
  presetLabel?: string;
}

const MedicoSection: React.FC<Props> = ({
  codMedico, medico, onMedicoChange, disabled, error, presetLabel,
}) => (
  <div className={styles.section}>
    <span className={styles.sectionTitle}>Médico / prestador</span>
    <div className={`${styles.filterField} ${styles.filterFieldWide}`} data-field="medico">
      <label className={styles.filterLabel}>Nº colegio <span className={styles.errorText}>*</span></label>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <MedicoAutocomplete
            value={codMedico}
            onChange={onMedicoChange}
            disabled={disabled}
            presetLabel={presetLabel}
            blurOnSelect={false}
          />
        </div>
        {medico?.condicion_impositiva && (
          <span className={`${styles.infoChip} ${styles.chipNeutral}`} style={{ flexShrink: 0 }}>
            {medico.condicion_impositiva}
          </span>
        )}
      </div>
      {error && <span className={styles.errorText}>{error}</span>}

      {medico?.especialidades && medico.especialidades.length > 0 && (
        <div className={styles.medicoExtra}>
          <span className={styles.mutedText}>Especialidades:</span>
          {medico.especialidades.map((esp) => (
            <span key={esp.id} className={styles.especialidadChip}>{esp.nombre}</span>
          ))}
        </div>
      )}
    </div>
  </div>
);

export default MedicoSection;
