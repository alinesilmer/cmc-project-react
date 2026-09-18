import React from "react";
import MedicoAutocomplete from "../../components/MedicoAutocomplete";
import NomencladorAutocomplete from "../../components/NomencladorAutocomplete";
import NumericInput from "../../components/NumericInput";
import type { MedicoOption, NomencladorOption, PrecioResponse, TipoCalculo } from "../../types";
import { formatMoney, parseMoney } from "../../money";
import styles from "../CargaFacturacion.module.scss";

// Máximo 1 pediatra por prestación (decisión usuario 2026-09-17) — a diferencia de
// AyudanteLinea[] esto es una única línea, nunca un arreglo.
export interface PediatraLinea {
  id: string;
  /** Id de la prestación real cuando la línea viene de un equipo existente (al editar).
   *  null/undefined = línea nueva → se crea con POST. Mismo patrón que AyudanteLinea. */
  prestacionId?: number | null;
  codMedico: string | null;
  medico: MedicoOption | null;
  /** Código PROPIO del pediatra — NO el del cirujano. Se busca igual que el código
   *  principal: acotado a los habilitados de ESTE médico (ver NomencladorAutocomplete). */
  codNomenclador: string | null;
  /** Label del autocomplete al precargar (editar/replicar), antes de que resuelva la
   *  búsqueda por su cuenta. */
  codigoPreset?: string | null;
  porcentaje: string;
  tipoCalculo: TipoCalculo;
  precioManual: string;
  /** Nº de autorización propio — mismo criterio que en AyudanteLinea: sólo se usa con
   *  "autorización por integrante" activo. */
  autorizacion: string;
}

const nuevoId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `pe-${Date.now()}-${Math.random()}`;

export const crearPediatraLinea = (autorizacion = ""): PediatraLinea => ({
  id: nuevoId(),
  prestacionId: null,
  codMedico: null,
  medico: null,
  codNomenclador: null,
  codigoPreset: null,
  porcentaje: "100",
  tipoCalculo: "A",
  precioManual: "0",
  autorizacion,
});

// El pediatra cobra en HONORARIOS (de su propio código) — a diferencia de
// totalAyudantes, que lee `precio.ayudante` del código PRINCIPAL, acá el monto sale
// del precio del código PROPIO del pediatra (segundo lookup en CargaFacturacion.tsx).
export const montoPediatra = (linea: PediatraLinea, precioPediatra: PrecioResponse | null): number => {
  if (!precioPediatra) return 0;
  const base = linea.tipoCalculo === "A" ? parseMoney(precioPediatra.honorarios) : parseMoney(linea.precioManual);
  const porc = parseInt(linea.porcentaje, 10);
  return base * ((Number.isNaN(porc) ? 100 : porc) / 100);
};

interface Props {
  linea: PediatraLinea;
  onChange: (linea: PediatraLinea) => void;
  onQuitar: () => void;
  precioPediatra: PrecioResponse | null;
  precioPediatraLoading: boolean;
  codMedicoMain: string | null;
  /** Códigos de los otros integrantes ya cargados (cirujano + ayudantes), para no
   *  permitir que el pediatra repita a ninguno. */
  codsEquipo: Set<string>;
  disabled?: boolean;
  error?: string;
  medicosPrecargados?: MedicoOption[];
  porIntegrante?: boolean;
}

