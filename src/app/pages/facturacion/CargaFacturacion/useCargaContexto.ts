import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAppSnackbar } from "@/app/hooks/useAppSnackbar";
import { useCapaCarga } from "./capaCargaContexto";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cargarCatalogos, useCatalogosCarga } from "./catalogosCarga";
import { type MedicoOption, type ObraSocialOption, type TipoCalculo, type ViaPractica } from "../types";
import { usePeriodoActivo } from "./hooks/usePeriodoActivo";
import { type AyudanteLinea } from "./sections/AyudanteSection";
import { type PediatraLinea } from "./sections/PediatraSection";
import { FACTURACION_AUTORIZACION_POR_INTEGRANTE_KEY } from "../constants";
import { type Mantener } from "./carga.types";
import { type FocusField } from "./focusNav";

/** Parte de la lógica de CargaFacturacion: parámetros de la ruta, catálogos y estado del formulario. El texto es el del componente original. */
export function useCargaContexto() {
  const navigate = useNavigate();
  const notify = useAppSnackbar();
  // Dentro de la capa de edición rápida (ver CapaCarga) la ruta que matcheó es la del
  // listado de atrás: el id y el `from` de la edición los da la capa.
  const capa = useCapaCarga();
  const params = useParams<{ id: string; facturaId: string }>();
  const editId = capa ? capa.editId : params.id;
  const complementoParam = capa ? undefined : params.facturaId;
  const [searchParams] = useSearchParams();
  const fromFactura = capa ? capa.from : searchParams.get("from");
  const isEdit = !!editId;
  const isComplemento = !!complementoParam;
  const complementoId = complementoParam ? Number(complementoParam) : null;
  // "Replicar carga": llega por query param en la carga normal (?replicar=<id>) desde
  // las tablas de prestaciones. Precarga todos los campos de esa prestación pero como
  // una carga nueva (POST), no como edición de la original.
  const replicarParam = capa ? null : searchParams.get("replicar");
  const isReplicando = !isEdit && !isComplemento && !!replicarParam;
  const [loadingReplicar, setLoadingReplicar] = useState(isReplicando);

  // Médicos, obras sociales y clínicas: listas completas para que los autocompletes
  // filtren en memoria (un pedido por tecleo era lento con ~4.000 médicos). Vienen de
  // una caché compartida (`catalogosCarga`): con copia guardada el formulario abre al
  // instante y la versión actual llega de fondo. Sin copia, el formulario espera con
  // "Cargando formulario…" — ver el gate más abajo.
  const { catalogos, error: errorPrecarga } = useCatalogosCarga();
  const medicosPrecargados = catalogos?.medicos ?? null;
  const obrasSocialesPrecargadas = catalogos?.obrasSociales ?? null;
  const clinicasPrecargadas = catalogos?.clinicas ?? null;
  useEffect(() => { cargarCatalogos(); }, []);

  // Complementaria — OS/período fijos, tomados de la factura referenciada por id.
  const [complementoMeta, setComplementoMeta] = useState<{
    cod_obra: string;
    periodo: string;
    periodo_label: string;
    version: number;
  } | null>(null);
  const [loadingComplemento, setLoadingComplemento] = useState(isComplemento);
  const [complementoError, setComplementoError] = useState<string | null>(null);

  // Edición — snapshot de la prestación tal como está guardada.
  const [editMeta, setEditMeta] = useState<{
    cod_obra_social: string;
    /** "<nro> · <nombre>" resuelto aparte; el fetch de la prestación solo trae el código. */
    cod_obra_social_label?: string;
    periodo: string;
    estado: string | null;
  } | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(isEdit);
  // Por qué no se pudo abrir la edición (null = se pudo). Un 404 es "no existe"; el resto
  // se muestra tal cual, para no confundir un error de red o de permisos con eso.
  const [errorEdicion, setErrorEdicion] = useState<string | null>(null);
  // "La primera precarga de edición terminó ENTERA (datos + labels de los
  // autocompletes)". Es lo que gatea el render del formulario: los autocompletes
  // fijan su texto al montar (ver AppSearchSelect) y si se muestran a mitad de la
  // precarga quedan con "(valor actual)" o vacíos para siempre. No se puede usar
  // `editMeta` para esto — se setea al principio de la precarga, no al final.
  const [editHidratado, setEditHidratado] = useState(false);
  // Editar arranca siempre arriba.
  useLayoutEffect(() => {
    if (!isEdit) return;
    if (capa) capa.contenedor.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    else window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [isEdit, editId, editHidratado, capa]);
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
  const {
    periodo,
    error: periodoError,
    load: loadPeriodo,
    reset: resetPeriodo,
  } = usePeriodoActivo();
  // Período elegido a mano (YYYYMM), solo en carga normal (colegio): permite saltar el automático cuando ese período no tuvo movimiento.
  const [periodoOverride, setPeriodoOverride] = useState<string | null>(null);

  // Paciente. `afiliadoId` = el elegido del padrón (puede no tener número); `dni` y `nombrePaciente` son lo que se muestra y, sin afiliado.
  const [afiliadoId, setAfiliadoId] = useState<number | null>(null);
  const [dni, setDni] = useState("");
  const [nombrePaciente, setNombrePaciente] = useState("");

  // Fecha + clínica
  const [fechaPractica, setFechaPractica] = useState("");
  const [codClinica, setCodClinica] = useState<number | null>(null);

  // Montos principales
  const [codNomenclador, setCodNomenclador] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState("1");
  const [sesion, setSesion] = useState("1");
  const [tipoCalculo, setTipoCalculo] = useState<TipoCalculo>("A");
  const [via, setVia] = useState<ViaPractica>("T");
  const [porcentaje, setPorcentaje] = useState("100");
  const [honorarios, setHonorarios] = useState("0");
  const [gastos, setGastos] = useState("0");
  // Importe que el afiliado paga de su bolsillo; se descuenta del total.
  const [coseguro, setCoseguro] = useState("0");
  // Tipo de prestador de ESTA carga: "medico" (cirujano, default) factura honorarios/gastos y admite ayudantes de equipo.
  const [tipoPrestador, setTipoPrestador] = useState<"medico" | "ayudante">("medico");
  const [montoAyudante, setMontoAyudante] = useState("0");

  // Ayudantes quirúrgicos (0..N según cantidad_ayudantes del código+OS). Solo aplica
  // cuando `tipoPrestador === "medico"`.
  const [ayudantes, setAyudantes] = useState<AyudanteLinea[]>([]);

  // Pediatra del equipo (máx. 1, sólo en parto/cesárea — ver `precio.admite_pediatra`).
  const [pediatra, setPediatra] = useState<PediatraLinea | null>(null);

  // Algunas obras sociales emiten un Nº de autorización POR integrante del equipo (cirujano y cada ayudante) en vez de uno solo para toda la práctica.
  const [autorizacionPorIntegrante, setAutorizacionPorIntegrante] = useState(
    () => localStorage.getItem(FACTURACION_AUTORIZACION_POR_INTEGRANTE_KEY) === "1",
  );
  useEffect(() => {
    localStorage.setItem(FACTURACION_AUTORIZACION_POR_INTEGRANTE_KEY, autorizacionPorIntegrante ? "1" : "0");
  }, [autorizacionPorIntegrante]);

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

  // El médico que fija el precio y los códigos habilitados: el propio payee si es un médico.
  const codMedicoEfectivo = payeeEsOrganizacion ? codMedicoEjecutor : codMedico;

  // Con clínica (como socio/payee → Sanatorio, o en el campo Clínica → Honorarios individuales) los gastos los factura la clínica.
  const gastosEnCero = payeeEsOrganizacion || codClinica != null;
  const gastosSugeridos = (valor: string | null | undefined) => (gastosEnCero ? "0" : valor ?? "0");

  // Obra social efectiva para cotizar — la misma cuenta se repetía 3 veces (acá.
  const codObraEfectivo = useMemo(
    () =>
      isComplemento
        ? (complementoMeta?.cod_obra ?? null)
        : obraSocial
          ? String(obraSocial.nro_obra_social)
          : null,
    [isComplemento, complementoMeta?.cod_obra, obraSocial],
  );

  return {
    navigate,
    notify,
    capa,
    params,
    editId,
    complementoParam,
    searchParams,
    fromFactura,
    isEdit,
    isComplemento,
    complementoId,
    replicarParam,
    isReplicando,
    loadingReplicar,
    setLoadingReplicar,
    catalogos,
    errorPrecarga,
    medicosPrecargados,
    obrasSocialesPrecargadas,
    clinicasPrecargadas,
    complementoMeta,
    setComplementoMeta,
    loadingComplemento,
    setLoadingComplemento,
    complementoError,
    setComplementoError,
    editMeta,
    setEditMeta,
    loadingEdit,
    setLoadingEdit,
    errorEdicion,
    setErrorEdicion,
    editHidratado,
    setEditHidratado,
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
    periodo,
    periodoError,
    loadPeriodo,
    resetPeriodo,
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
    codNomenclador,
    setCodNomenclador,
    cantidad,
    setCantidad,
    sesion,
    setSesion,
    tipoCalculo,
    setTipoCalculo,
    via,
    setVia,
    porcentaje,
    setPorcentaje,
    honorarios,
    setHonorarios,
    gastos,
    setGastos,
    coseguro,
    setCoseguro,
    tipoPrestador,
    setTipoPrestador,
    montoAyudante,
    setMontoAyudante,
    ayudantes,
    setAyudantes,
    pediatra,
    setPediatra,
    autorizacionPorIntegrante,
    setAutorizacionPorIntegrante,
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
    codMedicoEfectivo,
    gastosEnCero,
    gastosSugeridos,
    codObraEfectivo,
  };
}

export type useCargaContextoCtx = ReturnType<typeof useCargaContexto>;
