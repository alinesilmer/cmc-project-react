import React, { useState } from "react";
import ObraSocialAutocomplete from "../../components/ObraSocialAutocomplete";
import type { ObraSocialOption, PeriodoActivoResponse } from "../../types";
import comun from "../Comun.module.scss";
import styles from "./DatosGeneralesSection.module.scss";;
import { AlertTriangle } from "lucide-react";

/** "202606" → "2026-06" (input type=month). */
const periodoToMonthInput = (periodo: string) =>
  periodo.length === 6 ? `${periodo.slice(0, 4)}-${periodo.slice(4)}` : "";

/** "2026-06" → "202606". */
const monthInputToPeriodo = (v: string) => v.replace("-", "");

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** "202606" → "Junio 2026". */
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
  /** Lista completa precargada por CargaFacturacion.tsx — ver ObraSocialAutocomplete. */
  obrasSocialesPrecargadas?: ObraSocialOption[];
}

const DatosGeneralesSection: React.FC<Props> = ({
  obraSocial, onObraSocialChange, periodo, periodoError, disabled,
  periodoOverride, onPeriodoOverrideChange, obrasSocialesPrecargadas,
}) => {
  const [editando, setEditando] = useState(false);

  // El automático es el piso: un período editado no puede ser anterior.
  const automatico = periodo?.periodo ?? null;
  const fueraDeRango = !!automatico && !!periodoOverride && periodoOverride < automatico;

  const periodoMostrado = periodoOverride ?? automatico;
  const labelMostrado =
    periodoOverride && periodoOverride !== automatico
      ? periodoLabel(periodoOverride)
      : (periodo?.periodo_label ?? (periodoMostrado ? periodoLabel(periodoMostrado) : null));

  return (
    <div className={comun.section}>
      <span className={comun.sectionTitle}>Datos generales</span>
      <div className={comun.fieldsRow}>
        <div className={`${comun.filterField} ${comun.filterFieldWide}`} data-field="obraSocial">
          <label className={comun.filterLabel}>Obra social <span className={comun.errorText}>*</span></label>
          <ObraSocialAutocomplete
            value={obraSocial?.nro_obra_social ?? null}
            onChange={(nro, os) => {
              onObraSocialChange(nro, os);
              // El automático de la OS nueva puede ser cualquier otro período: el override anterior deja de tener sentido.
              onPeriodoOverrideChange(null);
              setEditando(false);
            }}
            disabled={disabled}
            blurOnSelect={false}
            presetLabel={obraSocial?.nombre}
            obrasSocialesPrecargadas={obrasSocialesPrecargadas}
          />
        </div>
        <div className={comun.filterField}>
          <label className={comun.filterLabel}>Período{periodoOverride ? " (editado)" : " activo"}</label>
          {labelMostrado ? (
            <span className={`${comun.infoChip} ${periodoOverride ? styles.chipWarning : comun.chipNeutral}`}>
              {labelMostrado}
            </span>
          ) : (
            <span className={comun.mutedText}>— (seleccioná una obra social)</span>
          )}
          {/* Sin automático (obra social sin período cerrado previo, ver periodoError) no hay nada que ofrecer como sugerencia . */}
          {(automatico || periodoError) && !editando && (
            <button
              type="button"
              className={comun.periodoLinkBtn}
              onClick={() => setEditando(true)}
              disabled={disabled}
            >
              {automatico ? "Modificar período" : "Elegir período"}
            </button>
          )}
          {editando && (
            <div className={styles.periodoEditorRow}>
              <input
                type="month"
                className={comun.input}
                value={periodoMostrado ? periodoToMonthInput(periodoMostrado) : ""}
                onChange={(e) =>
                  onPeriodoOverrideChange(e.target.value ? monthInputToPeriodo(e.target.value) : null)
                }
                disabled={disabled}
              />
              {automatico && (
                <button
                  type="button"
                  className={comun.periodoLinkBtn}
                  onClick={() => {
                    onPeriodoOverrideChange(null);
                    setEditando(false);
                  }}
                  disabled={disabled}
                >
                  Usar automático
                </button>
              )}
            </div>
          )}
          {fueraDeRango && (
            <span className={comun.errorText}>
              No puede ser anterior a {periodo?.periodo_label} (el período sugerido).
            </span>
          )}
        </div>
      </div>
      {periodoError && <div className={comun.errorBox}><AlertTriangle size={14} style={{ verticalAlign: "-2px" }} aria-hidden="true" /> {periodoError}</div>}
    </div>
  );
};

export default DatosGeneralesSection;