const PediatraSection: React.FC<Props> = ({
  linea, onChange, onQuitar, precioPediatra, precioPediatraLoading, codMedicoMain,
  codsEquipo, disabled, error, medicosPrecargados, porIntegrante,
}) => {
  const update = (patch: Partial<PediatraLinea>) => onChange({ ...linea, ...patch });

  const isDuplicateMain = !!(codMedicoMain && linea.codMedico === codMedicoMain);
  const isDuplicateOther = !!(linea.codMedico && codsEquipo.has(linea.codMedico));
  const monto = montoPediatra(linea, precioPediatra);

  return (
    <div className={`${styles.section} ${styles.pediatraSection}`}>
      <span className={styles.sectionTitle}>
        Pediatra
        <span className={styles.sectionHint}>recepción del recién nacido</span>
      </span>

      <div className={`${styles.ayudanteBox} ${styles.pediatraBox}`}>
        <div className={styles.ayudanteHeader}>
          <span className={styles.sectionTitle} style={{ textTransform: "none", fontSize: "0.86rem" }}>
            Pediatra
          </span>
          <button type="button" className={styles.removeBtn} onClick={onQuitar} disabled={disabled}>
            ✕ Quitar
          </button>
        </div>

        <div className={styles.fieldsRow}>
          <div className={`${styles.filterField} ${styles.filterFieldWide}`}>
            <label className={styles.filterLabel}>
              Médico pediatra <span className={styles.errorText}>*</span>
            </label>
            <MedicoAutocomplete
              value={linea.codMedico}
              onChange={(cod, med) => update({ codMedico: cod, medico: med, codNomenclador: null, codigoPreset: null })}
              disabled={disabled}
              presetLabel={
                linea.medico
                  ? [linea.medico.nombre, linea.medico.matricula]
                      .filter((v) => v != null && v !== "").join(" · ") || undefined
                  : undefined
              }
              medicosPrecargados={medicosPrecargados}
            />
            {isDuplicateMain && <span className={styles.errorText}>No puede ser el mismo médico principal.</span>}
            {isDuplicateOther && !isDuplicateMain && (
              <span className={styles.errorText}>Ese médico ya está agregado en el equipo.</span>
            )}
            {error && !isDuplicateMain && !isDuplicateOther && <span className={styles.errorText}>{error}</span>}
          </div>
        </div>

        <div className={styles.fieldsRow}>
          <div className={`${styles.filterField} ${styles.filterFieldWide}`}>
            <label className={styles.filterLabel}>
              Código que factura el pediatra <span className={styles.errorText}>*</span>
            </label>
            <NomencladorAutocomplete
              value={linea.codNomenclador}
              onChange={(cod: string | null, nom: NomencladorOption | null) =>
                update({ codNomenclador: cod, codigoPreset: nom?.descripcion ?? null })
              }
              codMedico={linea.codMedico}
              disabled={disabled || !linea.codMedico}
              presetLabel={linea.codigoPreset ?? undefined}
            />
          </div>
        </div>

        {porIntegrante && (
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Nº de autorización</label>
            <input
              className={styles.input}
              type="text"
              maxLength={30}
              value={linea.autorizacion}
              onChange={(e) => update({ autorizacion: e.target.value })}
              disabled={disabled}
              placeholder="Nº de autorización de este integrante"
            />
          </div>
        )}

        <div className={styles.filterField}>
          <label className={styles.filterLabel}>Tipo de cálculo</label>
          <div className={styles.radioRow}>
            {([["A", "Automático"], ["M", "Manual"]] as const).map(([v, label]) => (
              <label key={v} className={styles.radioLabel}>
                <input
                  type="radio"
                  name={`pediatraTipoCalculo-${linea.id}`}
                  value={v}
                  checked={linea.tipoCalculo === v}
                  onChange={() => update({ tipoCalculo: v })}
                  disabled={disabled}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className={styles.fieldsRow}>
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Porcentaje (%)</label>
            <NumericInput
              className={styles.input}
              min={1} max={100}
              value={linea.porcentaje}
              onChange={(v) => update({ porcentaje: v })}
              disabled={disabled}
            />
          </div>
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Precio del pediatra</label>
            {/* Mismo input siempre, igual que en Ayudante: en Automático muestra el
                valor de SU código (no el del cirujano) y queda bloqueado; en Manual se
                habilita. Mismo ancho que el resto de los campos del formulario. */}
            <NumericInput
              className={styles.input}
              decimals min={0}
              value={linea.tipoCalculo === "A" ? (precioPediatra?.honorarios ?? "0") : linea.precioManual}
              onChange={(v) => update({ precioManual: v })}
              disabled={disabled || linea.tipoCalculo === "A" || !linea.codNomenclador}
            />
          </div>
        </div>

        <div className={styles.totalRow}>
          <span>Total del pediatra:</span>
          <strong>{formatMoney(precioPediatraLoading ? 0 : monto)}</strong>
        </div>

        <p className={styles.mutedText} style={{ fontSize: "0.72rem" }}>
          Coseguro de esta fila: {formatMoney(0)} — siempre lo cubre el cirujano.
        </p>
      </div>
    </div>
  );
};

export default PediatraSection;
