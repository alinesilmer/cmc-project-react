import React from "react";
import MedicoAutocomplete from "../../components/MedicoAutocomplete";
import NumericInput from "../../components/NumericInput";
import type { MedicoOption, PrecioResponse, TipoCalculo } from "../../types";
import { formatMoney } from "../../money";
import comun from "../Comun.module.scss";
import styles from "./AyudanteSection.module.scss";;
import { X } from "lucide-react";
import { crearAyudanteLinea, montoLinea } from "./ayudante.helpers";

export interface AyudanteLinea {
  id: string;
  /** Id de la prestación real cuando la línea viene de un equipo existente (al editar). null/undefined = línea nueva → se crea con POST. */
  prestacionId?: number | null;
  codMedico: string | null;
  medico: MedicoOption | null;
  porcentaje: string;
  tipoCalculo: TipoCalculo;
  precioManual: string;
  /** Nº de autorización propio de este integrante. */
  autorizacion: string;
}

interface Props {
  precio: PrecioResponse;
  maxAyudantes: number;
  ayudantes: AyudanteLinea[];
  onChange: (ayudantes: AyudanteLinea[]) => void;
  codMedicoMain: string | null;
  disabled?: boolean;
  errors?: Record<string, string>;
  /** Lista completa precargada por CargaFacturacion.tsx — ver MedicoAutocomplete. */
  medicosPrecargados?: MedicoOption[];
  /** true → cada ayudante lleva su propio Nº de autorización (input propio); false → la sección no lo pide. */
  porIntegrante?: boolean;
}

