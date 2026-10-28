import { useRef, useState } from "react";
import { type MedicoOption } from "../types";
import { type Mantener } from "./carga.types";
import { type FocusField } from "./focusNav";

/** Estado de la pantalla: qué se mantiene entre cargas, errores, claves de reinicio y referencias. */
export function useCargaEstadoPantalla() {
  // UI. En complementaria no se mantiene la fecha (rezagadas de fechas distintas), y ese checkbox tampoco se muestra.
  const [mantener, setMantener] = useState<Mantener>(() => ({
    // Por defecto no se mantiene ninguno: el operador activa lo que necesite.
    obraSocial: false,
    paciente: false,
    fecha: false,
    clinica: false,
    medico: false,
    autorizacion: false,
    codigo: false,
  }));
  const [guardando, setGuardando] = useState(false);
  // Documentación digital (alta): archivos que se suben junto con la prestación; son opcionales desde el Colegio.
  const [documentosNuevos, setDocumentosNuevos] = useState<File[]>([]);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [duplicado, setDuplicado] = useState<{
    mensaje: string;
    id?: number;
  } | null>(null);
  // Reset keys por grupo.
  const [medicoResetKey, setMedicoResetKey] = useState(0);
  // Separada de `medicoResetKey`: cuando el payee (clínica) se mantiene por "Mantener clínica" pero el ejecutor no.
  const [ejecutorResetKey, setEjecutorResetKey] = useState(0);
  const [pacienteResetKey, setPacienteResetKey] = useState(0);
  const [nomencladorResetKey, setNomencladorResetKey] = useState(0);
  // La clínica es un autocomplete (conserva su texto tipeado): al resetear el servicio hay que remontarlo para limpiarlo, igual que médico/paciente.
  const [clinicaResetKey, setClinicaResetKey] = useState(0);
  // Ídem obra social: si no se mantiene entre cargas, hay que remontar la sección para limpiar el texto tipeado del autocomplete.
  const [osResetKey, setOsResetKey] = useState(0);
  // Se incrementa en TODO `resetForm()`, se mantenga o no el código — a diferencia de `nomencladorResetKey`.
  const [resetTick, setResetTick] = useState(0);

  // Navegación por teclado: `resetForm` deja acá el campo a enfocar y el efecto de abajo lo consume una vez que el formulario volvió a…
  const formRef = useRef<HTMLDivElement>(null);
  const pendingFocusRef = useRef<FocusField[] | null>(null);
  // Ids de los ayudantes que trae el equipo al editar — para saber, al guardar, cuáles se quitaron (hay que anularlos).
  const ayudantesOriginalesRef = useRef<number[]>([]);
  // Id de la fila del pediatra que trae el equipo al editar (null = no había).
  const pediatraOriginalRef = useRef<number | null>(null);
  // Id real de la cabecera del equipo al editar.
  const headPrestacionIdRef = useRef<number | null>(null);

  // La tabla de abajo sigue al médico del formulario.
  const [ultimoMedico, setUltimoMedico] = useState<MedicoOption | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  return {
    mantener,
    setMantener,
    guardando,
    setGuardando,
    documentosNuevos,
    setDocumentosNuevos,
    errores,
    setErrores,
    duplicado,
    setDuplicado,
    medicoResetKey,
    setMedicoResetKey,
    ejecutorResetKey,
    setEjecutorResetKey,
    pacienteResetKey,
    setPacienteResetKey,
    nomencladorResetKey,
    setNomencladorResetKey,
    clinicaResetKey,
    setClinicaResetKey,
    osResetKey,
    setOsResetKey,
    resetTick,
    setResetTick,
    formRef,
    pendingFocusRef,
    ayudantesOriginalesRef,
    pediatraOriginalRef,
    headPrestacionIdRef,
    ultimoMedico,
    setUltimoMedico,
    refreshKey,
    setRefreshKey,
  };
}
