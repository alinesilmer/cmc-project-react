import React from "react";
import NomencladorAutocomplete from "../../components/NomencladorAutocomplete";
import PrecioPreviewCard from "../../components/PrecioPreviewCard";
import type { NomencladorOption, PrecioResponse } from "../../types";
import CircularProgress from "@mui/material/CircularProgress";
import styles from "../CargaFacturacion.module.scss";

interface Props {
  codNomenclador: string | null;
  onNomencladorChange: (codigo: string | null, nom: NomencladorOption | null) => void;
  codMedico: string | null;
  precio: PrecioResponse | null;
  precioLoading: boolean;
  precioError: string | null;
  disabled?: boolean;
  errors?: Record<string, string>;
  presetLabel?: string;
  blockedHint?: string;
}

const PrestacionSection: React.FC<Props> = ({
  codNomenclador, onNomencladorChange, codMedico, precio, precioLoading, precioError,
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

    {precioError && <div className={styles.errorText}>{precioError}</div>}
    {precio && !precioLoading && <PrecioPreviewCard precio={precio} />}
  </div>
);

export default PrestacionSection;
