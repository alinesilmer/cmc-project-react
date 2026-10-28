import AyudanteSection from "./sections/AyudanteSection";
import PediatraSection from "./sections/PediatraSection";
import comun from "./Comun.module.scss";
import styles from "./CargaFacturacion.module.scss";
import { crearPediatraLinea } from "./sections/pediatra.helpers";
import { formatMoney, parseMoney } from "../money";
import type { CargaCtx } from "./useCargaFacturacion";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

export default function CargaEquipo({ ctx, medicosPrecargados }: { ctx: CargaCtx; medicosPrecargados: NonNullable<CargaCtx["medicosPrecargados"]> }) {
  const { isEdit, codMedico, honorarios, gastos, coseguro, tipoPrestador, ayudantes, setAyudantes, pediatra, setPediatra, autorizacionPorIntegrante, guardando, errores, precio, precioPediatra, precioPediatraLoading, totalEstimado, formDisabled, maxAyudantes, admiteAyudante, admitePediatra } = ctx;
  return (
    <>
      {/* 10. Ayudantes quirúrgicos (equipo). En edición se reconcilia el grupo. */}
      {admiteAyudante && (
        <AyudanteSection
          precio={precio!}
          maxAyudantes={maxAyudantes}
          ayudantes={ayudantes}
          onChange={setAyudantes}
          codMedicoMain={codMedico}
          disabled={isEdit ? formDisabled : guardando}
          errors={errores}
          medicosPrecargados={medicosPrecargados}
          porIntegrante={autorizacionPorIntegrante}
        />
      )}

      {/* 10b. Pediatra (parto/cesárea, máx. 1). */}
      {admitePediatra && (
        pediatra ? (
          <PediatraSection
            linea={pediatra}
            onChange={setPediatra}
            onQuitar={() => setPediatra(null)}
            precioPediatra={precioPediatra}
            precioPediatraLoading={precioPediatraLoading}
            codMedicoMain={codMedico}
            codsEquipo={new Set(ayudantes.map((a) => a.codMedico).filter((v): v is string => !!v))}
            disabled={isEdit ? formDisabled : guardando}
            error={errores.pediatra || errores.pediatraCodigo}
            medicosPrecargados={medicosPrecargados}
            porIntegrante={autorizacionPorIntegrante}
          />
        ) : (
          <div className={comun.section}>
            <BotonPlano
              type="button"
              className={styles.addPediatraBtn}
              onClick={() => setPediatra(crearPediatraLinea())}
              disabled={isEdit ? formDisabled : guardando}
            >
              <span style={{ fontSize: 16 }}>+</span>
              <span>Agregar pediatra</span>
            </BotonPlano>
          </div>
        )
      )}

      {/* Total: siempre debajo de ayudantes y pediatra (incluye sus montos), encima de los botones. */}
      <div className={comun.section}>
        {/* Valor unitario del cirujano: honorarios + gastos − coseguro, sin porcentaje,
            cantidad, sesiones ni equipo. El ayudante no lo lleva. */}
        {tipoPrestador === "medico" && (
          <div className={styles.valorUnitarioRow}>
            <span>Valor unitario:</span>
            <strong>{formatMoney(parseMoney(honorarios) + parseMoney(gastos) - parseMoney(coseguro))}</strong>
          </div>
        )}
        <div className={comun.totalRow}>
          <span>Total estimado:</span>
          <strong>{formatMoney(totalEstimado)}</strong>
        </div>
      </div>
    </>
  );
}
