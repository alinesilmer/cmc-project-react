import React, { useState } from "react";
import ObraSocialAutocomplete from "../../components/ObraSocialAutocomplete";
import type { ObraSocialOption, PeriodoActivoResponse } from "../../types";
import styles from "../CargaFacturacion.module.scss";

/** "202606" → "2026-06" (input type=month). */
const periodoToMonthInput = (periodo: string) =>
  periodo.length === 6 ? `${periodo.slice(0, 4)}-${periodo.slice(4)}` : "";

/** "2026-06" → "202606". */
const monthInputToPeriodo = (v: string) => v.replace("-", "");

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** "202606" → "Junio 2026". Fallback simple para períodos editados a mano, que no
 *  traen `periodo_label` del backend (ese label solo viene con el automático). */
const periodoLabel = (periodo: string) => {
  const anio = periodo.slice(0, 4);
  const mes = Number(periodo.slice(4, 6));
  return MESES[mes - 1] ? `${MESES[mes - 1]} ${anio}` : periodo;
};

interface Props {
  obraSocial: ObraSocialOption | null;
  onObraSocialChange: (nro: number | null, os: ObraSocialOption | null) => void;
  periodo: PeriodoActivoResponse | null;
  periodoError: string | null;
  disabled?: boolean;
  /** Período elegido a mano (YYYYMM), o null para usar el automático. */
  periodoOverride: string | null;
  onPeriodoOverrideChange: (periodo: string | null) => void;
}

const DatosGeneralesSection: React.FC<Props> = ({
  obraSocial, onObraSocialChange, periodo, periodoError, disabled,
  periodoOverride, onPeriodoOverrideChange,
}) => {
  const [editando, setEditando] = useState(false);

  // El automático es el piso: un período editado no puede ser anterior (el backend
  // devuelve 422 si se manda uno menor a "último cerrado + 1").
  const automatico = periodo?.periodo ?? null;
  const fueraDeRango = !!automatico && !!periodoOverride && periodoOverride < automatico;

  const periodoMostrado = periodoOverride ?? automatico;
  const labelMostrado =
    periodoOverride && periodoOverride !== automatico
      ? periodoLabel(periodoOverride)
      : (periodo?.periodo_label ?? (periodoMostrado ? periodoLabel(periodoMostrado) : null));

  return (
    <div className={styles.section}>
      <span className={styles.sectionTitle}>Datos generales</span>
      <div className={styles.fieldsRow}>
        <div className={`${styles.filterField} ${styles.filterFieldWide}`} data-field="obraSocial">
          <label className={styles.filterLabel}>Obra social <span className={styles.errorText}>*</span></label>
          <ObraSocialAutocomplete
            value={obraSocial?.nro_obra_social ?? null}
            onChange={(nro, os) => {
              onObraSocialChange(nro, os);
              // El automático de la OS nueva puede ser cualquier otro período: el
              // override anterior deja de tener sentido.
              onPeriodoOverrideChange(null);
              setEditando(false);
            }}
            disabled={disabled}
            blurOnSelect={false}
            presetLabel={obraSocial?.nombre}
          />
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel}>Período{periodoOverride ? " (editado)" : " activo"}</label>
          {labelMostrado ? (
            <span className={`${styles.infoChip} ${periodoOverride ? styles.chipWarning : styles.chipNeutral}`}>
              {labelMostrado}
            </span>
          ) : (
            <span className={styles.mutedText}>— (seleccioná una obra social)</span>
          )}
          {automatico && !editando && (
            <button
              type="button"
              className={styles.periodoLinkBtn}
              onClick={() => setEditando(true)}
              disabled={disabled}
            >
              Modificar período
            </button>
          )}
          {editando && (
            <div className={styles.periodoEditorRow}>
              <input
                type="month"
                className={styles.input}
                value={periodoMostrado ? periodoToMonthInput(periodoMostrado) : ""}
                onChange={(e) =>
                  onPeriodoOverrideChange(e.target.value ? monthInputToPeriodo(e.target.value) : null)
                }
                disabled={disabled}
              />
              <button
                type="button"
                className={styles.periodoLinkBtn}
                onClick={() => {
                  onPeriodoOverrideChange(null);
                  setEditando(false);
                }}
                disabled={disabled}
              >
                Usar automático
              </button>
            </div>
          )}
          {fueraDeRango && (
            <span className={styles.errorText}>
              No puede ser anterior a {periodo?.periodo_label} (el período sugerido).
            </span>
          )}
        </div>
      </div>
      {periodoError && <div className={styles.errorBox}>⚠ {periodoError}</div>}
    </div>
  );
};

export default DatosGeneralesSection;
