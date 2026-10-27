import PacienteSection from "./sections/PacienteSection";
import comun from "./Comun.module.scss";
import CampoFecha from "@/app/components/ui/CampoFecha/CampoFecha";
import PrestacionSection from "./sections/PrestacionSection";
import DocumentacionSection from "./sections/DocumentacionSection";
import ClinicaSection from "./sections/ClinicaSection";
import { actualizarClinicas } from "./catalogosCarga";
import type { CargaCtx } from "./useCargaFacturacion";

export default function CargaPacientePrestacion({ ctx }: { ctx: CargaCtx }) {
  const { editId, isEdit, clinicasPrecargadas, codigoPreset, clinicaPreset, setClinicaPreset, payeeEsOrganizacion, afiliadoId, dni, nombrePaciente, fechaPractica, setFechaPractica, codClinica, setCodClinica, codNomenclador, setCodNomenclador, tipoCalculo, via, setVia, setGastos, tipoPrestador, guardando, documentosNuevos, setDocumentosNuevos, errores, pacienteResetKey, nomencladorResetKey, clinicaResetKey, codMedicoEfectivo, codObraEfectivo, precio, precioLoading, precioError, handleAfiliadoChange, volverATradicional, formDisabled } = ctx;
  return (
    <>
      {/* 3. Paciente */}
      <PacienteSection
        key={`paciente-${pacienteResetKey}`}
        afiliadoId={afiliadoId}
        dni={dni}
        nombrePaciente={nombrePaciente}
        onAfiliadoChange={handleAfiliadoChange}
        disabled={formDisabled}
        error={errores.dni}
      />

      {/* 4. Fecha de práctica */}
      <div className={comun.section}>
        <span className={comun.sectionTitle}>
          Fecha de práctica{" "}
          <span className={comun.sectionHint}>(opcional)</span>
        </span>
        <div className={comun.filterField} data-field="fecha">
          <CampoFecha
            value={fechaPractica}
            onChange={(valor) => setFechaPractica(valor)}
            disabled={formDisabled}
          />
          <span className={comun.mutedText}>
            {fechaPractica
              ? "El precio se cotiza al valor vigente en esa fecha."
              : "Sin fecha (carga por cantidad): se guarda vacía y el precio se cotiza al valor vigente de hoy."}
          </span>
        </div>
      </div>

      {/* 5. Código + precio preview */}
      <PrestacionSection
        key={`nom-${nomencladorResetKey}`}
        codNomenclador={codNomenclador}
        onNomencladorChange={(cod) => setCodNomenclador(cod)}
        codMedico={codMedicoEfectivo}
        codObra={codObraEfectivo}
        precio={precio}
        precioLoading={precioLoading}
        precioError={precioError}
        via={via}
        onViaChange={setVia}
        // La vía se ofrece cuando la API dice que el código admite laparoscopía (galeno de cirugía adulto/infantil, fuera del nivel tope) .
        mostrarVia={!!codNomenclador && (precio?.admite_laparoscopia === true || via === "L")}
        onVolverATradicional={volverATradicional}
        // La fecha ya no bloquea el código: es opcional (carga por cantidad).
        disabled={formDisabled || !codMedicoEfectivo}
        errors={errores}
        presetLabel={codigoPreset ?? (isEdit ? "(valor actual)" : undefined)}
        blockedHint={
          !isEdit && !codMedicoEfectivo
            ? payeeEsOrganizacion
              ? "Elegí el médico ejecutor para ver sus códigos habilitados."
              : "Elegí un médico para ver sus códigos habilitados."
            : undefined
        }
      />

      {/* 5b. Documentación digital: sólo si la obra social y el código la exigen (o ya tiene archivos). */}
      <DocumentacionSection
        requiere={!!precio?.requiere_documentacion}
        prestacionId={isEdit && editId ? Number(editId) : null}
        archivos={documentosNuevos}
        onArchivosChange={setDocumentosNuevos}
        disabled={guardando}
        subtitulo={codNomenclador ? <>Código <strong>{codNomenclador}</strong></> : undefined}
      />

      {/* 6. Clínica — se oculta si el payee (Nº socio) ya es una clínica: sería redundante volver a pedirla acá. */}
      {!payeeEsOrganizacion && (
        <ClinicaSection
          codClinica={codClinica}
          clinicaNombre={clinicaPreset}
          onClinicaChange={(cod, clinica) => {
            setCodClinica(cod);
            // Con clínica (Honorarios individuales): gastos en 0, editable.
            if (cod != null) setGastos("0");
            else if (tipoCalculo === "A" && precio && tipoPrestador !== "ayudante") setGastos(precio.gastos ?? "0");
            setClinicaPreset(clinica?.nombre ?? null);
            // Recién creada (o cualquiera resuelta que no viniera en la precarga).
            if (clinica) {
              actualizarClinicas((prev) => {
                if (prev.some((c) => c.cod === clinica.cod)) return prev;
                return [...prev, clinica].sort((a, b) => a.nombre.localeCompare(b.nombre));
              });
            }
          }}
          onClinicaDeleted={(cod) => {
            actualizarClinicas((prev) => prev.filter((c) => c.cod !== cod));
          }}
          disabled={formDisabled}
          clinicasPrecargadas={clinicasPrecargadas}
          resetKey={clinicaResetKey}
        />
      )}
    </>
  );
}
