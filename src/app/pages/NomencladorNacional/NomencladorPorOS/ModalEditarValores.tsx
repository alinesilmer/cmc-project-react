import styles from "./NomencladorPorOS.module.scss";
import CampoFecha from "@/app/components/ui/CampoFecha/CampoFecha";
import { avisoVigencia, erroresDe } from "./porOS.helpers";
import { ComoSeFacturaEdit } from "./ComoSeFacturaEdit";
import { BloquePrecio } from "./BloquePrecio";
import type { PorOSCtx } from "./useNomencladorPorOS";

export default function ModalEditarValores({ ctx, editTarget }: { ctx: PorOSCtx; editTarget: NonNullable<PorOSCtx["editTarget"]> }) {
  const { selectedNroOS, galenos, editEcu, setEditEcu, editErrors, setEditErrors, editMode, nucleoOrigen, nucleoVariantes, nucleoMismo, nucleoComun, nucleoPrecios, espMap, cambiarNucleoMismo, actualizarNucleoPrecio, cambiarModalidadNucleo, cambiarCompNucleo, nucleoUnico, ultimaNucleo } = ctx;
  return (
    <>
      {/* Valores, vigencia y coseguro. */}
      {editMode === "nucleo" && (
        <div className={styles.editSection}>
          <div className={styles.editSectionTitle}>Precios</div>
          <p className={styles.hintText}>
            Vienen con el precio vigente. Si elegís otra fecha, todas las especialidades
            cierran su vigencia y abren una nueva desde esa fecha (con su precio
            actual si no lo tocás). Si dejás la fecha de hoy, solo se actualizan los
            precios que cambies.
          </p>
          <div className={styles.formGroup} style={{ maxWidth: 320 }}>
            <label className={styles.formLabel}>
              Nueva vigencia desde <span className={styles.req}>*</span>
            </label>
            <CampoFecha
              value={editEcu.vigencia_desde}
              onChange={(valor) => {
                setEditEcu((p) => ({ ...p, vigencia_desde: valor }));
                setEditErrors((p) => ({ ...p, vigencia_desde: "" }));
              }}
            />
            {editErrors.vigencia_desde && (
              <span className={styles.errorMsg}>{editErrors.vigencia_desde}</span>
            )}
            {avisoVigencia(editEcu.vigencia_desde, ultimaNucleo) && (
              <span className={styles.avisoPrecio}>{avisoVigencia(editEcu.vigencia_desde, ultimaNucleo)}</span>
            )}
          </div>
          {nucleoVariantes.length > 1 && (
            <label className={styles.toggleRow}>
              <input
                type="checkbox"
                className={styles.toggleInput}
                checked={nucleoMismo}
                onChange={(e) => cambiarNucleoMismo(e.target.checked)}
              />
              <span className={styles.toggleLabel}>
                Mismo precio para todas las especialidades
              </span>
            </label>
          )}
          {nucleoUnico ? (
            <>
            {nucleoOrigen === "NE" && !editTarget.por_presupuesto && selectedNroOS != null && (
              <ComoSeFacturaEdit
                idBase="nucleo-comun"
                osNro={selectedNroOS}
                nomencladorId={editTarget.nomenclador_id}
                precio={nucleoComun}
                galenos={galenos}
                onChange={(c) => actualizarNucleoPrecio("comun", (x) => ({ ...x, ...c }))}
              />
            )}
            <BloquePrecio
              precio={nucleoComun}
              conTipo={false}
              soloCoseguro={editTarget.por_presupuesto || nucleoComun.comoFactura === "nomenclador"}
              galenos={galenos}
              errors={erroresDe(editErrors, "comun_")}
              onModalidad={(m) => cambiarModalidadNucleo("comun", m)}
              onCoseguro={(v) => actualizarNucleoPrecio("comun", (x) => ({ ...x, coseguro: v }))}
              onComp={(idx, key, value) => cambiarCompNucleo("comun", idx, key, value)}
            />
            </>
          ) : (
            nucleoVariantes.map((v) => (
              <div key={v.id} className={styles.precioEsp}>
                <div className={styles.precioEspTitulo}>
                  {v.especialidad_id_colegio != null
                    ? (espMap[v.especialidad_id_colegio] ?? `Esp. ${v.especialidad_id_colegio}`)
                    : "Sin restricción de especialidad"}
                  <span className={styles.precioEspVigencia}>vigente desde {v.vigencia_desde}</span>
                </div>
                {!v.por_presupuesto && selectedNroOS != null && (
                  <ComoSeFacturaEdit
                    idBase={`nucleo-${v.id}`}
                    osNro={selectedNroOS}
                    nomencladorId={v.nomenclador_id}
                    precio={nucleoPrecios[v.id]}
                    galenos={galenos}
                    onChange={(c) => actualizarNucleoPrecio(v.id, (x) => ({ ...x, ...c }))}
                  />
                )}
                <BloquePrecio
                  precio={nucleoPrecios[v.id]}
                  conTipo={false}
                  soloCoseguro={v.por_presupuesto || nucleoPrecios[v.id].comoFactura === "nomenclador"}
                  galenos={galenos}
                  errors={erroresDe(editErrors, `fila_${v.id}_`)}
                  onModalidad={(m) => cambiarModalidadNucleo(v.id, m)}
                  onCoseguro={(c) => actualizarNucleoPrecio(v.id, (x) => ({ ...x, coseguro: c }))}
                  onComp={(idx, key, value) => cambiarCompNucleo(v.id, idx, key, value)}
                />
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}
