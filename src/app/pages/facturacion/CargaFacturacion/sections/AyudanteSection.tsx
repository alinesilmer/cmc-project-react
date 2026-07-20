import React from "react";
import MedicoAutocomplete from "../../components/MedicoAutocomplete";
import type { MedicoOption, PrecioResponse, TipoCalculo } from "../../types";
import { formatMoney, parseMoney } from "../../money";
import styles from "../CargaFacturacion.module.scss";

export interface AyudanteLinea {
  id: string;
  /** Id de la prestación real cuando la línea viene de un equipo existente (al editar).
   *  null/undefined = línea nueva → se crea con POST. Sirve para reconciliar el grupo. */
  prestacionId?: number | null;
  codMedico: string | null;
  medico: MedicoOption | null;
  porcentaje: number;
  tipoCalculo: TipoCalculo;
  precioManual: string;
}

const nuevoId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `ay-${Date.now()}-${Math.random()}`;

export const crearAyudanteLinea = (precioAutomatico: string): AyudanteLinea => ({
  id: nuevoId(),
  prestacionId: null,
  codMedico: null,
  medico: null,
  porcentaje: 100,
  tipoCalculo: "A",
  precioManual: precioAutomatico,
});

const montoLinea = (linea: AyudanteLinea, precio: PrecioResponse): number => {
  const base = linea.tipoCalculo === "A" ? parseMoney(precio.ayudante) : parseMoney(linea.precioManual);
  return base * (linea.porcentaje / 100);
};

export const totalAyudantes = (lineas: AyudanteLinea[], precio: PrecioResponse | null): number => {
  if (!precio) return 0;
  return lineas.reduce((acc, l) => acc + montoLinea(l, precio), 0);
};

interface Props {
  precio: PrecioResponse;
  maxAyudantes: number;
  ayudantes: AyudanteLinea[];
  onChange: (ayudantes: AyudanteLinea[]) => void;
  codMedicoMain: string | null;
  disabled?: boolean;
  errors?: Record<string, string>;
}

const AyudanteSection: React.FC<Props> = ({
  precio, maxAyudantes, ayudantes, onChange, codMedicoMain, disabled, errors = {},
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
    <div className={styles.section}>
      <span className={styles.sectionTitle}>
        Ayudantes quirúrgicos
        <span className={`${styles.infoChip} ${styles.chipNeutral}`}>
          {ayudantes.length}
        </span>
        <span className={styles.sectionHint}>
          este código usa {maxAyudantes} ayudante{maxAyudantes === 1 ? "" : "s"}
        </span>
      </span>

      {ayudantes.map((linea, idx) => {
        const isDuplicateMain = !!(codMedicoMain && linea.codMedico === codMedicoMain);
        const isDuplicateOther = !!(linea.codMedico && codigosUsados(linea.id).has(linea.codMedico));
        const error = errors[`ayudante_${idx}`];
        const monto = montoLinea(linea, precio);

        return (
          <div key={linea.id} className={styles.ayudanteBox}>
            <div className={styles.ayudanteHeader}>
              <span className={styles.sectionTitle} style={{ textTransform: "none", fontSize: "0.86rem" }}>
                Ayudante {idx + 1}
              </span>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => quitarLinea(linea.id)}
                disabled={disabled}
              >
                ✕ Quitar
              </button>
            </div>

            <div className={styles.fieldsRow}>
              <div className={`${styles.filterField} ${styles.filterFieldWide}`}>
                <label className={styles.filterLabel}>Médico ayudante <span className={styles.errorText}>*</span></label>
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
                />
                {isDuplicateMain && <span className={styles.errorText}>No puede ser el mismo médico principal.</span>}
                {isDuplicateOther && !isDuplicateMain && <span className={styles.errorText}>Ese médico ya está agregado como ayudante.</span>}
                {error && !isDuplicateMain && !isDuplicateOther && <span className={styles.errorText}>{error}</span>}
              </div>
            </div>

            <div className={styles.filterField}>
              <label className={styles.filterLabel}>Tipo de cálculo</label>
              <div className={styles.radioRow}>
                {([["A", "Automático"], ["M", "Manual"]] as const).map(([v, label]) => (
                  <label key={v} className={styles.radioLabel}>
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

            <div className={styles.fieldsRow}>
              <div className={styles.filterField}>
                <label className={styles.filterLabel}>Porcentaje (%)</label>
                <input
                  className={styles.input}
                  type="number" min={1} max={100}
                  value={linea.porcentaje}
                  onChange={(e) => updateLinea(linea.id, { porcentaje: Math.min(100, Math.max(1, Number(e.target.value))) })}
                  disabled={disabled}
                />
              </div>
              <div className={styles.filterField}>
                <label className={styles.filterLabel}>Precio del ayudante</label>
                {/* Mismo input siempre: en Automático muestra el valor del código y
                    queda bloqueado; en Manual se habilita para editarlo. */}
                <input
                  className={styles.input}
                  type="number" min={0} step="0.01"
                  value={linea.tipoCalculo === "A" ? precio.ayudante : linea.precioManual}
                  onChange={(e) => updateLinea(linea.id, { precioManual: e.target.value })}
                  disabled={disabled || linea.tipoCalculo === "A"}
                />
              </div>
            </div>

            <div className={styles.totalRow}>
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
        <span className={styles.sectionHint}>(valor automático: {formatMoney(precio.ayudante)})</span>
      </button>
    </div>
  );
};

export default AyudanteSection;
