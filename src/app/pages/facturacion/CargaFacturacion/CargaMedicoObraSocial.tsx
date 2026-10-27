import MedicoSection from "./sections/MedicoSection";
import DatosGeneralesSection from "./sections/DatosGeneralesSection";
import comun from "./Comun.module.scss";
import { AlertTriangle } from "lucide-react";
import type { CargaCtx } from "./useCargaFacturacion";

export default function CargaMedicoObraSocial({ ctx, medicosPrecargados, obrasSocialesPrecargadas }: { ctx: CargaCtx; medicosPrecargados: NonNullable<CargaCtx["medicosPrecargados"]>; obrasSocialesPrecargadas: NonNullable<CargaCtx["obrasSocialesPrecargadas"]> }) {
  const { isEdit, isComplemento, editMeta, medicoPreset, setClinicaPreset, ejecutorPreset, codMedico, setCodMedico, medicoSeleccionado, setMedicoSeleccionado, payeeEsOrganizacion, setPayeeEsOrganizacion, codMedicoEjecutor, setCodMedicoEjecutor, medicoEjecutor, setMedicoEjecutor, obraSocial, periodo, periodoError, periodoOverride, setPeriodoOverride, setCodClinica, setGastos, guardando, errores, medicoResetKey, ejecutorResetKey, setEjecutorResetKey, setClinicaResetKey, osResetKey, setUltimoMedico, handleObraSocialChange, formDisabled } = ctx;
  return (
    <>
      {/* 1. Médico cabecera */}
      <MedicoSection
        key={`medico-${medicoResetKey}`}
        codMedico={codMedico}
        medico={medicoSeleccionado}
        onMedicoChange={(cod, med) => {
          setCodMedico(cod);
          setMedicoSeleccionado(med);
          // El operador tocó el médico a mano: el snapshot de la tabla deja de valer.
          setUltimoMedico(null);
          const esOrg = !!med?.es_organizacion;
          setPayeeEsOrganizacion(esOrg);
          // Cambió el payee: el ejecutor cargado (si había) puede no corresponder a este médico/clínica nuevo — se limpia siempre.
          setCodMedicoEjecutor(null);
          setMedicoEjecutor(null);
          setEjecutorResetKey((k) => k + 1);
          if (esOrg) {
            // Payee clínica (Sanatorio): gastos en 0, editable.
            setGastos("0");
            // El campo "Clínica" de más abajo queda de más — la clínica ya es el propio payee — así que se limpia y se oculta.
            setCodClinica(null);
            setClinicaPreset(null);
            setClinicaResetKey((k) => k + 1);
          }
        }}
        disabled={guardando}
        error={errores.codMedico}
        presetLabel={medicoPreset ?? (isEdit ? "(valor actual)" : undefined)}
        payeeEsOrganizacion={payeeEsOrganizacion}
        codMedicoEjecutor={codMedicoEjecutor}
        medicoEjecutor={medicoEjecutor}
        onEjecutorChange={(cod, med) => {
          setCodMedicoEjecutor(cod);
          setMedicoEjecutor(med);
        }}
        // Mismo criterio que el propio payee (disabled={guardando}): el ejecutor depende de haber elegido una clínica, no de la obra social/período.
        ejecutorDisabled={guardando}
        ejecutorError={errores.codMedicoEjecutor}
        ejecutorPresetLabel={ejecutorPreset ?? (isEdit ? "(valor actual)" : undefined)}
        ejecutorResetKey={ejecutorResetKey}
        medicosPrecargados={medicosPrecargados}
      />

      {/* 2. Obra social + período. */}
      {isComplemento ? null : (
        <>
          <DatosGeneralesSection
            key={`os-${osResetKey}`}
            obraSocial={obraSocial}
            onObraSocialChange={handleObraSocialChange}
            periodo={periodo}
            periodoError={periodoError}
            // No incluir periodoLoading en `guardando`: al elegir la OS, loadPeriodo pone loading en true sincrónicamente y, si esto deshabilita el input.
            disabled={isEdit ? formDisabled : guardando}
            periodoOverride={periodoOverride}
            onPeriodoOverrideChange={setPeriodoOverride}
            obrasSocialesPrecargadas={obrasSocialesPrecargadas}
          />
          {isEdit && editMeta && editMeta.estado !== "A" && (
            <div className={comun.errorBox}>
              <AlertTriangle size={14} style={{ verticalAlign: "-2px" }} aria-hidden="true" /> Esta prestación ya no está en estado abierto — no se puede
              editar.
            </div>
          )}
        </>
      )}
    </>
  );
}
