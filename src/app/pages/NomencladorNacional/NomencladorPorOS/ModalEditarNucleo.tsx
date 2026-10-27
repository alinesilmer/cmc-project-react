import paleta from "@/app/styles/paleta.module.scss";
import styles from "./NomencladorPorOS.module.scss";
import EstadoCodigoPill from "../components/EstadoCodigoPill";
import { Link } from "react-router-dom";
import type { PorOSCtx } from "./useNomencladorPorOS";

export default function ModalEditarNucleo({ ctx, editTarget }: { ctx: PorOSCtx; editTarget: NonNullable<PorOSCtx["editTarget"]> }) {
  const { selectedNroOS, altaEdicion, editMeta, setEditMeta, editMode, nivelNucleo, leyendaEdicion } = ctx;
  return (
    <>
      {leyendaEdicion() && (
        <div
          role="note"
          style={{
            background: paleta.tonoAzul50C,
            border: `1px solid ${paleta.tonoAzul100B}`,
            color: paleta.tonoAzul550C,
            borderRadius: 6,
            padding: "8px 12px",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {leyendaEdicion()}
        </div>
      )}

      {/* Metadatos: núcleo (todas las especialidades) o fila NN. */}
      {editMode === "nucleo" && (
        <div className={styles.editSection}>
          <div className={styles.editSectionTitle}>
            Datos del código
          </div>
          {altaEdicion && (
            <div className={styles.altaOk}>
              <EstadoCodigoPill estado={altaEdicion.estado} />
              <span>
                {altaEdicion.sin_restriccion_especialidad
                  ? "Lo factura cualquier especialidad"
                  : `Lo facturan ${altaEdicion.especialidades.length} especialidades`}
                {" · "}
                <Link to={`/panel/nomenclador/codigos-por-os?os=${selectedNroOS}&codigo=${editTarget.codigo}`}>
                  Editar el alta
                </Link>
              </span>
            </div>
          )}
          <div className={styles.formRow2}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Descripción</label>
              <input
                className={styles.formInput}
                value={editMeta.descripcion}
                onChange={(e) =>
                  setEditMeta((p) => ({
                    ...p,
                    descripcion: e.target.value,
                  }))
                }
                placeholder="Cómo nombra esta obra social al código"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Nivel</label>
              <input
                type="number"
                min="1"
                step="1"
                className={styles.formInput}
                value={nivelNucleo ? String(nivelNucleo.nivel) : editMeta.nivel}
                disabled={!!nivelNucleo}
                onChange={(e) =>
                  setEditMeta((p) => ({
                    ...p,
                    nivel: e.target.value,
                  }))
                }
                placeholder="Opcional"
              />
              {nivelNucleo && (
                <span className={styles.hintText}>
                  Lo define el galeno {nivelNucleo.nombre}: cambia si cambiás el galeno.
                </span>
              )}
            </div>
          </div>
          <div className={styles.formRow2}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Complejidad</label>
              <select
                className={styles.formSelect}
                value={editMeta.complejidad}
                onChange={(e) =>
                  setEditMeta((p) => ({
                    ...p,
                    complejidad: e.target.value,
                  }))
                }
              >
                <option value="">— Hereda del nomenclador —</option>
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Observación</label>
              <input
                className={styles.formInput}
                value={editMeta.observacion}
                onChange={(e) =>
                  setEditMeta((p) => ({
                    ...p,
                    observacion: e.target.value,
                  }))
                }
                placeholder="Opcional"
              />
            </div>
          </div>
          <div className={styles.formRow2}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Cantidad de ayudantes
              </label>
              <input
                type="number"
                min="0"
                step="1"
                className={styles.formInput}
                value={editMeta.cantidad_ayudantes}
                onChange={(e) =>
                  setEditMeta((p) => ({
                    ...p,
                    cantidad_ayudantes: e.target.value,
                  }))
                }
                placeholder="0"
                style={{ maxWidth: 200 }}
              />
              <span className={styles.hintText}>
                Vacío = no lleva ayudantes en Carga de Facturación.
              </span>
            </div>
          </div>

          <p className={styles.hintText}>
            Quién lo factura se edita en{" "}
            <Link to={`/panel/nomenclador/codigos-por-os?os=${selectedNroOS}&codigo=${editTarget.codigo}`}>
              Códigos por obra social
            </Link>
            . Para darle precio a otra especialidad, usá «Cargar precio».
          </p>
        </div>
      )}
    </>
  );
}
