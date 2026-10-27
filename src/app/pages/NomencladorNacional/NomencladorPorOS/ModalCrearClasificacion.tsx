import styles from "./NomencladorPorOS.module.scss";
import MultiSelectBuscable from "@/app/components/molecules/MultiSelectBuscable/MultiSelectBuscable";
import CampoFecha from "@/app/components/ui/CampoFecha/CampoFecha";
import type { PorOSCtx } from "./useNomencladorPorOS";

export default function ModalCrearClasificacion({ ctx }: { ctx: PorOSCtx }) {
  const { form, setForm, errors, setErrors, parAlta, existentes, espOptionsAlta, bloqueadasPorPrecio, nivelCreate, cambiarEspecialidades } = ctx;
  return (
    <>
      {/* Especialidades — solo NE. */}
      {form.origen === "NE" && (
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Especialidades{" "}
            {!form.sinRestriccion && (
              <span className={styles.req}>*</span>
            )}
          </label>
          {!form.nomencladorId ? (
            <span className={styles.hintText}>
              Elegí un código primero
            </span>
          ) : (
            <>
              <label className={styles.toggleRow}>
                <input
                  type="checkbox"
                  className={styles.toggleInput}
                  checked={form.sinRestriccion}
                  disabled={!!parAlta}
                  onChange={(e) => {
                    setForm((p) => ({
                      ...p,
                      sinRestriccion: e.target.checked,
                    }));
                    setErrors((p) => ({ ...p, especialidades: "" }));
                  }}
                />
                <span className={styles.toggleLabel}>
                  Sin restricción por especialidad
                </span>
              </label>
              {form.sinRestriccion ? (
                existentes?.sinEspecialidad ? (
                  <span className={styles.avisoPrecio}>
                    Este código ya tiene precio sin restricción. Para cambiarlo usá el lápiz del código.
                  </span>
                ) : (
                  <span className={styles.hintText}>
                    Se crea una sola fila "sin especialidad": vale para
                    cualquier médico.
                  </span>
                )
              ) : (
                <>
                  <MultiSelectBuscable
                    options={espOptionsAlta}
                    selected={[...form.especialidadesChecked]}
                    onChange={cambiarEspecialidades}
                    bloqueadas={bloqueadasPorPrecio}
                    noun="especialidades"
                  />
                  {bloqueadasPorPrecio.size > 0 && (
                    <span className={styles.hintText}>
                      Las que dicen «Ya tiene precio» no se cargan acá: su precio se cambia con el lápiz del código.
                    </span>
                  )}
                </>
              )}
            </>
          )}
          {errors.especialidades && (
            <span className={styles.errorMsg}>
              {errors.especialidades}
            </span>
          )}
        </div>
      )}

      {/* Nivel + complejidad */}
      <div className={styles.formRow2}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Nivel</label>
          <input
            type="number"
            min="1"
            step="1"
            className={styles.formInput}
            value={nivelCreate ? String(nivelCreate.nivel) : form.nivel}
            disabled={!!nivelCreate}
            onChange={(e) =>
              setForm((p) => ({ ...p, nivel: e.target.value }))
            }
            placeholder="Opcional"
          />
          {nivelCreate && (
            <span className={styles.hintText}>
              Lo define el galeno {nivelCreate.nombre}.
            </span>
          )}
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Complejidad</label>
          <select
            className={styles.formSelect}
            value={form.complejidad}
            onChange={(e) =>
              setForm((p) => ({ ...p, complejidad: e.target.value }))
            }
          >
            <option value="">— Hereda del nomenclador —</option>
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
          </select>
        </div>
      </div>

      {/* Vigencia + ayudantes */}
      <div className={styles.formRow2}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Vigente desde <span className={styles.req}>*</span>
          </label>
          <CampoFecha
            value={form.vigencia_desde}
            onChange={(valor) => {
              setForm((p) => ({
                ...p,
                vigencia_desde: valor,
              }));
              setErrors((p) => ({ ...p, vigencia_desde: "" }));
            }}
          />
          {errors.vigencia_desde && (
            <span className={styles.errorMsg}>
              {errors.vigencia_desde}
            </span>
          )}
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Cantidad de ayudantes
          </label>
          <input
            type="number"
            min="0"
            step="1"
            className={styles.formInput}
            value={form.cantidad_ayudantes}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                cantidad_ayudantes: e.target.value,
              }))
            }
            placeholder="0"
          />
          <span className={styles.hintText}>
            Máximo admitido para este código+OS. Vacío = no lleva —
            sin esto no aparece "Agregar ayudante" en Carga de
            Facturación.
          </span>
        </div>
      </div>
    </>
  );
}
