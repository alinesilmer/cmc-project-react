import { useMemo } from "react";
import styles from "./NomencladorPorOS.module.scss";
import type { GalenoOut } from "../nomenclador.types";
import { parseMonto, compararGalenos } from "../nomenclador.helpers";
import { formatoPesos } from "@/app/shared/lib/formatos";
import type { ModalidadValor, ComponenteForm } from "./porOS.types";

// ─── ComponentEditor (shared between create and edit) ─────────────────────────

export type CompEditorProps = {
  modalidad: ModalidadValor;
  componentes: ComponenteForm[];
  galenos: GalenoOut[];
  errors: Record<string, string>;
  onChange: (
    idx: number,
    key: keyof ComponenteForm,
    value: ComponenteForm[keyof ComponenteForm],
  ) => void;
};

export function ComponentEditor({
  modalidad,
  componentes,
  galenos,
  errors,
  onChange,
}: CompEditorProps) {
  // Los activos, en el orden del boletín y con los niveles seguidos.
  const galenosOrdenados = useMemo(
    () =>
      galenos
        .filter((g) => g.activo)
        .sort(
          (a, b) => compararGalenos(a, b) || (a.nivel ?? 0) - (b.nivel ?? 0),
        ),
    [galenos],
  );

  const galenoPorId = useMemo(
    () => new Map(galenos.map((g) => [g.id, g])),
    [galenos],
  );

  // Subtotal orientativo: galeno × cantidad (calculable) o el valor fijo.
  function subtotal(comp: ComponenteForm): number | null {
    if (modalidad === "fijo") {
      const v = parseFloat(comp.valor_unitario);
      return isNaN(v) ? null : v;
    }
    const g =
      comp.galeno_id != null ? galenoPorId.get(comp.galeno_id) : undefined;
    const cant = parseFloat(comp.cantidad);
    if (!g || isNaN(cant) || cant <= 0) return null;
    return parseMonto(g.valor_unitario) * cant;
  }

  const subtotales = componentes.map(subtotal);
  const total = subtotales.reduce<number>((acc, v) => acc + (v ?? 0), 0);
  const hayAuto =
    modalidad === "calculable" &&
    componentes.some((c, i) => c.galeno_id != null && subtotales[i] == null);

  return (
    <div className={styles.componentRows}>
      {componentes.map((comp, i) => {
        const errGaleno = errors[`comp_${i}_galeno`];
        const errValor = errors[`comp_${i}_valor`];
        const sub = subtotales[i];
        return (
          <div key={comp.concepto} className={styles.componentCard}>
            <div className={styles.componentCardHead}>
              <span className={styles.compConceptLabel}>
                {comp.concepto}
                {i === 0 ? (
                  <span className={styles.req}> *</span>
                ) : (
                  <span className={styles.compOpcional}>opcional</span>
                )}
              </span>
              <span className={styles.compSubtotal}>
                {sub != null
                  ? formatoPesos.format(sub)
                  : modalidad === "calculable" && comp.galeno_id != null
                    ? "Unidades automáticas"
                    : "—"}
              </span>
            </div>

            {modalidad === "calculable" ? (
              <div className={styles.componentFields}>
                <div className={styles.formGroup}>
                  <label
                    className={styles.formLabel}
                    htmlFor={`comp-${i}-galeno`}
                  >
                    Galeno
                  </label>
                  <select
                    id={`comp-${i}-galeno`}
                    className={`${styles.formSelect} ${styles.compControl} ${errGaleno ? styles.inputError : ""}`}
                    value={comp.galeno_id ?? ""}
                    onChange={(e) =>
                      onChange(
                        i,
                        "galeno_id",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                  >
                    <option value="">
                      — {i === 0 ? "Seleccionar" : "Sin galeno"} —
                    </option>
                    {galenosOrdenados.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.codigo}
                        {g.nivel != null ? ` (niv. ${g.nivel})` : ""} —{" "}
                        {formatoPesos.format(parseMonto(g.valor_unitario))}
                      </option>
                    ))}
                  </select>
                  {errGaleno && (
                    <span className={styles.errorMsg}>{errGaleno}</span>
                  )}
                </div>
                <div className={styles.formGroup}>
                  <label
                    className={styles.formLabel}
                    htmlFor={`comp-${i}-cantidad`}
                  >
                    Cantidad
                  </label>
                  <input
                    id={`comp-${i}-cantidad`}
                    type="number"
                    min="0"
                    step="0.01"
                    className={`${styles.formInput} ${styles.compControl}`}
                    value={comp.cantidad}
                    onChange={(e) => onChange(i, "cantidad", e.target.value)}
                    placeholder="0 = automático"
                  />
                </div>
              </div>
            ) : (
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor={`comp-${i}-valor`}>
                  Valor fijo ($)
                </label>
                <input
                  id={`comp-${i}-valor`}
                  type="number"
                  min="0"
                  step="0.01"
                  className={`${styles.formInput} ${styles.compControl} ${errValor ? styles.inputError : ""}`}
                  value={comp.valor_unitario}
                  onChange={(e) =>
                    onChange(i, "valor_unitario", e.target.value)
                  }
                  placeholder={i === 0 ? "0.00" : "Vacío si no aplica"}
                />
                {errValor && (
                  <span className={styles.errorMsg}>{errValor}</span>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div className={styles.componentTotal}>
        <span>Total estimado</span>
        <strong>{formatoPesos.format(total)}</strong>
      </div>
      {hayAuto && (
        <span className={styles.hintText}>
          Los componentes con cantidad en 0 toman las unidades del galeno o del
          código al guardar; si no tienen, quedan en 0. El total no las incluye.
        </span>
      )}
    </div>
  );
}
