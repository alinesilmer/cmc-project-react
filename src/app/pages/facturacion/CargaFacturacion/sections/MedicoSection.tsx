import React from "react";
import PayeeAutocomplete from "../../components/PayeeAutocomplete";
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
  /** true cuando el payee elegido es una clínica: se muestra el médico ejecutor debajo. */
  payeeEsOrganizacion?: boolean;
  codMedicoEjecutor?: string | null;
  medicoEjecutor?: MedicoOption | null;
  onEjecutorChange?: (cod: string | null, medico: MedicoOption | null) => void;
  ejecutorDisabled?: boolean;
  ejecutorError?: string | null;
  ejecutorPresetLabel?: string;
  ejecutorResetKey?: number;
}

const MedicoSection: React.FC<Props> = ({
  codMedico, medico, onMedicoChange, disabled, error, presetLabel,
  payeeEsOrganizacion, codMedicoEjecutor, medicoEjecutor, onEjecutorChange,
  ejecutorDisabled, ejecutorError, ejecutorPresetLabel, ejecutorResetKey,
}) => (
  <div className={styles.section}>
    <span className={styles.sectionTitle}>Médico / Clínica</span>
    <div className={`${styles.filterField} ${styles.filterFieldWide}`} data-field="medico">
      <label className={styles.filterLabel}>Nº socio <span className={styles.errorText}>*</span></label>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <PayeeAutocomplete
            value={codMedico}
            onChange={onMedicoChange}
            disabled={disabled}
            presetLabel={presetLabel}
            blurOnSelect={false}
          />
        </div>
        {medico?.es_organizacion && (
          <span className={`${styles.infoChip} ${styles.chipNeutral}`} style={{ flexShrink: 0 }}>
            Clínica
          </span>
        )}
        {medico?.condicion_impositiva && (
          <span className={`${styles.infoChip} ${styles.chipNeutral}`} style={{ flexShrink: 0 }}>
            {medico.condicion_impositiva}
          </span>
        )}
      </div>
      {error && <span className={styles.errorText}>{error}</span>}

      {!medico?.es_organizacion && medico?.especialidades && medico.especialidades.length > 0 && (
        <div className={styles.medicoExtra}>
          <span className={styles.mutedText}>Especialidades:</span>
          {medico.especialidades.map((esp) => (
            <span key={esp.id} className={styles.especialidadChip}>{esp.nombre}</span>
          ))}
        </div>
      )}
    </div>

    {payeeEsOrganizacion && (
      <div className={`${styles.filterField} ${styles.filterFieldWide}`} data-field="medicoEjecutor">
        <label className={styles.filterLabel}>
          Médico ejecutor <span className={styles.errorText}>*</span>{" "}
          <span className={styles.sectionHint}>no cobra; fija el precio por su especialidad</span>
        </label>
        <MedicoAutocomplete
          key={`ejecutor-${ejecutorResetKey ?? 0}`}
          value={codMedicoEjecutor ?? null}
          onChange={onEjecutorChange ?? (() => {})}
          disabled={ejecutorDisabled}
          presetLabel={ejecutorPresetLabel}
          blurOnSelect={false}
        />
        {ejecutorError && <span className={styles.errorText}>{ejecutorError}</span>}

        {medicoEjecutor?.especialidades && medicoEjecutor.especialidades.length > 0 && (
          <div className={styles.medicoExtra}>
            <span className={styles.mutedText}>Especialidades:</span>
            {medicoEjecutor.especialidades.map((esp) => (
              <span key={esp.id} className={styles.especialidadChip}>{esp.nombre}</span>
            ))}
          </div>
        )}
      </div>
    )}
  </div>
);

export default MedicoSection;
