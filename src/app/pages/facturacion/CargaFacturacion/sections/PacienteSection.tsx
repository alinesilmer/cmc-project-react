import React, { useState } from "react";
import AfiliadoAutocomplete from "../../components/AfiliadoAutocomplete";
import AltaAfiliadoModal from "../../components/AltaAfiliadoModal";
import type { AfiliadoRead } from "../../types";
import styles from "../CargaFacturacion.module.scss";

interface Props {
  dni: string;
  nombrePaciente: string;
  onDniChange: (dni: string) => void;
  onAfiliadoFound: (afiliado: AfiliadoRead) => void;
  disabled?: boolean;
  error?: string | null;
}

const PacienteSection: React.FC<Props> = ({
  dni, nombrePaciente, onDniChange, onAfiliadoFound, disabled, error,
}) => {
  const [showAlta, setShowAlta] = useState(false);

  const handleAfiliadoChange = (nuevoDni: string | null, afiliado: AfiliadoRead | null) => {
    onDniChange(nuevoDni ?? "");
    if (afiliado) onAfiliadoFound(afiliado);
  };

  return (
    <div className={styles.section}>
      <span className={styles.sectionTitle}>
        Paciente / afiliado <span className={styles.sectionHint}>(opcional)</span>
      </span>
      <div className={styles.fieldsRow}>
        <div className={`${styles.filterField} ${styles.filterFieldWide}`} data-field="paciente">
          <label className={styles.filterLabel}>Paciente (nombre o DNI)</label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <AfiliadoAutocomplete
                value={dni || null}
                onChange={handleAfiliadoChange}
                disabled={disabled}
                presetLabel={nombrePaciente || undefined}
                blurOnSelect={false}
              />
            </div>
            <button type="button" className={styles.btnGhost} onClick={() => setShowAlta(true)} disabled={disabled}>
              + Agregar afiliado
            </button>
          </div>
          {nombrePaciente && (
            <span style={{ fontSize: 12, color: "#1d9148", fontWeight: 600 }}>✓ {nombrePaciente}</span>
          )}
          {error && <span className={styles.errorText}>{error}</span>}
        </div>
      </div>

      <AltaAfiliadoModal
        isOpen={showAlta}
        dni={dni}
        onClose={() => setShowAlta(false)}
        onCreated={(afiliado) => {
          setShowAlta(false);
          onAfiliadoFound(afiliado);
        }}
      />
    </div>
  );
};

export default PacienteSection;
