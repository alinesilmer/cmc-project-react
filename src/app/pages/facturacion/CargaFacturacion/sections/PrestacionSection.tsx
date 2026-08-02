import React from "react";
import NomencladorAutocomplete from "../../components/NomencladorAutocomplete";
import PrecioPreviewCard from "../../components/PrecioPreviewCard";
import type { NomencladorOption, PrecioResponse, ViaPractica } from "../../types";
import CircularProgress from "@mui/material/CircularProgress";
import styles from "../CargaFacturacion.module.scss";

interface Props {
  codNomenclador: string | null;
  onNomencladorChange: (codigo: string | null, nom: NomencladorOption | null) => void;
  codMedico: string | null;
  precio: PrecioResponse | null;
  precioLoading: boolean;
  precioError: string | null;
  via: ViaPractica;
  onViaChange: (via: ViaPractica) => void;
  onVolverATradicional?: () => void;
  /** Solo los códigos de categoría "Honorarios individuales" admiten elegir vía. */
  mostrarVia: boolean;
  disabled?: boolean;
  errors?: Record<string, string>;
  presetLabel?: string;
  blockedHint?: string;
}

const PrestacionSection: React.FC<Props> = ({
  codNomenclador, onNomencladorChange, codMedico, precio, precioLoading, precioError,
  via, onViaChange, onVolverATradicional, mostrarVia,
  disabled, errors = {}, presetLabel, blockedHint,
}) => (
  <div className={styles.section}>
    <span className={styles.sectionTitle}>Prestación</span>
    <div className={`${styles.filterField} ${styles.filterFieldWide}`} data-field="codigo">
      <label className={styles.filterLabel}>
        Código <span className={styles.errorText}>*</span>
        {precioLoading && <CircularProgress size={12} style={{ marginLeft: 8 }} />}
      </label>
      <NomencladorAutocomplete
        value={codNomenclador}
        onChange={onNomencladorChange}
        codMedico={codMedico}
        disabled={disabled}
        presetLabel={presetLabel}
        blurOnSelect={false}
      />
      {blockedHint && <span className={styles.mutedText}>{blockedHint}</span>}
      {errors.codNomenclador && <span className={styles.errorText}>{errors.codNomenclador}</span>}
    </div>

    {mostrarVia && (
      <div className={styles.filterField}>
        <label className={styles.filterLabel}>Vía</label>
        <div className={styles.radioColumn}>
          {(
            [
              ["T", "Tradicional"],
              ["L", "Laparoscópica"],
            ] as const
          ).map(([v, label]) => (
            <label key={v} className={styles.radioLabel}>
              <input
                type="radio"
                name="via"
                value={v}
                checked={via === v}
                onChange={() => onViaChange(v)}
                disabled={disabled || !codNomenclador}
              />
              {label}
            </label>
          ))}
        </div>
      </div>
    )}

    {precioError && <div className={styles.errorText}>{precioError}</div>}
    {precio && !precioLoading && (
      <PrecioPreviewCard precio={precio} onVolverATradicional={onVolverATradicional} />
    )}
  </div>
);

export default PrestacionSection;
