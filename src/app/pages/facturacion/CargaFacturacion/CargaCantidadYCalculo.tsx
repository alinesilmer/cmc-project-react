import comun from "./Comun.module.scss";
import NumericInput from "../components/NumericInput";
import type { CargaCtx } from "./useCargaFacturacion";

export default function CargaCantidadYCalculo({ ctx }: { ctx: CargaCtx }) {
  const { cantidad, setCantidad, sesion, setSesion, tipoCalculo, setTipoCalculo, porcentaje, setPorcentaje, setHonorarios, setGastos, setCoseguro, tipoPrestador, setTipoPrestador, setMontoAyudante, setAyudantes, setPediatra, gastosSugeridos, precio, formDisabled } = ctx;
  return (
    <>
      {/* 7. Sesión y cantidad */}
      <div className={comun.section}>
        <span className={comun.sectionTitle}>Cantidad y sesiones</span>
        <div className={comun.fieldsRow}>
          <div className={comun.filterField}>
            <label className={comun.filterLabel}>
              Cantidad <span className={comun.errorText}>*</span>
            </label>
            <NumericInput
              className={comun.input}
              min={1}
              value={cantidad}
              onChange={setCantidad}
              disabled={formDisabled}
            />
          </div>
          <div className={comun.filterField}>
            <label className={comun.filterLabel}>
              Sesión <span className={comun.errorText}>*</span>
            </label>
            <NumericInput
              className={comun.input}
              min={1}
              value={sesion}
              onChange={setSesion}
              disabled={formDisabled}
            />
          </div>
          <div className={comun.filterField}>
            <label className={comun.filterLabel}>% Porcentaje</label>
            <NumericInput
              className={comun.input}
              min={1}
              value={porcentaje}
              onChange={setPorcentaje}
              disabled={formDisabled}
            />
          </div>
        </div>
      </div>

      {/* 7b. Tipo de prestador: cirujano (factura honorarios/gastos, admite equipo) o ayudante suelto (factura un único monto de ayudante, sin equipo). */}
      <div className={comun.section}>
        <span className={comun.sectionTitle}>Tipo de prestador</span>
        <div className={comun.radioRow}>
          {(
            [
              ["medico", "Médico cirujano"],
              ["ayudante", "Ayudante"],
            ] as const
          ).map(([v, label]) => (
            <label key={v} className={comun.radioLabel}>
              <input
                type="radio"
                name="tipoPrestador"
                value={v}
                checked={tipoPrestador === v}
                onChange={() => {
                  setTipoPrestador(v);
                  if (v === "ayudante") {
                    setAyudantes([]);
                    setPediatra(null);
                    setCoseguro("0");
                    if (tipoCalculo === "A" && precio) {
                      setMontoAyudante(precio.ayudante ?? "0");
                    }
                  } else if (tipoCalculo === "A" && precio) {
                    setHonorarios(precio.honorarios ?? "0");
                    setGastos(gastosSugeridos(precio.gastos));
                    setCoseguro(precio.coseguro ?? "0");
                  }
                }}
                disabled={formDisabled}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* 8. Tipo de cálculo */}
      <div className={comun.section}>
        <span className={comun.sectionTitle}>Tipo de cálculo</span>
        <div className={comun.radioRow}>
          {(
            [
              ["A", "Automático"],
              ["M", "Manual"],
            ] as const
          ).map(([v, label]) => (
            <label key={v} className={comun.radioLabel}>
              <input
                type="radio"
                name="tipoCalculo"
                value={v}
                checked={tipoCalculo === v}
                onChange={() => {
                  setTipoCalculo(v);
                  // El efecto que sincroniza los montos solo mira `precio`: si el operador vuelve a Automático sin que `precio` haya cambiado.
                  if (v === "A" && precio) {
                    if (tipoPrestador === "ayudante") {
                      setMontoAyudante(precio.ayudante ?? "0");
                    } else {
                      setHonorarios(precio.honorarios ?? "0");
                      setGastos(gastosSugeridos(precio.gastos));
                      setCoseguro(precio.coseguro ?? "0");
                    }
                  }
                }}
                disabled={formDisabled}
              />
              {label}
            </label>
          ))}
        </div>
      </div>
    </>
  );
}