const AyudanteSection: React.FC<Props> = ({
  precio, maxAyudantes, ayudantes, onChange, codMedicoMain, disabled, errors = {},
  medicosPrecargados, porIntegrante,
}) => {
  const updateLinea = (id: string, patch: Partial<AyudanteLinea>) => {
    onChange(ayudantes.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const quitarLinea = (id: string) => {
    onChange(ayudantes.filter((l) => l.id !== id));
  };

  // maxAyudantes es solo una referencia del código: no bloquea el alta de más líneas.
  const agregarLinea = () => {
    onChange([...ayudantes, crearAyudanteLinea(precio.ayudante)]);
  };

  const codigosUsados = (excluirId: string) =>
    new Set(ayudantes.filter((l) => l.id !== excluirId && l.codMedico).map((l) => l.codMedico));

  return (
    <div className={comun.section}>
      <span className={comun.sectionTitle}>
        Ayudantes quirúrgicos
        <span className={`${comun.infoChip} ${comun.chipNeutral}`}>
          {ayudantes.length}
        </span>
        {maxAyudantes > 0 && (
          <span className={comun.sectionHint}>
            este código usa {maxAyudantes} ayudante{maxAyudantes === 1 ? "" : "s"}
          </span>
        )}
      </span>

      {ayudantes.map((linea, idx) => {
        const isDuplicateMain = !!(codMedicoMain && linea.codMedico === codMedicoMain);
        const isDuplicateOther = !!(linea.codMedico && codigosUsados(linea.id).has(linea.codMedico));
        const error = errors[`ayudante_${idx}`];
        const monto = montoLinea(linea, precio);

        return (
          <div key={linea.id} className={comun.ayudanteBox}>
            <div className={comun.ayudanteHeader}>
              <span className={comun.sectionTitle} style={{ textTransform: "none", fontSize: "0.86rem" }}>
                Ayudante {idx + 1}
              </span>
              <button
                type="button"
                className={comun.removeBtn}
                onClick={() => quitarLinea(linea.id)}
                disabled={disabled}
              >
                <X size={16} style={{ verticalAlign: "-2px" }} aria-hidden="true" /> Quitar
              </button>
            </div>

            <div className={comun.fieldsRow}>
              <div className={`${comun.filterField} ${comun.filterFieldWide}`}>
                <label className={comun.filterLabel}>Médico ayudante <span className={comun.errorText}>*</span></label>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <MedicoAutocomplete
                      value={linea.codMedico}
                      onChange={(cod, med) => updateLinea(linea.id, { codMedico: cod, medico: med })}
                      disabled={disabled}
                      // Precarga el texto cuando la línea viene de replicar/editar un equipo.
                      presetLabel={
                        linea.medico
                          ? [linea.medico.nombre, linea.medico.matricula]
                              .filter((v) => v != null && v !== "").join(" · ") || undefined
                          : undefined
                      }
                      medicosPrecargados={medicosPrecargados}
                    />
                  </div>
                  {linea.medico?.condicion_impositiva && (
                    <span className={`${comun.infoChip} ${comun.chipNeutral}`} style={{ flexShrink: 0 }}>
                      {linea.medico.condicion_impositiva}
                    </span>
                  )}
                </div>
                {linea.medico?.especialidades && linea.medico.especialidades.length > 0 && (
                  <div className={comun.medicoExtra}>
                    <span className={comun.mutedText}>Especialidades:</span>
                    {linea.medico.especialidades.map((esp) => (
                      <span key={esp.id} className={comun.especialidadChip}>{esp.nombre}</span>
                    ))}
                  </div>
                )}
                {isDuplicateMain && <span className={comun.errorText}>No puede ser el mismo médico principal.</span>}
                {isDuplicateOther && !isDuplicateMain && <span className={comun.errorText}>Ese médico ya está agregado como ayudante.</span>}
                {error && !isDuplicateMain && !isDuplicateOther && <span className={comun.errorText}>{error}</span>}
              </div>
            </div>

            {porIntegrante && (
              <div className={comun.filterField}>
                <label className={comun.filterLabel}>Nº de autorización</label>
                <input
                  className={comun.input}
                  type="text"
                  maxLength={30}
                  value={linea.autorizacion}
                  onChange={(e) => updateLinea(linea.id, { autorizacion: e.target.value })}
                  disabled={disabled}
                  placeholder="Nº de autorización de este integrante"
                />
              </div>
            )}

            <div className={comun.filterField}>
              <label className={comun.filterLabel}>Tipo de cálculo</label>
              <div className={comun.radioRow}>
                {([["A", "Automático"], ["M", "Manual"]] as const).map(([v, label]) => (
                  <label key={v} className={comun.radioLabel}>
                    <input
                      type="radio"
                      name={`ayudanteTipoCalculo-${linea.id}`}
                      value={v}
                      checked={linea.tipoCalculo === v}
                      onChange={() => updateLinea(linea.id, { tipoCalculo: v })}
                      disabled={disabled}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className={comun.fieldsRow}>
              <div className={comun.filterField}>
                <label className={comun.filterLabel}>Porcentaje (%)</label>
                <NumericInput
                  className={comun.input}
                  min={1}
                  value={linea.porcentaje}
                  onChange={(v) => updateLinea(linea.id, { porcentaje: v })}
                  disabled={disabled}
                />
              </div>
              <div className={comun.filterField}>
                <label className={comun.filterLabel}>Precio del ayudante</label>
                {/* Mismo input siempre: en Automático muestra el valor del código y queda bloqueado; en Manual se habilita para editarlo. */}
                <NumericInput
                  className={comun.input}
                  decimals min={0}
                  value={linea.tipoCalculo === "A" ? precio.ayudante : linea.precioManual}
                  onChange={(v) => updateLinea(linea.id, { precioManual: v })}
                  disabled={disabled || linea.tipoCalculo === "A"}
                />
              </div>
            </div>

            <div className={comun.totalRow}>
              <span>Total de este ayudante:</span>
              <strong>{formatMoney(monto)}</strong>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        className={styles.addAyudanteBtn}
        onClick={agregarLinea}
        disabled={disabled}
      >
        <span style={{ fontSize: 16 }}>+</span>
        <span>Agregar ayudante</span>
        <span className={comun.sectionHint}>(valor automático: {formatMoney(precio.ayudante)})</span>
      </button>
    </div>
  );
};

export default AyudanteSection;
