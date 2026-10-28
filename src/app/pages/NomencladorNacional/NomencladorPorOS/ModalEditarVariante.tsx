import styles from "./NomencladorPorOS.module.scss";
import CampoFecha from "@/app/components/ui/CampoFecha/CampoFecha";
import { avisoVigencia } from "./porOS.helpers";
import { ComoSeFacturaEdit } from "./ComoSeFacturaEdit";
import { type ModalidadValor } from "./porOS.types";
import { ComponentEditor } from "./ComponentEditor";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import ReplicarFamiliaBlock, { ErrorReplica, ResultadoReplica } from "@/app/pages/NomencladorNacional/components/ReplicarFamilia/ReplicarFamiliaBlock";
import type { PorOSCtx } from "./useNomencladorPorOS";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

export default function ModalEditarVariante({ ctx, editTarget }: { ctx: PorOSCtx; editTarget: NonNullable<PorOSCtx["editTarget"]> }) {
  const { selectedNroOS, galenos, editEcu, setEditEcu, editErrors, setEditErrors, savingMeta, editMode, replica, setReplica, replicaResultado, replicaError, replicaTerminada, savingEcu, familia, changeEditModalidad, updateEditComp, replicaActiva, handleActualizar } = ctx;
  return (
    <>
      {editMode === "variante" && (
      <div className={styles.editSection}>
        <div className={styles.editSectionTitle}>
          Actualizar ecuación de precio
        </div>
        {(
          <>
            <p className={styles.hintText}>
              {editTarget.por_presupuesto
                ? "Este código es por presupuesto (sin fórmula fija). Cambiar el coseguro cierra la vigencia actual y abre una nueva."
                : "Cierra la vigencia actual y crea una nueva con la ecuación que ingreses."}
            </p>
            <div className={styles.formRow2}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Nueva vigencia desde{" "}
                  <span className={styles.req}>*</span>
                </label>
                <CampoFecha
                  value={editEcu.vigencia_desde}
                  onChange={(valor) => {
                    setEditEcu((p) => ({
                      ...p,
                      vigencia_desde: valor,
                    }));
                    setEditErrors((p) => ({
                      ...p,
                      vigencia_desde: "",
                    }));
                  }}
                />
                {editErrors.vigencia_desde && (
                  <span className={styles.errorMsg}>
                    {editErrors.vigencia_desde}
                  </span>
                )}
                {avisoVigencia(editEcu.vigencia_desde, editTarget.vigencia_desde) && (
                  <span className={styles.avisoPrecio}>
                    {avisoVigencia(editEcu.vigencia_desde, editTarget.vigencia_desde)}
                  </span>
                )}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Coseguro ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={`${styles.formInput} ${editErrors.coseguro ? styles.inputError : ""}`}
                  value={editEcu.coseguro}
                  onChange={(e) =>
                    setEditEcu((p) => ({
                      ...p,
                      coseguro: e.target.value,
                    }))
                  }
                  placeholder="0.00"
                />
                {editErrors.coseguro && (
                  <span className={styles.errorMsg}>{editErrors.coseguro}</span>
                )}
              </div>
            </div>
            {!editTarget.por_presupuesto && (
              <>
                {editTarget.origen === "NE" && selectedNroOS != null ? (
                  <ComoSeFacturaEdit
                    idBase="variante"
                    osNro={selectedNroOS}
                    nomencladorId={editTarget.nomenclador_id}
                    precio={editEcu}
                    galenos={galenos}
                    onChange={(c) => setEditEcu((p) => ({ ...p, ...c }))}
                  />
                ) : (
                  <div className={styles.formRow2}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>
                        Tipo de valor
                      </label>
                      <select
                        className={styles.formSelect}
                        value={editEcu.modalidad}
                        onChange={(e) =>
                          changeEditModalidad(
                            e.target.value as ModalidadValor,
                          )
                        }
                      >
                        <option value="calculable">
                          Calculable (galeno × cantidad)
                        </option>
                        <option value="fijo">Fijo ($)</option>
                      </select>
                    </div>
                  </div>
                )}
                {editEcu.comoFactura !== "nomenclador" && (
                  <ComponentEditor
                    modalidad={editEcu.modalidad}
                    componentes={editEcu.componentes}
                    galenos={galenos}
                    errors={editErrors}
                    onChange={updateEditComp}
                  />
                )}
              </>
            )}
            {(
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: 8,
                }}
              >
                <BotonPlano
                  className={styles.btnWarning}
                  onClick={handleActualizar}
                  disabled={savingEcu}
                >
                  {savingEcu ? (
                    <>
                      <Cargando size={14} />{" "}
                      Actualizando…
                    </>
                  ) : replicaActiva ? (
                    "Actualizar y replicar"
                  ) : (
                    "Actualizar"
                  )}
                </BotonPlano>
              </div>
            )}
          </>
        )}
      </div>
      )}

      {replicaTerminada ? (
        <>
          {replicaResultado && (
            <ResultadoReplica resultados={replicaResultado} />
          )}
          {replicaError && <ErrorReplica mensaje={replicaError} />}
        </>
      ) : (
        <ReplicarFamiliaBlock
          familia={familia}
          value={replica}
          onChange={setReplica}
          disabled={savingMeta || savingEcu}
          descripcion={
            editMode === "nucleo"
              ? "Los mismos cambios se aplican en los planes elegidos. Si alguno no tiene el código, se crea igual al de esta obra social."
              : "Se rota la misma variante en los planes elegidos con los mismos valores, vigencia y coseguro. Si alguno no la tiene, se crea."
          }
        />
      )}
    </>
  );
}
