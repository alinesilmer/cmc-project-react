import styles from "./NomencladorPorOS.module.scss";
import type { GalenoOut } from "../nomenclador.types";
import type { ModalidadValor, PrecioForm } from "./porOS.types";
import { ComponentEditor } from "./ComponentEditor";
import type { CompEditorProps } from "./ComponentEditor";

// ─── BloquePrecio: tipo de valor + componentes + coseguro ──────────────────────

export function BloquePrecio({
  precio,
  conTipo,
  soloCoseguro = false,
  galenos,
  errors,
  onModalidad,
  onCoseguro,
  onComp,
}: {
  precio: PrecioForm;
  /** NN no elige tipo: siempre galeno × unidades. */
  conTipo: boolean;
  /** Por presupuesto: no hay fórmula, sólo coseguro. */
  soloCoseguro?: boolean;
  galenos: GalenoOut[];
  errors: Record<string, string>;
  onModalidad: (m: ModalidadValor) => void;
  onCoseguro: (v: string) => void;
  onComp: CompEditorProps["onChange"];
}) {
  return (
    <>
      <div className={styles.formRow2}>
        {conTipo && !soloCoseguro && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Tipo de valor</label>
            <select
              className={styles.formSelect}
              value={precio.modalidad}
              onChange={(e) => onModalidad(e.target.value as ModalidadValor)}
            >
              <option value="calculable">Calculable (galeno × cantidad)</option>
              <option value="fijo">Fijo ($)</option>
            </select>
          </div>
        )}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Coseguro ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className={`${styles.formInput} ${errors.coseguro ? styles.inputError : ""}`}
            value={precio.coseguro}
            onChange={(e) => onCoseguro(e.target.value)}
            placeholder="0.00"
          />
          {errors.coseguro ? (
            <span className={styles.errorMsg}>{errors.coseguro}</span>
          ) : (
            <span className={styles.hintText}>
              Lo que el afiliado paga de su bolsillo; se descuenta del total al facturar
            </span>
          )}
        </div>
      </div>
      {!soloCoseguro && (
        <ComponentEditor
          modalidad={precio.modalidad}
          componentes={precio.componentes}
          galenos={galenos}
          errors={errors}
          onChange={onComp}
        />
      )}
    </>
  );
}
