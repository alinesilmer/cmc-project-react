import { useState } from "react";
import { type MedicoOption, type ObraSocialOption } from "../types";

/** Estado de la cabecera de la carga: médico, clínica, obra social, período, paciente y fecha. */
export function useCargaEstadoCabecera() {
  // Labels descriptivos para los autocompletes en edición: la prestación solo trae los
  // códigos, así que se resuelven contra las búsquedas para mostrar nombre/matrícula/desc.
  const [medicoPreset, setMedicoPreset] = useState<string | null>(null);
  const [codigoPreset, setCodigoPreset] = useState<string | null>(null);
  const [clinicaPreset, setClinicaPreset] = useState<string | null>(null);
  const [ejecutorPreset, setEjecutorPreset] = useState<string | null>(null);
  const [autorizacion, setAutorizacion] = useState("");

  // Médico / Clínica cabecera (payee: a quién se le paga)
  const [codMedico, setCodMedico] = useState<string | null>(null);
  const [medicoSeleccionado, setMedicoSeleccionado] =
    useState<MedicoOption | null>(null);
  // Cuando el payee es una clínica: cobra la clínica y hay que indicar el médico que ejecutó (no cobra, fija el precio por su especialidad).
  const [payeeEsOrganizacion, setPayeeEsOrganizacion] = useState(false);
  const [codMedicoEjecutor, setCodMedicoEjecutor] = useState<string | null>(null);
  const [medicoEjecutor, setMedicoEjecutor] = useState<MedicoOption | null>(null);

  // Obra social + período
  const [obraSocial, setObraSocial] = useState<ObraSocialOption | null>(null);
  // Período elegido a mano (YYYYMM), solo en carga normal (colegio): permite saltar el automático cuando ese período no tuvo movimiento.
  const [periodoOverride, setPeriodoOverride] = useState<string | null>(null);

  // Paciente. `afiliadoId` = el elegido del padrón (puede no tener número); `dni` y `nombrePaciente` son lo que se muestra y, sin afiliado.
  const [afiliadoId, setAfiliadoId] = useState<number | null>(null);
  const [dni, setDni] = useState("");
  const [nombrePaciente, setNombrePaciente] = useState("");

  // Fecha + clínica
  const [fechaPractica, setFechaPractica] = useState("");
  const [codClinica, setCodClinica] = useState<number | null>(null);

  return {
    medicoPreset,
    setMedicoPreset,
    codigoPreset,
    setCodigoPreset,
    clinicaPreset,
    setClinicaPreset,
    ejecutorPreset,
    setEjecutorPreset,
    autorizacion,
    setAutorizacion,
    codMedico,
    setCodMedico,
    medicoSeleccionado,
    setMedicoSeleccionado,
    payeeEsOrganizacion,
    setPayeeEsOrganizacion,
    codMedicoEjecutor,
    setCodMedicoEjecutor,
    medicoEjecutor,
    setMedicoEjecutor,
    obraSocial,
    setObraSocial,
    periodoOverride,
    setPeriodoOverride,
    afiliadoId,
    setAfiliadoId,
    dni,
    setDni,
    nombrePaciente,
    setNombrePaciente,
    fechaPractica,
    setFechaPractica,
    codClinica,
    setCodClinica,
  };
}
