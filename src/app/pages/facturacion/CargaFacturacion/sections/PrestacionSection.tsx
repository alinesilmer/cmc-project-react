import React from "react";
import NomencladorAutocomplete from "../../components/NomencladorAutocomplete";
import PrecioPreviewCard from "../../components/PrecioPreviewCard";
import type { NomencladorOption, PrecioResponse, ViaPractica } from "../../types";
import CircularProgress from "@mui/material/CircularProgress";
import comun from "../Comun.module.scss";
import styles from "./PrestacionSection.module.scss";;

interface Props {
  codNomenclador: string | null;
  onNomencladorChange: (codigo: string | null, nom: NomencladorOption | null) => void;
  codMedico: string | null;
  /** Obra social de la prestación — habilita que el autocomplete muestre la descripción que esa OS pactó en vez de la genérica del catálogo. */
  codObra?: string | null;
  precio: PrecioResponse | null;
  precioLoading: boolean;
  precioError: string | null;
  via: ViaPractica;
  onViaChange: (via: ViaPractica) => void;
  onVolverATradicional?: () => void;
  /** Solo los códigos que admiten laparoscopía (lo informa la API) ofrecen elegir vía. */
  mostrarVia: boolean;
  disabled?: boolean;
  errors?: Record<string, string>;
  presetLabel?: string;
  blockedHint?: string;
}

const PrestacionSection: React.FC<Props> = ({
  codNomenclador, onNomencladorChange, codMedico, codObra, precio, precioLoading, precioError,
  via, onViaChange, onVolverATradicional, mostrarVia,
  disabled, errors = {}, presetLabel, blockedHint,
}) => (
  <div className={comun.section}>
    <span className={comun.sectionTitle}>Prestación</span>
    <div className={`${comun.filterField} ${comun.filterFieldWide}`} data-field="codigo">
      <label className={comun.filterLabel}>
        Código <span className={comun.errorText}>*</span>
        {precioLoading && <CircularProgress size={12} style={{ marginLeft: 8 }} />}
      </label>
      <NomencladorAutocomplete
        value={codNomenclador}
        onChange={onNomencladorChange}
        codMedico={codMedico}
        codObra={codObra}
        disabled={disabled}
        presetLabel={presetLabel}
        blurOnSelect={false}
      />
      {blockedHint && <span className={comun.mutedText}>{blockedHint}</span>}
      {errors.codNomenclador && <span className={comun.errorText}>{errors.codNomenclador}</span>}
    </div>

    {mostrarVia && (
      <div className={comun.filterField}>
        <label className={comun.filterLabel}>Vía</label>
        <div className={styles.radioColumn}>
          {(
            [
              ["T", "Tradicional"],
              ["L", "Laparoscópica"],
            ] as const
          ).map(([v, label]) => (
            <label key={v} className={comun.radioLabel}>
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

    {precioError && <div className={comun.errorText}>{precioError}</div>}
    {precio && !precioLoading && (
      <PrecioPreviewCard precio={precio} onVolverATradicional={onVolverATradicional} />
    )}
  </div>
);

export default PrestacionSection;
