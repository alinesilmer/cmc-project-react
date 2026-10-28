import styles from "./NomencladorPorOS.module.scss";
import { BloquePrecio } from "./BloquePrecio";
import { erroresDe } from "./porOS.helpers";
import paleta from "@/app/styles/paleta.module.scss";
import { ComoSeFactura } from "./ComoSeFactura";
import ReplicarFamiliaBlock, { ErrorReplica, ResultadoReplica } from "@/app/pages/NomencladorNacional/components/ReplicarFamilia/ReplicarFamiliaBlock";
import type { PorOSCtx } from "./useNomencladorPorOS";

export default function ModalCrearPrecio({ ctx }: { ctx: PorOSCtx }) {
  const { galenos, form, setForm, errors, saving, nomCalc, nomCalcCargando, nnMsg, replica, setReplica, replicaResultado, replicaError, replicaTerminada, espMap, familia, preciosSeparados, espSeleccionadas, nomencladoresQuery, nomencladoresOpciones, changeComoFactura, changeModalidad, precioComun, cambiarMismoPrecio, actualizarPrecioEsp, cambiarModalidadEsp, updateComp } = ctx;
  return (
    <>
      {/* Por presupuesto: no existe para NN (siempre galeno × unidades). */}
      {form.origen !== "NN" && (
        <label className={styles.toggleRow}>
          <input
            type="checkbox"
            className={styles.toggleInput}
            checked={form.porPresupuesto}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                porPresupuesto: e.target.checked,
              }))
            }
          />
          <span className={styles.toggleLabel}>Por presupuesto</span>
        </label>
      )}

      {form.porPresupuesto ? (
        <div className={styles.formGroup} style={{ maxWidth: 320 }}>
          <label className={styles.formLabel}>Coseguro ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className={`${styles.formInput} ${errors.coseguro ? styles.inputError : ""}`}
            value={form.coseguro}
            onChange={(e) =>
              setForm((p) => ({ ...p, coseguro: e.target.value }))
            }
            placeholder="0.00"
          />
          {errors.coseguro && (
            <span className={styles.errorMsg}>{errors.coseguro}</span>
          )}
        </div>
      ) : (
        <>
          <div className={styles.sectionTitle}>Precio</div>
          {form.origen === "NE" &&
            !form.sinRestriccion &&
            form.especialidadesChecked.size > 1 && (
              <label className={styles.toggleRow}>
                <input
                  type="checkbox"
                  className={styles.toggleInput}
                  checked={form.mismoPrecio}
                  onChange={(e) => cambiarMismoPrecio(e.target.checked)}
                />
                <span className={styles.toggleLabel}>
                  Mismos precios para todas las especialidades
                </span>
              </label>
            )}
          {preciosSeparados ? (
            espSeleccionadas.map((e) => {
              const p = form.precios[e];
              const prefijo = `esp_${e}_`;
              return (
                <div key={e} className={styles.precioEsp}>
                  <div className={styles.precioEspTitulo}>
                    {espMap[e] ?? `Esp. ${e}`}
                  </div>
                  <BloquePrecio
                    precio={p}
                    conTipo
                    galenos={galenos}
                    errors={erroresDe(errors, prefijo)}
                    onModalidad={(m) => cambiarModalidadEsp(e, m)}
                    onCoseguro={(v) => actualizarPrecioEsp(e, (x) => ({ ...x, coseguro: v }))}
                    onComp={(idx, key, value) =>
                      actualizarPrecioEsp(e, (x) => {
                        const comps = [...x.componentes];
                        comps[idx] = { ...comps[idx], [key]: value };
                        return { ...x, componentes: comps };
                      })
                    }
                  />
                </div>
              );
            })
          ) : (
            <>
          {nnMsg && (
            <span
              className={
                nnMsg.tipo === "error" ? styles.errorMsg : styles.hintText
              }
              style={
                nnMsg.tipo === "ok"
                  ? { color: paleta.tonoVerde450B, fontWeight: 500, display: "block", marginBottom: 8 }
                  : { display: "block", marginBottom: 8 }
              }
            >
              {nnMsg.texto}
            </span>
          )}
          {form.origen === "NE" && (
            <ComoSeFactura
              valor={form.comoFactura}
              slug={form.nomencladorSlug}
              opciones={nomencladoresOpciones.filter((n) => n.tipo === "nivelado")}
              cargandoOpciones={nomencladoresQuery.isLoading}
              calculo={nomCalc}
              calculando={nomCalcCargando}
              error={errors.calculo}
              galenos={galenos}
              onCambiar={changeComoFactura}
              onSlug={(slug) => setForm((p) => ({ ...p, nomencladorSlug: slug }))}
            />
          )}
          <BloquePrecio
            precio={precioComun}
            conTipo={false}
            soloCoseguro={form.origen === "NE" && form.comoFactura === "nomenclador"}
            galenos={galenos}
            errors={errors}
            onModalidad={changeModalidad}
            onCoseguro={(v) => setForm((p) => ({ ...p, coseguro: v }))}
            onComp={updateComp}
          />
            </>
          )}
        </>
      )}

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Observación</label>
        <input
          className={styles.formInput}
          value={form.observacion}
          onChange={(e) =>
            setForm((p) => ({ ...p, observacion: e.target.value }))
          }
          placeholder="Opcional"
        />
      </div>

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
          disabled={saving}
          descripcion="Se da de alta igual en los planes elegidos. Los valores fijos se copian; los calculables usan el galeno de cada obra social."
        />
      )}
    </>
  );
}
