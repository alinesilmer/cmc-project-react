import styles from "./NomencladorPorOS.module.scss";
import { ORIGEN_LABELS, type Origen } from "../nomenclador.types";
import type { PorOSCtx } from "./useNomencladorPorOS";

export default function ModalCrearDescripcion({ ctx }: { ctx: PorOSCtx }) {
  const { form, setForm, errors, setErrors, parAlta, existentes, changeOrigen } = ctx;
  return (
    <>
      {/* Descripción — obligatoria: cómo nombra ESTA obra social al código. */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>
          Descripción <span className={styles.req}>*</span>
        </label>
        <input
          className={`${styles.formInput} ${errors.descripcion ? styles.inputError : ""}`}
          value={form.descripcion}
          readOnly={!!parAlta?.descripcion}
          onChange={(e) => {
            setForm((p) => ({ ...p, descripcion: e.target.value }));
            setErrors((p) => ({ ...p, descripcion: "" }));
          }}
          placeholder="Cómo nombra esta obra social al código"
        />
        {parAlta?.descripcion && (
          <span className={styles.hintText}>Viene del alta del código en la obra social; se edita en Códigos por obra social.</span>
        )}
        {errors.descripcion && (
          <span className={styles.errorMsg}>
            {errors.descripcion}
          </span>
        )}
      </div>

      {/* Origen */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>
          Origen <span className={styles.req}>*</span>
        </label>
        <select
          className={`${styles.formSelect} ${errors.origen ? styles.inputError : ""}`}
          value={form.origen}
          onChange={(e) => {
            changeOrigen(e.target.value as Origen);
            setErrors((p) => ({ ...p, origen: "" }));
          }}
        >
          {(
            Object.entries(ORIGEN_LABELS) as [Origen, string][]
          ).map(([k, label]) => (
            <option key={k} value={k}>
              {label} ({k})
            </option>
          ))}
        </select>
        {form.origen === "NN" && existentes?.nn && (
          <span className={styles.avisoPrecio}>
            Este código ya tiene precio NN en esta obra social. Para cambiarlo usá el lápiz del código.
          </span>
        )}
        {errors.origen && !existentes?.nn && (
          <span className={styles.errorMsg}>{errors.origen}</span>
        )}
      </div>
    </>
  );
}
