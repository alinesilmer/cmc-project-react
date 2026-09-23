import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FilePlus2, ArrowLeft, AlertTriangle } from "lucide-react";

import { useAppSnackbar } from "../../../hooks/useAppSnackbar";
import {
  crearPrestaciones,
  crearPrestacionesComplementaria,
  fetchPrestacion,
  fetchFacturaDetalle,
  editarPrestacion,
  anularPrestacion,
  fetchMedicos,
  fetchMedicosTodos,
  fetchObrasSociales,
  fetchObrasSocialesTodas,
  fetchCodigosHabilitados,
  fetchClinicas,
  fetchClinicasTodas,
} from "../api";
import { detailMessage, versionLabel } from "../types";
import type {
  ObraSocialOption,
  AfiliadoRead,
  PrestacionItem,
  TipoCalculo,
  ViaPractica,
  PrestacionRead,
  PrestacionUpdate,
  MedicoOption,
  ClinicaOption,
} from "../types";
import { parseMoney, formatMoney } from "../money";
import { FACTURACION_ULTIMA_OS_KEY, FACTURACION_AUTORIZACION_POR_INTEGRANTE_KEY } from "../constants";

import DuplicadoConfirmModal from "../components/DuplicadoConfirmModal";
import NumericInput from "../components/NumericInput";
import { dedupePorId } from "../components/localSearch";

import { usePeriodoActivo } from "./hooks/usePeriodoActivo";
import { useNomencladorPrecio } from "./hooks/useNomencladorPrecio";
import { useHotkeys, isMod, isModalOpen } from "./hooks/useHotkeys";
import { focusFirstField, nextFocusable, type FocusField } from "./focusNav";

import MedicoSection from "./sections/MedicoSection";
import DatosGeneralesSection from "./sections/DatosGeneralesSection";
import PacienteSection from "./sections/PacienteSection";
import ClinicaSection from "./sections/ClinicaSection";
import PrestacionSection from "./sections/PrestacionSection";
import AyudanteSection, {
  crearAyudanteLinea,
  totalAyudantes,
  type AyudanteLinea,
} from "./sections/AyudanteSection";
import PediatraSection, {
  crearPediatraLinea,
  montoPediatra,
  type PediatraLinea,
} from "./sections/PediatraSection";
import ResumenLateralCard from "./sections/ResumenLateralCard";
import MedicoPrestacionesTable from "./sections/MedicoPrestacionesTable";

import styles from "./CargaFacturacion.module.scss";

// Al editar/replicar puede clickearse cualquier fila del equipo, incluida un ayudante.
// El formulario se arma siempre desde la CABECERA (id == grupo_equipo_id): es la que
// tiene el médico principal en `cod_medico` y trae el `grupo` con los ayudantes. Si la
// fila clickeada es un integrante, buscamos la cabecera por su grupo_equipo_id.
const fetchPrestacionCabecera = async (id: string | number): Promise<PrestacionRead> => {
  const p = await fetchPrestacion(id);
  if (p.grupo_equipo_id != null && p.grupo_equipo_id !== p.id) {
    return fetchPrestacion(p.grupo_equipo_id);
  }
  return p;
};

// Reconstruye las líneas de ayudante desde el `grupo` de una prestación (al replicar o
// editar un equipo). Resuelve el nombre de cada médico (best-effort) para el autocomplete.
const buildAyudantesFromGrupo = async (
  grupo: PrestacionRead[],
): Promise<AyudanteLinea[]> => {
  const miembros = grupo.filter((g) => parseMoney(g.ayudante) > 0);
  return Promise.all(
    miembros.map(async (g) => {
      let medico: MedicoOption | null = null;
      try {
        const rows = await fetchMedicos(g.cod_medico);
        medico = rows.find((m) => m.cod === g.cod_medico) ?? null;
      } catch {
        // best-effort: sin nombre, la línea igual funciona con el código.
      }
      const precioAyudante = g.ayudante != null ? String(g.ayudante) : "0";
      return {
        ...crearAyudanteLinea(precioAyudante, g.autorizacion ?? ""),
        prestacionId: g.id,
        codMedico: g.cod_medico,
        medico,
        porcentaje: String(g.porcentaje ?? 100),
        tipoCalculo: (g.tipo_calculo as TipoCalculo) ?? "A",
        precioManual: precioAyudante,
      };
    }),
  );
};

// Reconstruye la línea de pediatra (máx. 1) desde el `grupo` de una prestación — función
// HERMANA de `buildAyudantesFromGrupo`, no la toca ni comparte su filtro. Se distingue
// por `tipo_prestador === "Pediatra"` (lo pone el backend vía tpo_funcion='P'), NUNCA
// por montos: la fila del pediatra también tiene `ayudante=0` como cualquier cirujano,
// así que el filtro de ayudantes (`ayudante > 0`) ya la deja afuera solo, sin cambios.
const buildPediatraFromGrupo = async (
  grupo: PrestacionRead[],
): Promise<PediatraLinea | null> => {
  const g = grupo.find((m) => m.tipo_prestador === "Pediatra");
  if (!g) return null;
  let medico: MedicoOption | null = null;
  try {
    const rows = await fetchMedicos(g.cod_medico);
    medico = rows.find((m) => m.cod === g.cod_medico) ?? null;
  } catch {
    // best-effort: sin nombre, la línea igual funciona con el código.
  }
  let codigoPreset: string | null = null;
  if (g.cod_nomenclador) {
    try {
      const codigos = await fetchCodigosHabilitados(g.cod_medico, g.cod_nomenclador);
      codigoPreset = codigos.find((c) => c.codigo === g.cod_nomenclador)?.descripcion ?? null;
    } catch {
      // best-effort: sin descripción, el código igual queda cargado.
    }
  }
  return {
    ...crearPediatraLinea(g.autorizacion ?? ""),
    prestacionId: g.id,
    codMedico: g.cod_medico,
    medico,
    codNomenclador: g.cod_nomenclador ?? null,
    codigoPreset,
    porcentaje: String(g.porcentaje ?? 100),
    tipoCalculo: (g.tipo_calculo as TipoCalculo) ?? "A",
    precioManual: g.honorarios != null ? String(g.honorarios) : "0",
  };
};

// Auto-detecta si el equipo ya tiene autorizaciones distintas por integrante (carga
// vieja o hecha desde otra pantalla) para no pisarlas silenciosamente al guardar —
// ver `autorizacionPorIntegrante` en el componente.
const tieneAutorizacionDistintaPorIntegrante = (
  cabeza: PrestacionRead, lineas: AyudanteLinea[],
): boolean =>
  lineas.some((l) => (l.autorizacion || null) !== (cabeza.autorizacion || null));

// Cantidad/Sesión/Porcentaje se guardan como string en el estado (los inputs son
// type="text" con bloqueo de no-dígitos, ver NumericInput): esto convierte al enviar.
const toInt = (v: string, fallback: number): number => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? fallback : n;
};

type Mantener = {
  obraSocial: boolean;
  paciente: boolean;
  fecha: boolean;
  clinica: boolean;
  medico: boolean;
  autorizacion: boolean;
};

