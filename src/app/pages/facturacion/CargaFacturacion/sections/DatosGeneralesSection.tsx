import React from "react";
import ObraSocialAutocomplete from "../../components/ObraSocialAutocomplete";
import type { ObraSocialOption, PeriodoActivoResponse } from "../../types";
import styles from "../CargaFacturacion.module.scss";

interface Props {
  obraSocial: ObraSocialOption | null;
  onObraSocialChange: (nro: number | null, os: ObraSocialOption | null) => void;
  periodo: PeriodoActivoResponse | null;
  periodoError: string | null;
  disabled?: boolean;
}

const DatosGeneralesSection: React.FC<Props> = ({
  obraSocial, onObraSocialChange, periodo, periodoError, disabled,
}) => (
  <div className={styles.section}>
    <span className={styles.sectionTitle}>Datos generales</span>
    <div className={styles.fieldsRow}>
      <div className={`${styles.filterField} ${styles.filterFieldWide}`} data-field="obraSocial">
        <label className={styles.filterLabel}>Obra social <span className={styles.errorText}>*</span></label>
        <ObraSocialAutocomplete
          value={obraSocial?.nro_obra_social ?? null}
          onChange={onObraSocialChange}
          disabled={disabled}
          blurOnSelect={false}
        />
      </div>
      <div className={styles.filterField}>
        <label className={styles.filterLabel}>Período activo</label>
        {periodo ? (
          <span className={`${styles.infoChip} ${styles.chipNeutral}`}>{periodo.periodo_label}</span>
        ) : (
          <span className={styles.mutedText}>— (seleccioná una obra social)</span>
        )}
      </div>
    </div>
    {periodoError && <div className={styles.errorBox}>⚠ {periodoError}</div>}
  </div>
);

export default DatosGeneralesSection;
