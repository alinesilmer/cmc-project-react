import comun from "./Comun.module.scss";
import paleta from "@/app/styles/paleta.module.scss";
import NumericInput from "../components/NumericInput";
import type { CargaCtx } from "./useCargaFacturacion";

export default function CargaMontos({ ctx }: { ctx: CargaCtx }) {
  const { tipoCalculo, honorarios, setHonorarios, gastos, setGastos, coseguro, setCoseguro, tipoPrestador, montoAyudante, setMontoAyudante, errores, gastosEnCero, formDisabled } = ctx;
  return (
    <>
      {/* 9. Montos: Honorarios/Gastos para el cirujano, un único campo para el ayudante. */}
      <div className={comun.section}>
        <span className={comun.sectionTitle}>
          Montos
          {tipoCalculo === "M" ? (
            <span
              className={comun.sectionHint}
              style={{ color: paleta.tonoNaranja550 }}
            >
              Manual
            </span>
          ) : (
            <span className={comun.sectionHint}>
              Automático — pasá a Manual para editar
            </span>
          )}
        </span>
        {tipoPrestador === "ayudante" ? (
          <div className={comun.fieldsRow}>
            <div className={comun.filterField}>
              <label className={comun.filterLabel}>Ayudante</label>
              <NumericInput
                className={comun.input}
                decimals min={0}
                value={montoAyudante}
                onChange={setMontoAyudante}
                disabled={formDisabled || tipoCalculo === "A"}
              />
              {errores.montoAyudante && (
                <span className={comun.errorText}>{errores.montoAyudante}</span>
              )}
            </div>
          </div>
        ) : (
          <div className={comun.fieldsRow}>
            <div className={comun.filterField}>
              <label className={comun.filterLabel}>Honorarios</label>
              <NumericInput
                className={comun.input}
                decimals min={0}
                value={honorarios}
                onChange={setHonorarios}
                disabled={formDisabled || tipoCalculo === "A"}
              />
            </div>
            <div className={comun.filterField}>
              <label className={comun.filterLabel}>Gastos</label>
              <NumericInput
                className={comun.input}
                decimals min={0}
                value={gastos}
                onChange={setGastos}
                disabled={formDisabled || tipoCalculo === "A"}
              />
              {gastosEnCero && (
                <span className={comun.mutedText}>
                  Con clínica los gastos se proponen en 0.
                </span>
              )}
            </div>
            <div className={comun.filterField}>
              <label className={comun.filterLabel}>Coseguro</label>
              <NumericInput
                className={comun.input}
                decimals min={0}
                value={coseguro}
                onChange={setCoseguro}
                disabled={formDisabled}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