const CargaFacturacion: React.FC = () => {
  const navigate = useNavigate();
  const notify = useAppSnackbar();
  const { id: editId, facturaId: complementoParam } = useParams<{ id: string; facturaId: string }>();
  const [searchParams] = useSearchParams();
  const fromFactura = searchParams.get("from");
  const isEdit = !!editId;
  const isComplemento = !!complementoParam;
  const complementoId = complementoParam ? Number(complementoParam) : null;
  // "Replicar carga": llega por query param en la carga normal (?replicar=<id>) desde
  // las tablas de prestaciones. Precarga todos los campos de esa prestación pero como
  // una carga nueva (POST), no como edición de la original.
  const replicarParam = searchParams.get("replicar");
  const isReplicando = !isEdit && !isComplemento && !!replicarParam;
  const [loadingReplicar, setLoadingReplicar] = useState(isReplicando);

  // Precarga completa de médicos y obras sociales: antes de que el formulario se
  // muestre, se piden una sola vez (en vez de un pedido por cada tecleo, lento con
  // ~4.500 médicos) y de ahí en más los autocompletes de médico/obra social filtran
  // en memoria. Bloquea el formulario entero con "Cargando formulario…" hasta que
  // ambas listas estén — ver el gate más abajo. Redis lo va a hacer innecesario más
  // adelante; por ahora es la forma más simple de sacarse de encima la latencia.
  const [medicosPrecargados, setMedicosPrecargados] = useState<MedicoOption[] | null>(null);
  const [obrasSocialesPrecargadas, setObrasSocialesPrecargadas] = useState<ObraSocialOption[] | null>(null);
  const [clinicasPrecargadas, setClinicasPrecargadas] = useState<ClinicaOption[] | null>(null);
  const [errorPrecarga, setErrorPrecarga] = useState(false);
  const [reintentoPrecarga, setReintentoPrecarga] = useState(0);

  useEffect(() => {
    let active = true;
    setErrorPrecarga(false);
    (async () => {
      try {
        const [medicos, obrasSociales, clinicas] = await Promise.all([
          fetchMedicosTodos(),
          fetchObrasSocialesTodas(),
          fetchClinicasTodas(),
        ]);
        if (!active) return;
        // `listado_medico` tiene NRO_SOCIO duplicado en algunas filas (mismo médico
        // cargado dos veces — dato legacy, no un caso de negocio real). Sin dedupar,
        // el Autocomplete renderiza dos <li> con la misma key y React mezcla su
        // contenido entre renders al filtrar — eso se veía como "el filtro falla".
        setMedicosPrecargados(dedupePorId(medicos, (m) => m.cod));
        setObrasSocialesPrecargadas(dedupePorId(obrasSociales, (o) => o.nro_obra_social));
        setClinicasPrecargadas(dedupePorId(clinicas, (c) => c.cod));
      } catch {
        if (active) setErrorPrecarga(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [reintentoPrecarga]);

  // Complementaria — OS/período fijos, tomados de la factura referenciada por id.
  const [complementoMeta, setComplementoMeta] = useState<{
    cod_obra: string;
    periodo: string;
    periodo_label: string;
    version: number;
  } | null>(null);
  const [loadingComplemento, setLoadingComplemento] = useState(isComplemento);
  const [complementoError, setComplementoError] = useState<string | null>(null);

  // Edición — snapshot de la prestación tal como está guardada. OS/período SÍ se pueden
  // cambiar (`obraSocial`/`periodo` de más arriba, seedeados con estos valores al
  // precargar): esto queda como fallback y como lo que muestra `estado` (si la
  // prestación sigue abierta), no como el valor autoritativo de OS/período.
  const [editMeta, setEditMeta] = useState<{
    cod_obra_social: string;
    /** "<nro> · <nombre>" resuelto aparte; el fetch de la prestación solo trae el código. */
    cod_obra_social_label?: string;
    periodo: string;
    estado: string | null;
  } | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(isEdit);
  const [editNotFound, setEditNotFound] = useState(false);
  // "La primera precarga de edición terminó ENTERA (datos + labels de los
  // autocompletes)". Es lo que gatea el render del formulario: los autocompletes
  // fijan su texto al montar (ver AppSearchSelect) y si se muestran a mitad de la
  // precarga quedan con "(valor actual)" o vacíos para siempre. No se puede usar
  // `editMeta` para esto — se setea al principio de la precarga, no al final.
  const [editHidratado, setEditHidratado] = useState(false);
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
  // Cuando el payee es una clínica: cobra la clínica y hay que indicar el médico que
  // ejecutó (no cobra, fija el precio por su especialidad). El campo "Clínica" de más
  // abajo se reemplaza por este ejecutor.
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
  // Período elegido a mano (YYYYMM), solo en carga normal (colegio): permite saltar el
  // automático cuando ese período no tuvo movimiento (p. ej. sugiere mayo pero el
  // próximo real es junio). null = usar el automático que sugiere el backend.
  const [periodoOverride, setPeriodoOverride] = useState<string | null>(null);

  // Paciente
  const [dni, setDni] = useState("");
  const [nombrePaciente, setNombrePaciente] = useState("");

  // Fecha + clínica
  const [fechaPractica, setFechaPractica] = useState("");
  const [codClinica, setCodClinica] = useState<number | null>(null);

  // Montos principales
  const [codNomenclador, setCodNomenclador] = useState<string | null>(null);
  // Categoría del código elegido: la vía solo se ofrece para "Honorarios individuales".
  const [codNomencladorCategoria, setCodNomencladorCategoria] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState("1");
  const [sesion, setSesion] = useState("1");
  const [tipoCalculo, setTipoCalculo] = useState<TipoCalculo>("A");
  const [via, setVia] = useState<ViaPractica>("T");
  const [porcentaje, setPorcentaje] = useState("100");
  const [honorarios, setHonorarios] = useState("0");
  const [gastos, setGastos] = useState("0");
  // Importe que el afiliado paga de su bolsillo; se descuenta del total. Se prellena
  // con el sugerido del Valor del código (ver el efecto de abajo) y queda editable —
  // el operador puede corregirlo si cobró otra cosa. Solo aplica a la fila principal.
  const [coseguro, setCoseguro] = useState("0");
  // Tipo de prestador de ESTA carga: "medico" (cirujano, default) factura
  // honorarios/gastos y admite ayudantes de equipo; "ayudante" factura un único monto
  // de ayudante y no admite equipo (el ayudante puede ser socio sin que el cirujano lo
  // sea, y viceversa — casos que antes no se podían cargar por separado).
  const [tipoPrestador, setTipoPrestador] = useState<"medico" | "ayudante">("medico");
  const [montoAyudante, setMontoAyudante] = useState("0");

  // Ayudantes quirúrgicos (0..N según cantidad_ayudantes del código+OS). Solo aplica
  // cuando `tipoPrestador === "medico"`.
  const [ayudantes, setAyudantes] = useState<AyudanteLinea[]>([]);

  // Pediatra del equipo (máx. 1, sólo en parto/cesárea — ver `precio.admite_pediatra`).
  // Es un socio DISTINTO del cirujano que factura su PROPIO código: por eso tiene su
  // propia consulta de precio (ver `useNomencladorPrecio` más abajo), separada de la
  // del cirujano y de la de ayudantes (que reusan el código principal).
  const [pediatra, setPediatra] = useState<PediatraLinea | null>(null);

  // Algunas obras sociales emiten un Nº de autorización POR integrante del equipo
  // (cirujano y cada ayudante) en vez de uno solo para toda la práctica. Preferencia
  // del operador, persistida entre cargas (trabaja tandas de la misma OS) — por eso
  // NO se resetea en `resetForm()`, a diferencia del resto del estado de ayudantes.
  const [autorizacionPorIntegrante, setAutorizacionPorIntegrante] = useState(
    () => localStorage.getItem(FACTURACION_AUTORIZACION_POR_INTEGRANTE_KEY) === "1",
  );
  useEffect(() => {
    localStorage.setItem(FACTURACION_AUTORIZACION_POR_INTEGRANTE_KEY, autorizacionPorIntegrante ? "1" : "0");
  }, [autorizacionPorIntegrante]);

  // UI. En complementaria no se mantiene la fecha (rezagadas de fechas distintas), y ese
  // checkbox tampoco se muestra. La clínica sí puede mantenerse (misma clínica en varias).
  const [mantener, setMantener] = useState<Mantener>(() => ({
    // Por defecto no se mantiene ninguno: el operador activa lo que necesite.
    obraSocial: false,
    paciente: false,
    fecha: false,
    clinica: false,
    medico: false,
    autorizacion: false,
  }));
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [duplicado, setDuplicado] = useState<{
    mensaje: string;
    id?: number;
  } | null>(null);
  // Reset keys por grupo. Remontar los autocompletes es la única forma de vaciar el
  // texto que el operador dejó tipeado: AppSearchSelect conserva su inputValue a
  // propósito cuando `value` pasa a null. Van separadas para que un reset no arrastre
  // a los campos que el operador pidió mantener.
  const [medicoResetKey, setMedicoResetKey] = useState(0);
  // Separada de `medicoResetKey`: cuando el payee (clínica) se mantiene por "Mantener
  // clínica" pero el ejecutor no, hay que remontar solo el campo ejecutor sin tocar el
  // resto de la sección médico.
  const [ejecutorResetKey, setEjecutorResetKey] = useState(0);
  const [pacienteResetKey, setPacienteResetKey] = useState(0);
  const [nomencladorResetKey, setNomencladorResetKey] = useState(0);
  // La clínica es un autocomplete (conserva su texto tipeado): al resetear el servicio
  // hay que remontarlo para limpiarlo, igual que médico/paciente.
  const [clinicaResetKey, setClinicaResetKey] = useState(0);
  // Ídem obra social: si no se mantiene entre cargas, hay que remontar la sección para
  // limpiar el texto tipeado del autocomplete.
  const [osResetKey, setOsResetKey] = useState(0);

  // Navegación por teclado: `resetForm` deja acá el campo a enfocar y el efecto de
  // abajo lo consume una vez que el formulario volvió a estar habilitado.
  const formRef = useRef<HTMLDivElement>(null);
  const pendingFocusRef = useRef<FocusField[] | null>(null);
  // Ids de los ayudantes que trae el equipo al editar — para saber, al guardar, cuáles
  // se quitaron (hay que anularlos).
  const ayudantesOriginalesRef = useRef<number[]>([]);
  // Id de la fila del pediatra que trae el equipo al editar (null = no había). Mismo
  // propósito que `ayudantesOriginalesRef` pero para una única fila, no una lista.
  const pediatraOriginalRef = useRef<number | null>(null);
  // Id real de la cabecera del equipo al editar. Puede diferir de `editId` (la URL) si
  // se clickeó "Editar" en una fila que es ayudante: ahí se resuelve la cabecera.
  const headPrestacionIdRef = useRef<number | null>(null);

  // La tabla de abajo sigue al médico del formulario, pero tras guardar el reset puede
  // limpiarlo y la tabla desaparecería justo cuando se quiere ver la fila nueva. Este
  // snapshot la sostiene; se invalida si el operador toca el médico a mano.
  const [ultimoMedico, setUltimoMedico] = useState<MedicoOption | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // El médico que fija el precio y los códigos habilitados: el propio payee si es un
  // médico, o el médico ejecutor si el payee es una clínica.
  const codMedicoEfectivo = payeeEsOrganizacion ? codMedicoEjecutor : codMedico;

  // Obra social efectiva para cotizar — la misma cuenta se repetía 3 veces (acá, en
  // `codObraTabla` más abajo y ahora también en el precio del pediatra); memoizada una
  // sola vez para que las tres la compartan. Editar y cargar comparten la misma fuente
  // (`obraSocial`, seedeada con la actual al entrar en edición): si se cambia la OS acá
  // se re-cotiza igual que al elegirla en una carga nueva.
  const codObraEfectivo = useMemo(
    () =>
      isComplemento
        ? (complementoMeta?.cod_obra ?? null)
        : obraSocial
          ? String(obraSocial.nro_obra_social)
          : null,
    [isComplemento, complementoMeta?.cod_obra, obraSocial],
  );

  // Precio del nomenclador (código principal — cirujano/ayudante suelto)
  const {
    precio,
    loading: precioLoading,
    error: precioError,
  } = useNomencladorPrecio({
    codMedico: codMedicoEfectivo,
    codObra: codObraEfectivo,
    codigo: codNomenclador,
    // Sin fecha de práctica el backend cotiza el valor vigente a hoy (el más actual).
    // Se manda `null` y no "" para que el query param no viaje vacío.
    fecha: fechaPractica || null,
    via,
  });

  // Precio del PEDIATRA — socio y código propios, independientes del cirujano. Mismo
  // hook, segunda instancia: ya está debounceado y keyed por estas deps.
  const { precio: precioPediatra, loading: precioPediatraLoading } = useNomencladorPrecio({
    codMedico: pediatra?.codMedico ?? null,
    codObra: codObraEfectivo,
    codigo: pediatra?.codNomenclador ?? null,
    fecha: fechaPractica || null,
    // El código del pediatra se cotiza siempre tradicional — la vía es del acto
    // quirúrgico del cirujano, no de la atención del recién nacido.
    via: "T",
  });

  // Precarga de la prestación cuando se entra en modo edición.
  // Espera a las listas precargadas: los nombres de médico / médico ejecutor / obra
  // social salen de ahí (búsqueda en memoria, sin pedidos extra ni carreras). El
  // formulario tampoco se muestra antes de tenerlas, así que no cuesta nada.
  useEffect(() => {
    if (!isEdit || !editId) return;
    if (!medicosPrecargados || !obrasSocialesPrecargadas) return;
    let active = true;
    setLoadingEdit(true);
    (async () => {
      try {
        // Siempre desde la cabecera: si se clickeó "Editar" en un ayudante, resolvemos
        // el médico principal y el equipo real.
        const p = await fetchPrestacionCabecera(editId);
        if (!active) return;
        headPrestacionIdRef.current = p.id;
        // El payee es una clínica sii viene un médico ejecutor (regla del backend).
        const esOrg = p.cod_medico_ejecutor != null && p.cod_medico_ejecutor !== "";
        setCodMedico(p.cod_medico);
        setPayeeEsOrganizacion(esOrg);
        setCodMedicoEjecutor(p.cod_medico_ejecutor ?? null);
        setDni(p.dni_paciente ?? "");
        setNombrePaciente(p.nombre_paciente ?? "");
        // La fecha es opcional: si la prestación se cargó sin fecha (carga por
        // cantidad) se deja vacía. Ponerle "hoy" la inventaría al guardar.
        setFechaPractica(p.fecha_practica ?? "");
        setCodClinica(p.cod_clinica ?? null);
        setAutorizacion(p.autorizacion ?? "");
        setCodNomenclador(p.cod_nomenclador ?? null);
        setCantidad(String(p.cantidad ?? 1));
        setSesion(String(p.sesion ?? 1));
        setTipoCalculo((p.tipo_calculo as TipoCalculo) ?? "A");
        setVia((p.via as ViaPractica) ?? "T");
        setPorcentaje(String(p.porcentaje ?? 100));
        const esAyudante = parseMoney(p.ayudante) > 0;
        setTipoPrestador(esAyudante ? "ayudante" : "medico");
        if (esAyudante) {
          setMontoAyudante(p.ayudante != null ? String(p.ayudante) : "0");
          setHonorarios("0");
          setGastos("0");
          setCoseguro("0");
        } else {
          setHonorarios(p.honorarios != null ? String(p.honorarios) : "0");
          setGastos(p.gastos != null ? String(p.gastos) : "0");
          setCoseguro(p.coseguro != null ? String(p.coseguro) : "0");
        }
        // La obra social sale de la lista precargada: si el código no está en el
        // catálogo (pasa con filas importadas de CMC) se muestra el número solo.
        const os = p.cod_obra_social
          ? obrasSocialesPrecargadas.find(
              (x) => String(x.nro_obra_social) === String(p.cod_obra_social),
            ) ?? null
          : null;
        setEditMeta({
          cod_obra_social: p.cod_obra_social ?? "",
          // El nombre viene de una columna de ancho fijo: llega con espacios al final.
          cod_obra_social_label: os ? `${os.nro_obra_social} · ${os.nombre.trim()}` : undefined,
          periodo: p.periodo,
          estado: p.estado ?? null,
        });
        // Seedea el campo editable de Obra social/Período con el valor actual de la
        // fila — de acá en más `obraSocial`/`periodo` (no `editMeta`) son la fuente de
        // verdad, igual que en la carga nueva. `loadPeriodo` trae el período activo de
        // esa OS, que tiene que coincidir con `p.periodo`: una fila sólo es editable si
        // su período sigue abierto (gate de `editMeta.estado === "A"` más abajo).
        if (os) {
          setObraSocial(os);
          loadPeriodo(String(os.nro_obra_social));
        }

        // La prestación solo trae códigos: los labels descriptivos se resuelven ANTES
        // de habilitar el render del formulario (`editHidratado`), porque los
        // autocompletes fijan su texto al montar. Médico y médico ejecutor salen de la
        // lista precargada — `/medicos/todos` ya trae médicos Y clínicas con
        // `es_organizacion`, así que sirve para el payee sea cual sea.
        const buscarMedico = (cod: string | null | undefined): MedicoOption | null =>
          cod ? medicosPrecargados.find((m) => String(m.cod) === String(cod)) ?? null : null;
        const labelMedico = (m: MedicoOption) =>
          [m.nombre, m.matricula].filter((v) => v != null && v !== "").join(" · ") || null;

        const payee = buscarMedico(p.cod_medico);
        if (payee) {
          setMedicoSeleccionado(payee);
          setMedicoPreset(labelMedico(payee));
        }
        const ejecutor = esOrg ? buscarMedico(p.cod_medico_ejecutor) : null;
        if (ejecutor) {
          setMedicoEjecutor(ejecutor);
          setEjecutorPreset(labelMedico(ejecutor));
        }

        // Los códigos habilitados dependen del médico efectivo (ejecutor si es clínica).
        const codMedForCodigos = esOrg ? (p.cod_medico_ejecutor ?? p.cod_medico) : p.cod_medico;
        const [nomRes, cliRes] = await Promise.allSettled([
          p.cod_nomenclador
            ? fetchCodigosHabilitados(codMedForCodigos, p.cod_nomenclador)
            : Promise.resolve([]),
          p.cod_clinica != null ? fetchClinicas(String(p.cod_clinica)) : Promise.resolve([]),
        ]);
        if (!active) return;

        if (nomRes.status === "fulfilled") {
          const nom = nomRes.value.find((x) => x.codigo === p.cod_nomenclador);
          if (nom) {
            setCodigoPreset(nom.descripcion || null);
            setCodNomencladorCategoria(nom.categoria ?? null);
          }
        }
        if (cliRes.status === "fulfilled") {
          const cli = cliRes.value.find((x) => x.cod === p.cod_clinica);
          if (cli) setClinicaPreset(cli.nombre || null);
        }
        // Ayudantes del equipo. Guardamos sus ids originales para reconciliar al
        // guardar (los que se quiten se anulan).
        if (p.grupo && p.grupo.length > 0) {
          const lineas = await buildAyudantesFromGrupo(p.grupo);
          if (active) {
            ayudantesOriginalesRef.current = lineas
              .map((l) => l.prestacionId)
              .filter((v): v is number => v != null);
            setAyudantes(lineas);
            if (tieneAutorizacionDistintaPorIntegrante(p, lineas)) {
              setAutorizacionPorIntegrante(true);
            }
          }
          // Pediatra del equipo (si hay). Bloque paralelo al de arriba, no lo toca.
          const lineaPediatra = await buildPediatraFromGrupo(p.grupo);
          if (active && lineaPediatra) {
            pediatraOriginalRef.current = lineaPediatra.prestacionId ?? null;
            setPediatra(lineaPediatra);
          }
        }
        // Recién acá el formulario puede mostrarse: ya está todo, labels incluidos.
        if (active) setEditHidratado(true);
      } catch {
        setEditNotFound(true);
      } finally {
        if (active) setLoadingEdit(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isEdit, editId, medicosPrecargados, obrasSocialesPrecargadas, loadPeriodo]);

  // Carga de la factura complementaria: valida que sea un complemento abierto y fija
  // OS/período. Sostiene el badge del header y la búsqueda de precio/tabla.
  useEffect(() => {
    if (!isComplemento || complementoId == null) return;
    let active = true;
    setLoadingComplemento(true);
    setComplementoError(null);
    (async () => {
      try {
        const d = await fetchFacturaDetalle(complementoId);
        if (!active) return;
        if (d.version <= 1) {
          setComplementoError("Esta factura no es un complemento — usá la carga normal.");
        } else if (d.estado !== "A") {
          setComplementoError("Esta factura complementaria ya fue cerrada.");
        } else {
          setComplementoMeta({
            cod_obra: d.cod_obra,
            periodo: d.periodo,
            periodo_label: d.periodo_label,
            version: d.version,
          });
        }
      } catch {
        if (active) setComplementoError("No se encontró la factura complementaria.");
      } finally {
        if (active) setLoadingComplemento(false);
      }
    })();
    return () => { active = false; };
  }, [isComplemento, complementoId]);

  // Sincronizar montos desde precio cuando cambia (modo automático)
  useEffect(() => {
    if (!precio) return;
    if (precio.por_presupuesto) {
      setTipoCalculo("M");
      return;
    }
    if (tipoCalculo === "A") {
      if (tipoPrestador === "ayudante") {
        setMontoAyudante(precio.ayudante ?? "0");
        // El coseguro es del acto, no de cada prestador: no aplica a la fila de ayudante.
        setCoseguro("0");
      } else {
        setHonorarios(precio.honorarios ?? "0");
        setGastos(precio.gastos ?? "0");
        setCoseguro(precio.coseguro ?? "0");
      }
    }
  }, [precio, tipoPrestador]); // eslint-disable-line react-hooks/exhaustive-deps

  // El máximo de ayudantes depende del código elegido — al cambiar de código
  // las líneas ya cargadas dejan de tener sentido (podían pertenecer a otro tope).
  // La admisión de la vía laparoscópica también depende del código, así que arrastrarla
  // a una práctica distinta produciría rechazos espurios. Un monto "Manual" tipeado para
  // el código anterior también se descarta, así vuelve a Automático y trae el precio del
  // código nuevo. Se salta mientras la precarga de edición/replicar está en curso: ese
  // flujo setea `codNomenclador`, `via` y `tipo_calculo` en el mismo batch, y este efecto
  // pisaría los valores recién precargados.
  useEffect(() => {
    if (loadingEdit || loadingReplicar) return;
    setAyudantes([]);
    setVia("T");
    setTipoCalculo("A");
    // El pediatra sólo aplica a parto/cesárea: si el código principal cambió, ya no
    // vale (aunque el código nuevo también sea de parto/cesárea, es una prestación
    // distinta — se vuelve a agregar a mano).
    setPediatra(null);
  }, [codNomenclador]); // eslint-disable-line react-hooks/exhaustive-deps

  // Limpiar el nombre cuando se borra el identificador del paciente. La condición es
  // "vacío", NO "menos de 8 caracteres": el campo no es sólo un DNI, también acepta el
  // nro de afiliado de la obra social, que suele ser más corto (la mayoría de las
  // prestaciones cargadas tienen uno de menos de 8). Con el tope de 8, elegir a uno de
  // esos afiliados —o precargarlo al editar— borraba el nombre recién resuelto.
  useEffect(() => {
    if (!dni) setNombrePaciente("");
  }, [dni]);

  const volverATradicional = useCallback(() => setVia("T"), []);

  const handleObraSocialChange = useCallback(
    (nro: number | null, os: ObraSocialOption | null) => {
      setObraSocial(os);
      resetPeriodo();
      // El código elegido NO se borra acá: los códigos habilitados son por médico, no
      // por obra social (`fetchCodigosHabilitados` no recibe OS), así que sigue siendo
      // una opción válida para tipear. Lo que sí puede cambiar es si está *admitido*
      // para la OS nueva — eso ya lo resuelve `useNomencladorPrecio` (que tiene `codObra`
      // entre sus dependencias) refetcheando el precio solo, y `PrecioPreviewCard`
      // muestra el aviso "⚠ {motivo}" automáticamente si `admitido` da false. Borrarlo acá
      // rompería esa reacción: sin código no hay precio que pedir, y el cuadro
      // directamente desaparece en vez de avisar.
      if (nro && os) {
        localStorage.setItem(FACTURACION_ULTIMA_OS_KEY, JSON.stringify(os));
        loadPeriodo(String(nro));
      }
    },
    [loadPeriodo, resetPeriodo],
  );

  // "Replicar carga": precarga todos los campos de una prestación existente en una
  // carga nueva (no la edita). El formulario queda oculto (loadingReplicar) hasta que
  // todo esté resuelto, para que los autocompletes monten ya con el valor final.
  useEffect(() => {
    if (!isReplicando || !replicarParam) return;
    let active = true;
    setLoadingReplicar(true);
    (async () => {
      try {
        // Siempre desde la cabecera: replicar un ayudante debe replicar el equipo con
        // su médico principal en la cabecera.
        const p = await fetchPrestacionCabecera(replicarParam);
        if (!active) return;
        const esOrg = p.cod_medico_ejecutor != null && p.cod_medico_ejecutor !== "";
        setCodMedico(p.cod_medico);
        setPayeeEsOrganizacion(esOrg);
        setCodMedicoEjecutor(p.cod_medico_ejecutor ?? null);
        setDni(p.dni_paciente ?? "");
        setNombrePaciente(p.nombre_paciente ?? "");
        // La fecha es opcional: si la prestación se cargó sin fecha (carga por
        // cantidad) se deja vacía. Ponerle "hoy" la inventaría al guardar.
        setFechaPractica(p.fecha_practica ?? "");
        setCodClinica(p.cod_clinica ?? null);
        setAutorizacion(p.autorizacion ?? "");
        setCodNomenclador(p.cod_nomenclador ?? null);
        setCantidad(String(p.cantidad ?? 1));
        setSesion(String(p.sesion ?? 1));
        setTipoCalculo((p.tipo_calculo as TipoCalculo) ?? "A");
        setVia((p.via as ViaPractica) ?? "T");
        setPorcentaje(String(p.porcentaje ?? 100));
        const esAyudante = parseMoney(p.ayudante) > 0;
        setTipoPrestador(esAyudante ? "ayudante" : "medico");
        if (esAyudante) {
          setMontoAyudante(p.ayudante != null ? String(p.ayudante) : "0");
          setHonorarios("0");
          setGastos("0");
          setCoseguro("0");
        } else {
          setHonorarios(p.honorarios != null ? String(p.honorarios) : "0");
          setGastos(p.gastos != null ? String(p.gastos) : "0");
          setCoseguro(p.coseguro != null ? String(p.coseguro) : "0");
        }

        const codMedForCodigos = esOrg ? (p.cod_medico_ejecutor ?? p.cod_medico) : p.cod_medico;
        const [payeeRes, ejeRes, osRes, nomRes, cliRes] = await Promise.allSettled([
          fetchMedicos(p.cod_medico),
          esOrg && p.cod_medico_ejecutor ? fetchMedicos(p.cod_medico_ejecutor) : Promise.resolve([]),
          p.cod_obra_social ? fetchObrasSociales(p.cod_obra_social) : Promise.resolve([]),
          p.cod_nomenclador
            ? fetchCodigosHabilitados(codMedForCodigos, p.cod_nomenclador)
            : Promise.resolve([]),
          p.cod_clinica != null ? fetchClinicas(String(p.cod_clinica)) : Promise.resolve([]),
        ]);
        if (!active) return;

        if (payeeRes.status === "fulfilled") {
          const m = payeeRes.value.find((x) => x.cod === p.cod_medico);
          if (m) {
            setMedicoSeleccionado(m);
            setMedicoPreset(
              [m.nombre, m.matricula].filter((v) => v != null && v !== "").join(" · ") || null,
            );
          }
        }
        if (ejeRes.status === "fulfilled") {
          const m = (ejeRes.value as MedicoOption[]).find((x) => x.cod === p.cod_medico_ejecutor);
          if (m) {
            setMedicoEjecutor(m);
            setEjecutorPreset(
              [m.nombre, m.matricula].filter((v) => v != null && v !== "").join(" · ") || null,
            );
          }
        }
        if (osRes.status === "fulfilled") {
          const os = osRes.value.find((x) => String(x.nro_obra_social) === p.cod_obra_social);
          // Fija la OS y dispara la carga del período automático — el período de la
          // prestación original no se replica, se usa el activo actual de esa OS.
          // Se setea inline (no vía handleObraSocialChange) para no borrar el código
          // que ya precargamos: handleObraSocialChange limpia codNomenclador.
          if (os) {
            setObraSocial(os);
            localStorage.setItem(FACTURACION_ULTIMA_OS_KEY, JSON.stringify(os));
            loadPeriodo(String(os.nro_obra_social));
          }
        }
        if (nomRes.status === "fulfilled") {
          const nom = nomRes.value.find((x) => x.codigo === p.cod_nomenclador);
          if (nom) {
            setCodigoPreset(nom.descripcion || null);
            setCodNomencladorCategoria(nom.categoria ?? null);
          }
        }
        if (cliRes.status === "fulfilled") {
          const cli = cliRes.value.find((x) => x.cod === p.cod_clinica);
          if (cli) setClinicaPreset(cli.nombre || null);
        }
        // Ayudantes del equipo. Va después de setear codNomenclador (el efecto que
        // limpia ayudantes al cambiar de código ya corrió con la lista vacía y no
        // vuelve a dispararse), así que estas líneas persisten.
        if (p.grupo && p.grupo.length > 0) {
          const lineas = await buildAyudantesFromGrupo(p.grupo);
          if (active) {
            setAyudantes(lineas);
            if (tieneAutorizacionDistintaPorIntegrante(p, lineas)) {
              setAutorizacionPorIntegrante(true);
            }
          }
          // Pediatra del equipo (si hay) — se replica igual que los ayudantes: al
          // guardar se crea una fila nueva (`doGuardar` no mira `prestacionId`), no se
          // toca `pediatraOriginalRef` (eso es solo para reconciliar en edición).
          const lineaPediatra = await buildPediatraFromGrupo(p.grupo);
          if (active && lineaPediatra) setPediatra(lineaPediatra);
        }
      } catch {
        notify("No se pudo cargar la prestación a replicar.", "error");
      } finally {
        if (active) setLoadingReplicar(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReplicando, replicarParam]);

  // A dónde se vuelve al salir del formulario: con el botón "Volver" y, en edición,
  // también después de guardar. El `?from=` lo pone quien abrió la edición —
  // `carga` desde la tabla de abajo del propio formulario, el id de la factura desde
  // el detalle de factura — así se vuelve a la pantalla desde la que se entró.
  const volverA = isComplemento
    ? "/panel/facturacion/complementarias"
    : fromFactura === "carga"
      ? "/panel/facturacion/carga"
      : fromFactura
        ? `/panel/facturacion/periodos/${fromFactura}`
        : "/panel/facturacion/periodos";

  const totalEstimado = useMemo(() => {
    const porc = toInt(porcentaje, 100);
    const cant = toInt(cantidad, 1);
    const ses = toInt(sesion, 1);
    if (tipoPrestador === "ayudante") {
      const a = parseMoney(montoAyudante);
      return a * (porc / 100) * cant * ses;
    }
    const h = parseMoney(honorarios);
    const g = parseMoney(gastos);
    const cos = parseMoney(coseguro);
    // El coseguro no se escala por porcentaje (mismo criterio que el backend,
    // `calcular_importe_total`); sí escala por cantidad/sesión, igual que el resto.
    const base = ((h + g) * (porc / 100) - cos) * cant * ses;
    // Ayudante y pediatra escalan por cantidad/sesión igual que el cirujano (ver doGuardar).
    const pedMonto = pediatra ? montoPediatra(pediatra, precioPediatra) * cant * ses : 0;
    return base + totalAyudantes(ayudantes, precio, cant, ses) + pedMonto;
  }, [
    tipoPrestador, montoAyudante, honorarios, gastos, coseguro, porcentaje, cantidad, sesion,
    ayudantes, precio, pediatra, precioPediatra,
  ]);

  const buildMainItem = (): PrestacionItem => ({
    cod_medico: codMedico!,
    // El ejecutor solo se manda si el payee es una clínica.
    cod_medico_ejecutor: payeeEsOrganizacion ? codMedicoEjecutor : null,
    dni_paciente: dni || null,
    // Opcional: sin fecha el backend guarda NULL y cotiza al valor vigente de hoy.
    fecha_practica: fechaPractica || null,
    cod_clinica: codClinica,
    autorizacion: autorizacion || null,
    cod_nomenclador: codNomenclador!,
    cantidad: toInt(cantidad, 1),
    sesion: toInt(sesion, 1),
    tipo_calculo: tipoCalculo,
    via,
    honorarios: tipoPrestador === "ayudante" ? 0 : parseMoney(honorarios),
    gastos: tipoPrestador === "ayudante" ? 0 : parseMoney(gastos),
    ayudante: tipoPrestador === "ayudante" ? parseMoney(montoAyudante) : 0,
    porcentaje: toInt(porcentaje, 100),
    // Solo la fila principal lleva coseguro — nunca la de ayudante (el acto es uno solo).
    coseguro: tipoPrestador === "ayudante" ? 0 : parseMoney(coseguro),
    grupo_equipo_id: null,
  });

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    // La complementaria fija OS/período (van en el badge, no son campos del form). Todo
    // lo demás —carga nueva y edición— valida igual: ambas ahora dejan elegir la OS.
    if (!isComplemento) {
      if (!obraSocial) errs.obraSocial = "Requerido";
      // Sin automático, un período elegido a mano ("Elegir período" — obra social sin
      // período cerrado previo) es válido igual; solo es error si no hay ninguno de los dos.
      if (!periodo && !periodoOverride) errs.periodo = "Sin período activo";
      if (periodoOverride && periodo && periodoOverride < periodo.periodo) {
        errs.periodo = `El período no puede ser anterior a ${periodo.periodo_label}`;
      }
    }
    if (!codMedico) errs.codMedico = "Requerido";
    if (payeeEsOrganizacion && !codMedicoEjecutor)
      errs.codMedicoEjecutor = "Requerido — indicá el médico que ejecutó";
    if (!codNomenclador) errs.codNomenclador = "Requerido";
    // Código no admitido / sin precio ya no bloquea el guardado — PrecioPreviewCard
    // muestra el aviso "⚠ {motivo}" igual, pero la carga se permite en cualquier modo.
    // Ayudante suelto en modo Automático: si el código no tiene valor de ayudante, el
    // backend guardaría una fila en 0 sin badge de rol — hay que pasar a Manual y
    // cargar el importe a mano.
    if (
      tipoPrestador === "ayudante" &&
      tipoCalculo === "A" &&
      parseMoney(montoAyudante) <= 0
    ) {
      errs.montoAyudante =
        "Este código no tiene valor de ayudante — pasá a cálculo Manual y cargá el importe";
    }
    if (ayudantes.length > 0) {
      const vistos = new Set<string>();
      ayudantes.forEach((linea, idx) => {
        if (!linea.codMedico) {
          errs[`ayudante_${idx}`] = "Seleccioná el médico ayudante";
        } else if (linea.codMedico === codMedico) {
          errs[`ayudante_${idx}`] =
            "El ayudante no puede ser el mismo médico principal";
        } else if (vistos.has(linea.codMedico)) {
          errs[`ayudante_${idx}`] = "Ese médico ya está agregado como ayudante";
        }
        if (linea.codMedico) vistos.add(linea.codMedico);
      });
    }
    if (pediatra) {
      if (!pediatra.codMedico) {
        errs.pediatra = "Seleccioná el médico pediatra";
      } else if (pediatra.codMedico === codMedico) {
        errs.pediatra = "El pediatra no puede ser el mismo médico principal";
      } else if (ayudantes.some((a) => a.codMedico === pediatra.codMedico)) {
        errs.pediatra = "Ese médico ya está cargado como ayudante";
      }
      if (!pediatra.codNomenclador) {
        errs.pediatraCodigo = "Elegí el código que factura el pediatra";
      } else if (
        pediatra.tipoCalculo === "A" &&
        !precioPediatraLoading &&
        parseMoney(precioPediatra?.honorarios) <= 0
      ) {
        errs.pediatraCodigo =
          "Este código no tiene valor de honorarios — pasá a Manual y cargá el importe";
      }
    }
    setErrores(errs);
    return Object.keys(errs).length === 0;
  };

  const resetForm = () => {
    setCodNomenclador(null);
    setCodNomencladorCategoria(null);
    setHonorarios("0");
    setGastos("0");
    setCoseguro("0");
    setTipoCalculo("A");
    setVia("T");
    setPorcentaje("100");
    setCantidad("1");
    setSesion("1");
    setAyudantes([]);
    setPediatra(null);
    pediatraOriginalRef.current = null;
    setTipoPrestador("medico");
    setMontoAyudante("0");
    // El Nº de autorización suele repetirse en una tanda (la OS autoriza varias
    // prácticas con el mismo número), por eso se puede mantener entre cargas.
    if (!mantener.autorizacion) setAutorizacion("");
    // Si el payee es una clínica, "Mantener clínica" también aplica al Nº de socio: es
    // el mismo dato (la clínica se carga ahí, no en el campo "Clínica" — que por eso
    // queda oculto). Para un médico normal, "Mantener clínica" no lo toca: es el campo
    // "Clínica" aparte el que se mantiene, más abajo.
    const medicoMantenidoPorClinica = mantener.clinica && payeeEsOrganizacion;
    if (!mantener.medico && !medicoMantenidoPorClinica) {
      setCodMedico(null);
      setMedicoSeleccionado(null);
      setPayeeEsOrganizacion(false);
      setCodMedicoEjecutor(null);
      setMedicoEjecutor(null);
      setMedicoResetKey((k) => k + 1);
      setEjecutorResetKey((k) => k + 1);
    } else if (!mantener.medico) {
      // Se mantuvo el payee por "Mantener clínica", pero el médico ejecutor es un dato
      // de la práctica puntual (puede cambiar entre cargas de la misma clínica) — se
      // limpia igual, salvo que "Mantener médico" también esté tildado.
      setCodMedicoEjecutor(null);
      setMedicoEjecutor(null);
      setEjecutorResetKey((k) => k + 1);
    }
    if (!mantener.paciente) {
      setDni("");
      setNombrePaciente("");
      setPacienteResetKey((k) => k + 1);
    }
    if (!mantener.fecha) {
      setFechaPractica("");
    }
    if (!mantener.clinica) {
      setCodClinica(null);
      setClinicaPreset(null);
      setClinicaResetKey((k) => k + 1);
    }
    if (!mantener.obraSocial) {
      setObraSocial(null);
      resetPeriodo();
      setPeriodoOverride(null);
      setOsResetKey((k) => k + 1);
    }
    setErrores({});
    setNomencladorResetKey((k) => k + 1);

    // Campos que quedaron vacíos, en el orden en que están en pantalla: el efecto de
    // abajo enfoca el primero que exista. Se calcula desde `mantener` y no leyendo el
    // estado, que en esta closure todavía tiene los valores viejos.
    //
    // "Clínica" no entra: está debajo del código, así que nunca es el primer vacío
    // (el código se limpia siempre). El código cierra la lista por el mismo motivo.
    const pendientes: FocusField[] = [];
    if (!mantener.medico && !medicoMantenidoPorClinica) {
      pendientes.push("medico");
    } else if (!mantener.medico) {
      // El payee quedó (por "Mantener clínica") pero el ejecutor se limpió: es el
      // primer campo realmente vacío, no "Nº socio" (que ya tiene la clínica).
      pendientes.push("medicoEjecutor");
    }
    if (!mantener.obraSocial) pendientes.push("obraSocial");
    if (!mantener.paciente) pendientes.push("paciente");
    if (!mantener.fecha) pendientes.push("fecha");
    pendientes.push("codigo");
    pendingFocusRef.current = pendientes;
  };

  // Salir de la edición hacia el alta (`/carga/:id` → `/carga`) NO remonta el
  // componente: es el mismo elemento en la misma posición del árbol de rutas, así que
  // React conserva su estado. Sin esto, el formulario de alta aparecería cargado con
  // los datos de la prestación que se acaba de editar.
  const modoEdicionAnteriorRef = useRef(isEdit);
  useEffect(() => {
    const salioDeEdicion = modoEdicionAnteriorRef.current && !isEdit;
    modoEdicionAnteriorRef.current = isEdit;
    if (!salioDeEdicion) return;
    setEditMeta(null);
    setEditHidratado(false);
    setEditNotFound(false);
    setMedicoPreset(null);
    setEjecutorPreset(null);
    setCodigoPreset(null);
    setClinicaPreset(null);
    setUltimoMedico(null);
    ayudantesOriginalesRef.current = [];
    headPrestacionIdRef.current = null;
    resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  const doGuardarEdit = async () => {
    if (!validate() || !editId) return;
    // Efectivos = lo que está elegido ahora en el form, no el snapshot original de
    // `editMeta`: si el operador cambió la OS/período, esto viaja en el PATCH de la
    // cabecera y el backend mueve la fila (`editar_prestacion`, no-op si no cambió).
    const obraSocialEfectiva = obraSocial
      ? String(obraSocial.nro_obra_social)
      : editMeta!.cod_obra_social;
    const periodoEfectivo = periodoOverride ?? periodo?.periodo ?? editMeta!.periodo;
    const payload: PrestacionUpdate = {
      cod_medico: codMedico!,
      cod_medico_ejecutor: payeeEsOrganizacion ? codMedicoEjecutor : null,
      cod_obra_social: obraSocialEfectiva,
      periodo: periodoEfectivo,
      dni_paciente: dni || null,
      fecha_practica: fechaPractica || null,
      cod_clinica: codClinica,
      autorizacion: autorizacion || null,
      cod_nomenclador: codNomenclador!,
      cantidad: toInt(cantidad, 1),
      sesion: toInt(sesion, 1),
      tipo_calculo: tipoCalculo,
      via,
      honorarios: tipoPrestador === "ayudante" ? 0 : parseMoney(honorarios),
      gastos: tipoPrestador === "ayudante" ? 0 : parseMoney(gastos),
      ayudante: tipoPrestador === "ayudante" ? parseMoney(montoAyudante) : 0,
      porcentaje: toInt(porcentaje, 100),
      coseguro: tipoPrestador === "ayudante" ? 0 : parseMoney(coseguro),
    };
    // La cabecera real (no necesariamente editId: puede haberse editado un ayudante).
    const headId = headPrestacionIdRef.current ?? Number(editId);
    setGuardando(true);
    try {
      // 1. Cabecera del equipo.
      await editarPrestacion(headId, payload);

      // 2. Reconciliar los ayudantes del equipo. Campos de la práctica que comparten
      // con la cabecera (se copian para que el grupo quede coherente).
      const shared = {
        dni_paciente: dni || null,
        fecha_practica: fechaPractica || null,
        cod_clinica: codClinica,
        autorizacion: autorizacion || null,
        cod_nomenclador: codNomenclador!,
        via,
      };
      const idsVigentes = new Set<number>();
      const nuevos: PrestacionItem[] = [];
      for (const linea of ayudantes) {
        if (!linea.codMedico) continue;
        const ayAmount =
          linea.tipoCalculo === "A"
            ? parseMoney(precio?.ayudante)
            : parseMoney(linea.precioManual);
        const ayFields = {
          cod_medico: linea.codMedico,
          cod_medico_ejecutor: null,
          ...shared,
          // Con "autorización por integrante" activo, cada ayudante lleva la suya en
          // vez de la de la cabecera (ver comentario equivalente en `doGuardar`).
          autorizacion: autorizacionPorIntegrante
            ? (linea.autorizacion.trim() || null)
            : shared.autorizacion,
          // Mismo criterio que en el alta (doGuardar): el ayudante escala con la
          // cantidad/sesión de la cabecera, no queda fijo en 1.
          cantidad: toInt(cantidad, 1),
          sesion: toInt(sesion, 1),
          tipo_calculo: linea.tipoCalculo,
          honorarios: 0,
          gastos: 0,
          ayudante: ayAmount,
          porcentaje: toInt(linea.porcentaje, 100),
        };
        if (linea.prestacionId) {
          // Existente → PATCH. Va también con la OS/período EFECTIVOS: si la cabecera
          // se movió arriba, el ayudante tiene que moverse con ella — si no, el equipo
          // queda partido entre dos facturas.
          idsVigentes.add(linea.prestacionId);
          await editarPrestacion(linea.prestacionId, {
            ...ayFields,
            cod_obra_social: obraSocialEfectiva,
            periodo: periodoEfectivo,
          });
        } else {
          // Nuevo → se crea junto al equipo (mismo grupo_equipo_id que la cabecera).
          nuevos.push({ ...ayFields, grupo_equipo_id: headId });
        }
      }
      // Los nuevos van al mismo período/OS EFECTIVOS del equipo (ya movido si la
      // cabecera cambió de OS/período arriba) — no al `editMeta` original, o el
      // ayudante nuevo quedaría en una cabecera distinta a la de su propia cirugía.
      if (nuevos.length > 0) {
        await crearPrestaciones({
          obra_social: obraSocialEfectiva,
          periodo: periodoEfectivo,
          prestaciones: nuevos,
        });
      }
      // 3. Los ayudantes originales que ya no están → se anulan.
      const removidos = ayudantesOriginalesRef.current.filter((id) => !idsVigentes.has(id));
      for (const id of removidos) {
        await anularPrestacion(id);
      }

      // 2b. Reconciliar el PEDIATRA — bloque PARALELO al de ayudantes: no reutiliza ni
      // modifica el de arriba. Tiene su propio POST/PATCH porque, a diferencia del
      // ayudante, no comparte `cod_nomenclador`/`via` con la cabecera (`shared` de
      // arriba es del cirujano, no del pediatra).
      const pediatraOriginalId = pediatraOriginalRef.current;
      if (pediatra?.codMedico && pediatra.codNomenclador) {
        const pedAmount =
          pediatra.tipoCalculo === "A"
            ? parseMoney(precioPediatra?.honorarios)
            : parseMoney(pediatra.precioManual);
        const pedFields = {
          cod_medico: pediatra.codMedico,
          cod_medico_ejecutor: null,
          dni_paciente: dni || null,
          fecha_practica: fechaPractica || null,
          cod_clinica: codClinica,
          autorizacion: autorizacionPorIntegrante
            ? (pediatra.autorizacion.trim() || null)
            : (autorizacion || null),
          cod_nomenclador: pediatra.codNomenclador,
          via: "T" as ViaPractica,
          // Mismo criterio que el ayudante (ver doGuardarEdit más arriba): escala con
          // la cantidad/sesión de la cabecera.
          cantidad: toInt(cantidad, 1),
          sesion: toInt(sesion, 1),
          tipo_calculo: pediatra.tipoCalculo,
          honorarios: pedAmount,
          gastos: 0,
          ayudante: 0,
          coseguro: 0,
          porcentaje: toInt(pediatra.porcentaje, 100),
          rol: "pediatra" as const,
        };
        if (pediatra.prestacionId) {
          // Existente (misma fila) → PATCH, también con la OS/período efectivos —
          // mismo motivo que con el ayudante: el pediatra tiene que moverse junto al
          // resto del equipo si la cabecera cambió de OS/período.
          await editarPrestacion(pediatra.prestacionId, {
            ...pedFields,
            cod_obra_social: obraSocialEfectiva,
            periodo: periodoEfectivo,
          });
        } else {
          // Nuevo. Si había un pediatra ORIGINAL distinto, se reemplaza: se anula antes
          // de crear el nuevo — el backend rechaza un 2º pediatra activo en el equipo.
          if (pediatraOriginalId) {
            await anularPrestacion(pediatraOriginalId);
          }
          await crearPrestaciones({
            obra_social: obraSocialEfectiva,
            periodo: periodoEfectivo,
            prestaciones: [{ ...pedFields, grupo_equipo_id: headId }],
          });
        }
      } else if (pediatraOriginalId) {
        // Se quitó el pediatra que había, sin agregar uno nuevo → se anula.
        await anularPrestacion(pediatraOriginalId);
      }

      notify("Prestación actualizada.");
      // Vuelta a la pantalla desde la que se entró a editar (el formulario de carga o
      // el detalle de factura, según el `?from=`). Además de ser lo esperado, evita el
      // riesgo de un segundo guardado sobre un estado desactualizado: los ayudantes
      // recién creados todavía no tienen su `prestacionId` y se duplicarían.
      navigate(volverA);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      notify(
        detailMessage(e?.response?.data?.detail) || "Error al guardar",
        "error",
      );
    } finally {
      setGuardando(false);
    }
  };

  const doGuardar = async (confirmarDuplicado = false) => {
    if (isEdit) {
      await doGuardarEdit();
      return;
    }
    if (!validate()) return;

    const mainItem = buildMainItem();
    const items: PrestacionItem[] = [mainItem];

    for (const linea of ayudantes) {
      if (!linea.codMedico) continue;
      const ayAmount =
        linea.tipoCalculo === "A"
          ? parseMoney(precio?.ayudante)
          : parseMoney(linea.precioManual);
      items.push({
        cod_medico: linea.codMedico,
        // El ayudante es un médico payee: nunca lleva ejecutor.
        cod_medico_ejecutor: null,
        dni_paciente: mainItem.dni_paciente,
        fecha_practica: mainItem.fecha_practica,
        cod_clinica: mainItem.cod_clinica,
        // Por defecto es un dato de la práctica, no del prestador: se copia igual que
        // dni/fecha/clínica. Con "autorización por integrante" activo, cada ayudante
        // lleva la suya (algunas OS emiten un número distinto por miembro del equipo).
        autorizacion: autorizacionPorIntegrante
          ? (linea.autorizacion.trim() || null)
          : mainItem.autorizacion,
        cod_nomenclador: mainItem.cod_nomenclador!,
        via: mainItem.via,
        // El ayudante asiste la misma cantidad/sesión que el cirujano: si la
        // práctica se cargó ×N, el ayudante también cobra ×N (antes quedaba
        // siempre en 1, sin importar lo cargado en la cabecera).
        cantidad: mainItem.cantidad,
        sesion: mainItem.sesion,
        tipo_calculo: linea.tipoCalculo,
        honorarios: 0,
        gastos: 0,
        ayudante: ayAmount,
        porcentaje: toInt(linea.porcentaje, 100),
        grupo_equipo_id: null,
      });
    }

    // Pediatra: va AL FINAL (después de los ayudantes) y nunca es `items[0]` — el
    // backend valida que el primer ítem sea siempre el cirujano y rechaza con 422 si
    // no. Código y médico son los PROPIOS del pediatra, no los del cirujano.
    if (pediatra?.codMedico && pediatra.codNomenclador) {
      const pedAmount =
        pediatra.tipoCalculo === "A"
          ? parseMoney(precioPediatra?.honorarios)
          : parseMoney(pediatra.precioManual);
      items.push({
        cod_medico: pediatra.codMedico,
        cod_medico_ejecutor: null,
        dni_paciente: mainItem.dni_paciente,
        fecha_practica: mainItem.fecha_practica,
        cod_clinica: mainItem.cod_clinica,
        autorizacion: autorizacionPorIntegrante
          ? (pediatra.autorizacion.trim() || null)
          : mainItem.autorizacion,
        // Código PROPIO del pediatra — NO el del cirujano.
        cod_nomenclador: pediatra.codNomenclador,
        via: "T",
        // Mismo criterio que el ayudante: escala con la cantidad/sesión de la cabecera.
        cantidad: mainItem.cantidad,
        sesion: mainItem.sesion,
        tipo_calculo: pediatra.tipoCalculo,
        // El pediatra cobra honorarios (de su código). El backend pisa el monto con el
        // valor autoritativo del lookup en modo Automático; acá alcanza con que sea >0
        // (marker) — igual criterio que honorarios/gastos/ayudante en el resto del form.
        honorarios: pedAmount,
        gastos: 0,
        ayudante: 0,
        porcentaje: toInt(pediatra.porcentaje, 100),
        // Coseguro siempre 0 en la fila del pediatra — lo cubre el cirujano. El backend
        // también lo fuerza a 0 (defensa en profundidad), pero no hace falta mandar otra
        // cosa que no sea 0 acá.
        coseguro: 0,
        grupo_equipo_id: null,
        rol: "pediatra",
      });
    }

    setGuardando(true);
    try {
      // El complemento se referencia por factura_id (no manda obra_social ni período).
      const result = isComplemento
        ? await crearPrestacionesComplementaria(
            { factura_id: complementoId!, prestaciones: items },
            confirmarDuplicado,
          )
        : await crearPrestaciones(
            {
              obra_social: String(obraSocial!.nro_obra_social),
              periodo: periodoOverride,
              prestaciones: items,
            },
            confirmarDuplicado,
          );
      notify(
        `Prestación guardada — total ${result.importe_total}` +
          (result.periodo ? ` (período ${result.periodo})` : ""),
      );
      // Antes de resetear: el reset puede limpiar el médico y la tabla lo necesita
      // para seguir mostrando lo que se acaba de cargar.
      setUltimoMedico(medicoSeleccionado);
      setRefreshKey((k) => k + 1);
      resetForm();
    } catch (e: any) {
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail;
      if (
        status === 409 &&
        typeof detail === "object" &&
        detail?.duplicado !== undefined
      ) {
        setDuplicado({ mensaje: detailMessage(detail), id: detail.duplicado });
      } else {
        notify(detailMessage(detail) || "Error al guardar", "error");
      }
    } finally {
      setGuardando(false);
    }
  };

  // Si el payee es una clínica, no se puede guardar sin el médico ejecutor.
  const ejecutorOk = !payeeEsOrganizacion || !!codMedicoEjecutor;
  // El período editado no puede ser anterior al automático (el backend lo rechaza con 422).
  const periodoOk = !periodoOverride || !periodo || periodoOverride >= periodo.periodo;
  // Resuelto = hay automático, o el operador ya eligió uno a mano con "Elegir período"
  // (caso de obra social sin período cerrado previo, donde no hay automático que
  // esperar — ver DatosGeneralesSection y resolver_periodo_colegio_carga en el back).
  const periodoResuelto = !!periodo || !!periodoOverride;
  const periodoErrorBloquea = periodoError && !periodoOverride;

  const canGuardar = isEdit
    ? !!obraSocial &&
      periodoResuelto &&
      !periodoErrorBloquea &&
      periodoOk &&
      !!codMedico &&
      ejecutorOk &&
      !!codNomenclador &&
      !guardando &&
      !precioLoading &&
      !loadingEdit &&
      editMeta?.estado === "A"
    : isComplemento
      ? !!codMedico &&
        ejecutorOk &&
        !!codNomenclador &&
        !guardando &&
        !precioLoading &&
        !!complementoMeta
      : !!obraSocial &&
        periodoResuelto &&
        !periodoErrorBloquea &&
        periodoOk &&
        !!codMedico &&
        ejecutorOk &&
        !!codNomenclador &&
        !guardando &&
        !precioLoading;

  // Atajos de teclado. `canGuardar` ya cubre el doble submit: incluye !guardando.
  useHotkeys((e) => {
    if (!isMod(e) || e.altKey) return;
    if (duplicado || isModalOpen()) return;

    if (e.key === "Enter") {
      e.preventDefault();
      if (!canGuardar) return;
      doGuardar();
      return;
    }
    // toLowerCase cubre Caps Lock; el guard de shift evita Ctrl+Shift+L.
    if (e.key.toLowerCase() === "l" && !e.shiftKey) {
      e.preventDefault();
      if (guardando || isEdit) return;
      resetForm();
    }
  });

  // Devuelve el foco al primer campo por cargar. El guard de `guardando` no es
  // opcional: `resetForm` corre dentro del try y `setGuardando(false)` recién en el
  // finally, así que al remontar los campos siguen deshabilitados y `focus()` sería un
  // no-op silencioso. Al pasar a false el efecto vuelve a correr y ahí sí enfoca.
  useEffect(() => {
    if (!pendingFocusRef.current || guardando) return;
    focusFirstField(formRef.current, pendingFocusRef.current);
    pendingFocusRef.current = null;
  }, [nomencladorResetKey, guardando]);

  // Enter avanza al campo siguiente. Los handlers de MUI viven en el input (más
  // adentro) y corren primero, así que acá sólo llegan los Enter que el autocomplete
  // no consumió para elegir una opción.
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter") return;
    if (e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.defaultPrevented) return;

    const el = e.target as HTMLElement;
    if (el.closest('[aria-expanded="true"]')) return;
    if (el.tagName === "BUTTON" || el.tagName === "TEXTAREA") return;

    const next = nextFocusable(formRef.current, el);
    if (!next) return;
    e.preventDefault();
    next.focus();
  };

  // Los campos ya no se bloquean por orden de carga (p. ej. no hace falta elegir Obra
  // Social antes de tocar Paciente/Fecha/Código/etc.): solo se deshabilitan mientras se
  // está guardando, o cuando el registro de fondo (edición/complementaria) todavía no
  // está disponible o no es editable. El campo Código es la única excepción real: sigue
  // atado al Médico porque los códigos habilitados se piden a una API scoped por médico
  // (no es una restricción de orden visual, es una dependencia de datos).
  const formDisabled = isEdit
    ? loadingEdit || guardando || editMeta?.estado !== "A"
    : isComplemento
      ? loadingComplemento || guardando || !complementoMeta
      : guardando;
  const maxAyudantes = precio?.cantidad_ayudantes ?? 0;
  // La sección se muestra (en carga, replicar y edición) si el código admite ayudantes
  // o si ya hay líneas cargadas (p. ej. un equipo cuyo código reporta 0 de referencia).
  // No aplica cuando esta carga ES un ayudante suelto (tipoPrestador="ayudante"): ese
  // modo factura un único monto y no arma equipo.
  const admiteAyudante =
    tipoPrestador === "medico" &&
    !!precio && !precioLoading && (maxAyudantes > 0 || ayudantes.length > 0);

  // Sección Pediatra: mismo criterio de "medico + precio resuelto" que ayudantes, más
  // el flag que trae el código (`admite_pediatra` — sólo parto/cesárea). Se mantiene
  // viva si ya hay un pediatra cargado, aunque el flag cambiara (mismo criterio que
  // `ayudantes.length > 0` arriba, para no ocultar un equipo ya armado).
  const admitePediatra =
    tipoPrestador === "medico" &&
    !!precio && !precioLoading && (!!precio.admite_pediatra || !!pediatra);

  // El médico del formulario mientras haya uno; si el reset lo limpió, el último que
  // se guardó. Como `onMedicoChange` invalida el snapshot, esto sólo sobrevive a un
  // reset programático: si el operador limpia el campo a mano, la tabla se oculta.
  const medicoTabla = medicoSeleccionado ?? ultimoMedico;

  const codObraTabla = codObraEfectivo;
  const periodoTabla = isComplemento
    ? (complementoMeta?.periodo ?? null)
    : (periodoOverride ?? periodo?.periodo ?? null);

  // Antes que cualquier otro gate: sin médicos y obras sociales precargados no hay
  // formulario que mostrar (los autocompletes de médico/obra social dependen de
  // estas listas para filtrar en memoria).
  if (!medicosPrecargados || !obrasSocialesPrecargadas || !clinicasPrecargadas) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.headerIcon}>
            <FilePlus2 size={22} />
          </span>
          <div>
            <h1 className={styles.title}>Cargar prestación</h1>
          </div>
        </div>
        {errorPrecarga ? (
          <div className={styles.errorBox}>
            ⚠ No se pudieron cargar los médicos, las obras sociales y las clínicas.{" "}
            <button
              type="button"
              className={styles.periodoLinkBtn}
              onClick={() => setReintentoPrecarga((k) => k + 1)}
            >
              Reintentar
            </button>
          </div>
        ) : (
          <p className={styles.mutedText}>Cargando formulario, esperá…</p>
        )}
      </div>
    );
  }

  // Solo en la primera lectura: la recarga posterior a guardar no tiene que blanquear
  // la pantalla — el formulario ya tiene los datos y se actualizan en el lugar. El
  // gate es `editHidratado` (y no `editMeta`, que se setea a mitad de la precarga):
  // si el formulario se muestra antes de tener los labels, los autocompletes montan
  // con "(valor actual)" y ya no se recuperan.
  if (isEdit && loadingEdit && !editHidratado) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.headerIcon}>
            <FilePlus2 size={22} />
          </span>
          <div>
            <h1 className={styles.title}>Editar prestación</h1>
          </div>
        </div>
        <p className={styles.mutedText}>Cargando prestación…</p>
      </div>
    );
  }

  if (isEdit && editNotFound) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.headerIcon}>
            <FilePlus2 size={22} />
          </span>
          <div>
            <h1 className={styles.title}>Editar prestación</h1>
          </div>
        </div>
        <div className={styles.errorBox}>
          No se encontró la prestación solicitada.
        </div>
      </div>
    );
  }

  if (isReplicando && loadingReplicar) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.headerIcon}>
            <FilePlus2 size={22} />
          </span>
          <div>
            <h1 className={styles.title}>Cargar prestación</h1>
          </div>
        </div>
        <p className={styles.mutedText}>Cargando datos para replicar…</p>
      </div>
    );
  }

  if (isComplemento && loadingComplemento) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.headerIcon}>
            <FilePlus2 size={22} />
          </span>
          <div>
            <h1 className={styles.title}>Cargar en complementaria</h1>
          </div>
        </div>
        <p className={styles.mutedText}>Cargando factura complementaria…</p>
      </div>
    );
  }

  if (isComplemento && complementoError) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.headerIcon}>
            <FilePlus2 size={22} />
          </span>
          <div>
            <h1 className={styles.title}>Cargar en complementaria</h1>
          </div>
          <div className={styles.headerRight}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => navigate("/panel/facturacion/complementarias")}
            >
              <ArrowLeft size={15} /> Volver
            </button>
          </div>
        </div>
        <div className={styles.errorBox}>{complementoError}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerIcon}>
          <FilePlus2 size={22} />
        </span>
        <div>
          <h1 className={styles.title}>
            {isComplemento
              ? "Cargar en complementaria"
              : isEdit
                ? "Editar prestación"
                : "Cargar prestación"}
          </h1>
          <p className={styles.subtitle}>
            {isComplemento
              ? "Prestaciones rezagadas que se envían aparte a la obra social."
              : isEdit
                ? "Modificá los datos ya cargados de esta prestación."
                : isReplicando
                  ? "Revisá los datos replicados y guardá para crear una prestación nueva."
                  : "Alta individual o de equipo quirúrgico."}
          </p>
        </div>
        <div className={styles.headerRight}>
          {isComplemento ? null : (
            <>
              {periodo && (
                <span className={`${styles.infoChip} ${styles.chipNeutral}`}>
                  Período: {periodo.periodo_label}
                </span>
              )}
              {obraSocial && (
                <span className={`${styles.infoChip} ${styles.chipNeutral}`}>
                  OS: {obraSocial.nro_obra_social} · {obraSocial.nombre}
                </span>
              )}
            </>
          )}
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => navigate(volverA)}
          >
            <ArrowLeft size={15} /> Volver
          </button>
        </div>
      </div>

      {isReplicando && !loadingReplicar && (
        <div className={styles.complementoAlert}>
          <AlertTriangle size={18} className={styles.complementoAlertIcon} />
          <span>
            Replicando los datos de la prestación <strong>#{replicarParam}</strong> — al guardar se
            crea una prestación <strong>nueva</strong>, la original no se modifica.
          </span>
        </div>
      )}

      {isComplemento && complementoMeta && (
        <div className={styles.complementoAlert}>
          <AlertTriangle size={18} className={styles.complementoAlertIcon} />
          <span>
            Estás cargando en una <strong>complementaria</strong> ({versionLabel(complementoMeta.version)})
            {" "}de la obra social <strong>{complementoMeta.cod_obra}</strong> en el período{" "}
            <strong>{complementoMeta.periodo_label}</strong>.
          </span>
        </div>
      )}

      <motion.div
        className={styles.body}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className={styles.layout} ref={formRef} onKeyDown={handleFormKeyDown}>
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
              // Cambió el payee: el ejecutor cargado (si había) puede no corresponder a
              // este médico/clínica nuevo — se limpia siempre, no solo al dejar de ser
              // organización (pasar de una clínica a otra también lo invalida). El campo
              // sigue montado en ese caso (la sección "Médico ejecutor" no desaparece),
              // así que hace falta remontarlo para que no quede el texto viejo escrito.
              setCodMedicoEjecutor(null);
              setMedicoEjecutor(null);
              setEjecutorResetKey((k) => k + 1);
              if (esOrg) {
                // Payee clínica: el campo "Clínica" de más abajo queda de más — la
                // clínica ya es el propio payee — así que se limpia y se oculta.
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
            // Mismo criterio que el propio payee (disabled={guardando}): el ejecutor
            // depende de haber elegido una clínica, no de la obra social/período.
            ejecutorDisabled={guardando}
            ejecutorError={errores.codMedicoEjecutor}
            ejecutorPresetLabel={ejecutorPreset ?? (isEdit ? "(valor actual)" : undefined)}
            ejecutorResetKey={ejecutorResetKey}
            medicosPrecargados={medicosPrecargados}
          />

          {/* 2. Obra social + período. En complementaria son fijos (van en el badge).
              Editable también en edición: cambiar la OS/período mueve la fila a otra
              cabecera y re-cotiza (ver `editar_prestacion` en el backend) — el mismo
              PATCH ya lo soportaba, sólo faltaba dejar de mostrarlo como sólo-lectura. */}
          {isComplemento ? null : (
            <>
              <DatosGeneralesSection
                key={`os-${osResetKey}`}
                obraSocial={obraSocial}
                onObraSocialChange={handleObraSocialChange}
                periodo={periodo}
                periodoError={periodoError}
                // No incluir periodoLoading en `guardando`: al elegir la OS, loadPeriodo
                // pone loading en true sincrónicamente y, si esto deshabilita el input,
                // el navegador le saca el foco — y se rompe el "Enter para avanzar". En
                // edición, además se bloquea si la prestación ya no está abierta.
                disabled={isEdit ? formDisabled : guardando}
                periodoOverride={periodoOverride}
                onPeriodoOverrideChange={setPeriodoOverride}
                obrasSocialesPrecargadas={obrasSocialesPrecargadas}
              />
              {isEdit && editMeta && editMeta.estado !== "A" && (
                <div className={styles.errorBox}>
                  ⚠ Esta prestación ya no está en estado abierto — no se puede
                  editar.
                </div>
              )}
            </>
          )}

          {/* 3. Paciente */}
          <PacienteSection
            key={`paciente-${pacienteResetKey}`}
            dni={dni}
            nombrePaciente={nombrePaciente}
            onDniChange={setDni}
            onAfiliadoFound={(a: AfiliadoRead) => {
              setDni(a.dni);
              setNombrePaciente(a.nombre);
            }}
            disabled={formDisabled}
            error={errores.dni}
          />

          {/* 4. Fecha de práctica */}
          <div className={styles.section}>
            <span className={styles.sectionTitle}>
              Fecha de práctica{" "}
              <span className={styles.sectionHint}>(opcional)</span>
            </span>
            <div className={styles.filterField} data-field="fecha">
              <input
                className={styles.input}
                type="date"
                value={fechaPractica}
                onChange={(e) => setFechaPractica(e.target.value)}
                disabled={formDisabled}
              />
              <span className={styles.mutedText}>
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
            onNomencladorChange={(cod, nom) => {
              setCodNomenclador(cod);
              setCodNomencladorCategoria(nom?.categoria ?? null);
            }}
            codMedico={codMedicoEfectivo}
            precio={precio}
            precioLoading={precioLoading}
            precioError={precioError}
            via={via}
            onViaChange={setVia}
            mostrarVia={codNomencladorCategoria === "Honorarios individuales"}
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

          {/* 6. Clínica — se oculta si el payee (Nº socio) ya es una clínica: sería
              redundante volver a pedirla acá. */}
          {!payeeEsOrganizacion && (
            <ClinicaSection
              codClinica={codClinica}
              clinicaNombre={clinicaPreset}
              onClinicaChange={(cod, clinica) => {
                setCodClinica(cod);
                setClinicaPreset(clinica?.nombre ?? null);
                // Recién creada (o cualquiera resuelta que no viniera en la precarga):
                // se agrega a la lista en memoria para que quede buscable/reseleccionable
                // sin recargar la página.
                if (clinica) {
                  setClinicasPrecargadas((prev) => {
                    if (!prev || prev.some((c) => c.cod === clinica.cod)) return prev;
                    return [...prev, clinica].sort((a, b) => a.nombre.localeCompare(b.nombre));
                  });
                }
              }}
              onClinicaDeleted={(cod) => {
                setClinicasPrecargadas((prev) => (prev ? prev.filter((c) => c.cod !== cod) : prev));
              }}
              disabled={formDisabled}
              clinicasPrecargadas={clinicasPrecargadas}
              resetKey={clinicaResetKey}
            />
          )}

          {/* 6b. Autorización */}
          <div className={styles.section}>
            <span className={styles.sectionTitle}>
              Autorización{" "}
              <span className={styles.sectionHint}>(opcional)</span>
            </span>
            <div className={styles.filterField}>
              <input
                className={styles.input}
                type="text"
                maxLength={30}
                value={autorizacion}
                onChange={(e) => setAutorizacion(e.target.value)}
                disabled={formDisabled}
                placeholder="Nº de autorización de la obra social"
              />
            </div>
            {admiteAyudante && (
              <label className={styles.radioLabel}>
                <input
                  type="checkbox"
                  checked={autorizacionPorIntegrante}
                  onChange={(e) => setAutorizacionPorIntegrante(e.target.checked)}
                  disabled={formDisabled}
                />
                Un Nº de autorización por cada integrante del equipo
              </label>
            )}
          </div>

          {/* 7. Sesión y cantidad */}
          <div className={styles.section}>
            <span className={styles.sectionTitle}>Cantidad y sesiones</span>
            <div className={styles.fieldsRow}>
              <div className={styles.filterField}>
                <label className={styles.filterLabel}>
                  Cantidad <span className={styles.errorText}>*</span>
                </label>
                <NumericInput
                  className={styles.input}
                  min={1}
                  value={cantidad}
                  onChange={setCantidad}
                  disabled={formDisabled}
                />
              </div>
              <div className={styles.filterField}>
                <label className={styles.filterLabel}>
                  Sesión <span className={styles.errorText}>*</span>
                </label>
                <NumericInput
                  className={styles.input}
                  min={1}
                  value={sesion}
                  onChange={setSesion}
                  disabled={formDisabled}
                />
              </div>
              <div className={styles.filterField}>
                <label className={styles.filterLabel}>% Porcentaje</label>
                <NumericInput
                  className={styles.input}
                  min={1}
                  max={100}
                  value={porcentaje}
                  onChange={setPorcentaje}
                  disabled={formDisabled}
                />
              </div>
            </div>
          </div>

          {/* 7b. Tipo de prestador: cirujano (factura honorarios/gastos, admite equipo)
              o ayudante suelto (factura un único monto de ayudante, sin equipo). Permite
              cargar al ayudante como socio del Colegio aunque el cirujano no lo sea. */}
          <div className={styles.section}>
            <span className={styles.sectionTitle}>Tipo de prestador</span>
            <div className={styles.radioRow}>
              {(
                [
                  ["medico", "Médico cirujano"],
                  ["ayudante", "Ayudante"],
                ] as const
              ).map(([v, label]) => (
                <label key={v} className={styles.radioLabel}>
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
                        setGastos(precio.gastos ?? "0");
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
          <div className={styles.section}>
            <span className={styles.sectionTitle}>Tipo de cálculo</span>
            <div className={styles.radioRow}>
              {(
                [
                  ["A", "Automático"],
                  ["M", "Manual"],
                ] as const
              ).map(([v, label]) => (
                <label key={v} className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="tipoCalculo"
                    value={v}
                    checked={tipoCalculo === v}
                    onChange={() => {
                      setTipoCalculo(v);
                      // El efecto que sincroniza los montos solo mira `precio`:
                      // si el operador vuelve a Automático sin que `precio` haya
                      // cambiado, ese efecto no dispara y quedaría el monto manual
                      // viejo puesto en un campo que ya se ve (y se guarda) como
                      // automático. Se resincroniza acá, en el momento del toggle.
                      if (v === "A" && precio) {
                        if (tipoPrestador === "ayudante") {
                          setMontoAyudante(precio.ayudante ?? "0");
                        } else {
                          setHonorarios(precio.honorarios ?? "0");
                          setGastos(precio.gastos ?? "0");
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

          {/* 9. Montos: Honorarios/Gastos para el cirujano, un único campo para el ayudante. */}
          <div className={styles.section}>
            <span className={styles.sectionTitle}>
              Montos
              {tipoCalculo === "M" ? (
                <span
                  className={styles.sectionHint}
                  style={{ color: "#92400e" }}
                >
                  Manual
                </span>
              ) : (
                <span className={styles.sectionHint}>
                  Automático — pasá a Manual para editar
                </span>
              )}
            </span>
            {tipoPrestador === "ayudante" ? (
              <div className={styles.fieldsRow}>
                <div className={styles.filterField}>
                  <label className={styles.filterLabel}>Ayudante</label>
                  <NumericInput
                    className={styles.input}
                    decimals min={0}
                    value={montoAyudante}
                    onChange={setMontoAyudante}
                    disabled={formDisabled || tipoCalculo === "A"}
                  />
                  {errores.montoAyudante && (
                    <span className={styles.errorText}>{errores.montoAyudante}</span>
                  )}
                </div>
              </div>
            ) : (
              <div className={styles.fieldsRow}>
                <div className={styles.filterField}>
                  <label className={styles.filterLabel}>Honorarios</label>
                  <NumericInput
                    className={styles.input}
                    decimals min={0}
                    value={honorarios}
                    onChange={setHonorarios}
                    disabled={formDisabled || tipoCalculo === "A"}
                  />
                </div>
                <div className={styles.filterField}>
                  <label className={styles.filterLabel}>Gastos</label>
                  <NumericInput
                    className={styles.input}
                    decimals min={0}
                    value={gastos}
                    onChange={setGastos}
                    disabled={formDisabled || tipoCalculo === "A"}
                  />
                </div>
                <div className={styles.filterField}>
                  <label className={styles.filterLabel}>Coseguro</label>
                  <NumericInput
                    className={styles.input}
                    decimals min={0}
                    value={coseguro}
                    onChange={setCoseguro}
                    disabled={formDisabled}
                  />
                </div>
              </div>
            )}
          </div>

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

          {/* 10b. Pediatra (parto/cesárea, máx. 1). Sección nueva, independiente de
              Ayudantes: no la reemplaza ni comparte su estado. */}
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
              <div className={styles.section}>
                <button
                  type="button"
                  className={styles.addPediatraBtn}
                  onClick={() => setPediatra(crearPediatraLinea())}
                  disabled={isEdit ? formDisabled : guardando}
                >
                  <span style={{ fontSize: 16 }}>+</span>
                  <span>Agregar pediatra</span>
                </button>
              </div>
            )
          )}

          {/* Total: siempre debajo de ayudantes y pediatra (incluye sus montos), encima
              de los botones. */}
          <div className={styles.section}>
            <div className={styles.totalRow}>
              <span>Total estimado:</span>
              <strong>{formatMoney(totalEstimado)}</strong>
            </div>
          </div>

          {/* Guardar va primero: es la acción principal y la que se dispara siempre;
              "Limpiar" queda a la derecha para no tenerla en el camino. */}
          <div className={styles.formFooter}>
            <button
              type="button"
              data-field="guardar"
              className={styles.btnPrimary}
              onClick={() => doGuardar()}
              disabled={!canGuardar}
            >
              {guardando
                ? "Guardando…"
                : isEdit
                  ? "Guardar cambios"
                  : "Guardar (Ctrl+↵)"}
            </button>
            {!isEdit && (
              <button
                type="button"
                className={styles.btnGhost}
                onClick={resetForm}
                disabled={guardando}
              >
                Limpiar (Ctrl+L)
              </button>
            )}
          </div>
        </div>

        {/* En edición no hay barra lateral: el total ya se ve en la sección de montos. */}
        {!isEdit && (
          <div className={styles.sidebarCol}>
            <ResumenLateralCard
              mantener={mantener}
              onMantenerChange={(k, v) =>
                setMantener((prev) => ({ ...prev, [k]: v }))
              }
              showFecha={!isComplemento}
              showObraSocial={!isComplemento}
            />
          </div>
        )}
      </motion.div>

      {/* En complementaria no se muestra: el listado plano filtra por período y no
          puede distinguir la v1 (ya facturada) del complemento, así que mezclaría
          prestaciones que no son de esta carga. */}
      {!isComplemento && (
        <MedicoPrestacionesTable
          codMedico={codMedico ?? medicoTabla?.cod ?? null}
          medicoNombre={medicoTabla?.nombre ?? null}
          medicoMatricula={medicoTabla?.matricula ?? null}
          codObra={codObraTabla}
          periodo={periodoTabla}
          refreshKey={refreshKey}
        />
      )}

      <DuplicadoConfirmModal
        isOpen={!!duplicado}
        mensaje={duplicado?.mensaje ?? ""}
        duplicadoId={duplicado?.id}
        onClose={() => setDuplicado(null)}
        // Reusa doGuardar en vez de repetir la lógica: esa duplicación era la que
        // arrastraba la llamada rota a loadRecientes. El payload se reconstruye desde
        // el estado, que no cambió entre el 409 y la confirmación.
        onConfirm={async () => {
          setDuplicado(null);
          await doGuardar(true);
        }}
        loading={guardando}
      />
    </div>
  );
};

export default CargaFacturacion;
