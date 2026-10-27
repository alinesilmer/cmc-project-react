import { Modal } from "./ModalGalenos";
import styles from "./NomencladorGalenos.module.scss";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import { AlertCircle, Save } from "lucide-react";
import ReplicarFamiliaBlock, { ErrorReplica, ResultadoReplica } from "@/app/pages/NomencladorNacional/components/ReplicarFamilia/ReplicarFamiliaBlock";
import { formatoPesos } from "@/app/shared/lib/formatos";
import { parseMonto } from "./galenos.helpers";
import CampoFecha from "@/app/components/ui/CampoFecha/CampoFecha";
import { avisoVigenciaGaleno } from "../nomenclador.helpers";
import type { GalenosCtx } from "./useGalenos";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

export default function ModalEditarGaleno({ ctx, editTarget }: { ctx: GalenosCtx; editTarget: NonNullable<GalenosCtx["editTarget"]> }) {
  const { setModalKind, editForm, setEditForm, savingObs, savingUnidades, savingPrecio, editErrors, setEditErrors, familiaEdit, replica, setReplica, replicaResultado, replicaError, replicaActiva, handleActualizarPrecio, handleSaveObservacion, handleActualizarUnidades } = ctx;
  return (
    <>
      <Modal
        title={`Editar — ${editTarget.nombre}`}
        subtitle={
          editTarget.nivel != null
            ? `Nivel ${editTarget.nivel}`
            : "Sin nivel"
        }
        onClose={() => setModalKind(null)}
      >
        {/* Observación */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Observación</label>
          <textarea
            className={styles.formTextarea}
            value={editForm.observacion}
            onChange={(e) =>
              setEditForm((p) => ({ ...p, observacion: e.target.value }))
            }
            placeholder="Opcional…"
          />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <BotonPlano
            className={styles.btnGhost}
            onClick={handleSaveObservacion}
            disabled={savingObs}
          >
            {savingObs ? (
              <Cargando size={13} />
            ) : (
              <Save size={13} />
            )}{" "}
            Guardar observación
          </BotonPlano>
        </div>

        <div className={styles.sectionSep} />
        <ReplicarFamiliaBlock
          familia={familiaEdit}
          value={replica}
          onChange={setReplica}
          disabled={savingPrecio || savingUnidades}
          descripcion="Se aplica a «Actualizar valor» y «Actualizar unidades» en el galeno con el mismo código y nivel de cada plan. Si un plan no tiene el galeno, al actualizar el valor se crea; al actualizar unidades se omite. La observación no se replica."
        />
        <p className={styles.sectionTitle}>Actualizar valor</p>
        <p className={styles.hintText}>
          Cambia el valor unitario del galeno desde la vigencia indicada
          (rota la vigencia anterior). Actual:{" "}
          <strong>
            {formatoPesos.format(parseMonto(editTarget.valor_unitario) ?? 0)}
          </strong>
          .
        </p>
        <div className={styles.formRow2}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Valor unitario ($) <span className={styles.req}>*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={`${styles.formInput} ${editErrors.valor ? styles.inputError : ""}`}
              value={editForm.valor}
              onChange={(e) => {
                setEditForm((p) => ({ ...p, valor: e.target.value }));
                setEditErrors((p) => ({ ...p, valor: "" }));
              }}
              placeholder="0.00"
            />
            {editErrors.valor && (
              <span className={styles.errorMsg}>{editErrors.valor}</span>
            )}
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Vigente desde <span className={styles.req}>*</span>
            </label>
            <CampoFecha
              value={editForm.vigencia_precio}
              onChange={(valor) => {
                setEditForm((p) => ({
                  ...p,
                  vigencia_precio: valor,
                }));
                setEditErrors((p) => ({ ...p, vigencia_precio: "" }));
              }}
            />
            {editErrors.vigencia_precio && (
              <span className={styles.errorMsg}>
                {editErrors.vigencia_precio}
              </span>
            )}
            {avisoVigenciaGaleno(editForm.vigencia_precio, editTarget.vigencia_desde) && (
              <span className={styles.hintText}>
                {avisoVigenciaGaleno(editForm.vigencia_precio, editTarget.vigencia_desde)}
              </span>
            )}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 8,
          }}
        >
          <BotonPlano
            className={styles.btnPrimary}
            onClick={handleActualizarPrecio}
            disabled={savingPrecio}
          >
            {savingPrecio ? (
              <>
                <Cargando size={14} /> Actualizando…
              </>
            ) : (
              <>
                <Save size={14} />{" "}
                {replicaActiva
                  ? "Actualizar valor y replicar"
                  : "Actualizar valor"}
              </>
            )}
          </BotonPlano>
        </div>
        {replicaResultado?.accion === "valor" && (
          <ResultadoReplica resultados={replicaResultado.resultados} />
        )}

        <div className={styles.sectionSep} />
        <p className={styles.sectionTitle}>Actualizar unidades pactadas</p>

        <div className={styles.warningBox}>
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            Esta operación pisa las unidades de <strong>todos</strong> los
            componentes que usan este galeno, incluso overrides cargados a
            mano.
          </span>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Vigente desde <span className={styles.req}>*</span>
          </label>
          <CampoFecha
            value={editForm.vigencia_unidades}
            onChange={(valor) =>
              setEditForm((p) => ({
                ...p,
                vigencia_unidades: valor,
              }))
            }
          />
          {editErrors.vigencia_unidades && (
            <span className={styles.errorMsg}>
              {editErrors.vigencia_unidades}
            </span>
          )}
        </div>

        <p className={styles.hintText}>
          Dejá un campo vacío para no modificar esa unidad.
        </p>
        {editErrors.unidades && (
          <span className={styles.errorMsg}>{editErrors.unidades}</span>
        )}

        <div className={styles.formRow3}>
          <div className={styles.formGroup}>
            <label className={styles.unitLabel}>Honorarios</label>
            <input
              type="number"
              min="0"
              step="0.0001"
              className={styles.unitInput}
              value={editForm.hon}
              onChange={(e) =>
                setEditForm((p) => ({ ...p, hon: e.target.value }))
              }
              placeholder="—"
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.unitLabel}>Ayudante</label>
            <input
              type="number"
              min="0"
              step="0.0001"
              className={styles.unitInput}
              value={editForm.ayu}
              onChange={(e) =>
                setEditForm((p) => ({ ...p, ayu: e.target.value }))
              }
              placeholder="—"
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.unitLabel}>Gastos</label>
            <input
              type="number"
              min="0"
              step="0.0001"
              className={styles.unitInput}
              value={editForm.gas}
              onChange={(e) =>
                setEditForm((p) => ({ ...p, gas: e.target.value }))
              }
              placeholder="—"
            />
          </div>
        </div>

        <div className={styles.modalFooter}>
          <BotonPlano
            className={styles.btnGhost}
            onClick={() => setModalKind(null)}
          >
            Cerrar
          </BotonPlano>
          <BotonPlano
            className={styles.btnPrimary}
            onClick={handleActualizarUnidades}
            disabled={savingUnidades}
          >
            {savingUnidades ? (
              <>
                <Cargando size={14} /> Actualizando…
              </>
            ) : replicaActiva ? (
              "Actualizar unidades y replicar"
            ) : (
              "Actualizar unidades"
            )}
          </BotonPlano>
        </div>
        {replicaResultado?.accion === "unidades" && (
          <ResultadoReplica resultados={replicaResultado.resultados} />
        )}
        {replicaError && <ErrorReplica mensaje={replicaError} />}
      </Modal>
    </>
  );
}
