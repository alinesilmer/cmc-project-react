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
  fetchObrasSociales,
  fetchCodigosHabilitados,
  fetchClinicas,
} from "../api";
import { detailMessage, versionLabel } from "../types";
import type {
  ObraSocialOption,
  AfiliadoRead,
  PrestacionItem,
  TipoCalculo,
  PrestacionRead,
  PrestacionUpdate,
  MedicoOption,
} from "../types";
import { parseMoney, formatMoney } from "../money";
import { FACTURACION_ULTIMA_OS_KEY } from "../constants";

import DuplicadoConfirmModal from "../components/DuplicadoConfirmModal";
import ClinicaAutocomplete from "../components/ClinicaAutocomplete";

import { usePeriodoActivo } from "./hooks/usePeriodoActivo";
import { useNomencladorPrecio } from "./hooks/useNomencladorPrecio";
import { useHotkeys, isMod, isModalOpen } from "./hooks/useHotkeys";
import { focusField, nextFocusable, type FocusField } from "./focusNav";

import MedicoSection from "./sections/MedicoSection";
import DatosGeneralesSection from "./sections/DatosGeneralesSection";
import PacienteSection from "./sections/PacienteSection";
import PrestacionSection from "./sections/PrestacionSection";
import AyudanteSection, {
  crearAyudanteLinea,
  totalAyudantes,
  type AyudanteLinea,
} from "./sections/AyudanteSection";
import ResumenLateralCard from "./sections/ResumenLateralCard";
import MedicoPrestacionesTable from "./sections/MedicoPrestacionesTable";

import styles from "./CargaFacturacion.module.scss";

const todayISO = () => new Date().toISOString().slice(0, 10);

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
        ...crearAyudanteLinea(precioAyudante),
        prestacionId: g.id,
        codMedico: g.cod_medico,
        medico,
        porcentaje: g.porcentaje ?? 100,
        tipoCalculo: (g.tipo_calculo as TipoCalculo) ?? "A",
        precioManual: precioAyudante,
      };
    }),
  );
};

type Mantener = { obraSocial: boolean; paciente: boolean; fecha: boolean; clinica: boolean; medico: boolean };

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

  // Complementaria — OS/período fijos, tomados de la factura referenciada por id.
  const [complementoMeta, setComplementoMeta] = useState<{
    cod_obra: string;
    periodo: string;
    periodo_label: string;
    version: number;
  } | null>(null);
  const [loadingComplemento, setLoadingComplemento] = useState(isComplemento);
  const [complementoError, setComplementoError] = useState<string | null>(null);

  // Edición — metadatos inmutables de la prestación cargada (OS/período no se pueden cambiar)
  const [editMeta, setEditMeta] = useState<{
    cod_obra_social: string;
    /** "<nro> · <nombre>" resuelto aparte; el fetch de la prestación solo trae el código. */
    cod_obra_social_label?: string;
    periodo: string;
    estado: string | null;
  } | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(isEdit);
  const [editNotFound, setEditNotFound] = useState(false);
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
  const [cantidad, setCantidad] = useState(1);
  const [sesion, setSesion] = useState(1);
  const [tipoCalculo, setTipoCalculo] = useState<TipoCalculo>("A");
  const [porcentaje, setPorcentaje] = useState(100);
  const [honorarios, setHonorarios] = useState("0");
  const [gastos, setGastos] = useState("0");

  // Ayudantes quirúrgicos (0..N según cantidad_ayudantes del código+OS)
  const [ayudantes, setAyudantes] = useState<AyudanteLinea[]>([]);

  // UI. En complementaria no se mantiene la fecha (rezagadas de fechas distintas), y ese
  // checkbox tampoco se muestra. La clínica sí puede mantenerse (misma clínica en varias).
  const [mantener, setMantener] = useState<Mantener>(() => ({
    // Por defecto no se mantiene ninguno: el operador activa lo que necesite.
    obraSocial: false,
    paciente: false,
    fecha: false,
    clinica: false,
    medico: false,
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
  const pendingFocusRef = useRef<FocusField | null>(null);
  // Ids de los ayudantes que trae el equipo al editar — para saber, al guardar, cuáles
  // se quitaron (hay que anularlos).
  const ayudantesOriginalesRef = useRef<number[]>([]);
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

  // Precio del nomenclador
  const {
    precio,
    loading: precioLoading,
    error: precioError,
  } = useNomencladorPrecio({
    codMedico: codMedicoEfectivo,
    codObra: isEdit
      ? (editMeta?.cod_obra_social ?? null)
      : isComplemento
        ? (complementoMeta?.cod_obra ?? null)
        : obraSocial
          ? String(obraSocial.nro_obra_social)
          : null,
    codigo: codNomenclador,
    fecha: fechaPractica,
  });

  // Precarga de la prestación cuando se entra en modo edición
  useEffect(() => {
    if (!isEdit || !editId) return;
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
        setFechaPractica(p.fecha_practica ?? todayISO());
        setCodClinica(p.cod_clinica ?? null);
        setAutorizacion(p.autorizacion ?? "");
        setCodNomenclador(p.cod_nomenclador ?? null);
        setCantidad(p.cantidad ?? 1);
        setSesion(p.sesion ?? 1);
        setTipoCalculo((p.tipo_calculo as TipoCalculo) ?? "A");
        setPorcentaje(p.porcentaje ?? 100);
        setHonorarios(p.honorarios != null ? String(p.honorarios) : "0");
        setGastos(p.gastos != null ? String(p.gastos) : "0");
        setEditMeta({
          cod_obra_social: p.cod_obra_social ?? "",
          periodo: p.periodo,
          estado: p.estado ?? null,
        });

        // La prestación solo trae códigos. Resolvemos los labels descriptivos con las
        // búsquedas (en paralelo, best-effort) ANTES de bajar loadingEdit: los
        // autocompletes fijan su texto al montar, así que tienen que estar listos ya.
        // Los códigos habilitados dependen del médico efectivo (ejecutor si es clínica).
        const codMedForCodigos = esOrg ? (p.cod_medico_ejecutor ?? p.cod_medico) : p.cod_medico;
        // /medicos ya devuelve `es_organizacion` para cualquier socio (médico o
        // clínica): un solo fetch alcanza para resolver el payee sea cual sea.
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
          if (os) {
            setEditMeta((prev) =>
              prev ? { ...prev, cod_obra_social_label: `${os.nro_obra_social} · ${os.nombre}` } : prev,
            );
          }
        }
        if (nomRes.status === "fulfilled") {
          const nom = nomRes.value.find((x) => x.codigo === p.cod_nomenclador);
          if (nom) setCodigoPreset(nom.descripcion || null);
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
          }
        }
      } catch {
        setEditNotFound(true);
      } finally {
        if (active) setLoadingEdit(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isEdit, editId]);

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
      setHonorarios(precio.honorarios ?? "0");
      setGastos(precio.gastos ?? "0");
    }
  }, [precio]); // eslint-disable-line react-hooks/exhaustive-deps

  // El máximo de ayudantes depende del código elegido — al cambiar de código
  // las líneas ya cargadas dejan de tener sentido (podían pertenecer a otro tope).
  useEffect(() => {
    setAyudantes([]);
  }, [codNomenclador]);

  // Limpiar nombre cuando se borra el DNI
  useEffect(() => {
    if (dni.length < 8) setNombrePaciente("");
  }, [dni]);

  const handleObraSocialChange = useCallback(
    (nro: number | null, os: ObraSocialOption | null) => {
      setObraSocial(os);
      resetPeriodo();
      setCodNomenclador(null);
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
        setFechaPractica(p.fecha_practica ?? todayISO());
        setCodClinica(p.cod_clinica ?? null);
        setAutorizacion(p.autorizacion ?? "");
        setCodNomenclador(p.cod_nomenclador ?? null);
        setCantidad(p.cantidad ?? 1);
        setSesion(p.sesion ?? 1);
        setTipoCalculo((p.tipo_calculo as TipoCalculo) ?? "A");
        setPorcentaje(p.porcentaje ?? 100);
        setHonorarios(p.honorarios != null ? String(p.honorarios) : "0");
        setGastos(p.gastos != null ? String(p.gastos) : "0");

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
          if (nom) setCodigoPreset(nom.descripcion || null);
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
          if (active) setAyudantes(lineas);
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

  const totalEstimado = useMemo(() => {
    const h = parseMoney(honorarios);
    const g = parseMoney(gastos);
    const base = (h + g) * (porcentaje / 100) * cantidad * sesion;
    return base + totalAyudantes(ayudantes, precio);
  }, [honorarios, gastos, porcentaje, cantidad, sesion, ayudantes, precio]);

  const buildMainItem = (): PrestacionItem => ({
    cod_medico: codMedico!,
    // El ejecutor solo se manda si el payee es una clínica.
    cod_medico_ejecutor: payeeEsOrganizacion ? codMedicoEjecutor : null,
    dni_paciente: dni || null,
    fecha_practica: fechaPractica,
    cod_clinica: codClinica,
    autorizacion: autorizacion || null,
    cod_nomenclador: codNomenclador!,
    cantidad,
    sesion,
    tipo_calculo: tipoCalculo,
    honorarios: parseMoney(honorarios),
    gastos: parseMoney(gastos),
    ayudante: 0,
    porcentaje,
    grupo_equipo_id: null,
  });

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!isEdit && !isComplemento) {
      if (!obraSocial) errs.obraSocial = "Requerido";
      if (!periodo) errs.periodo = "Sin período activo";
      if (periodoOverride && periodo && periodoOverride < periodo.periodo) {
        errs.periodo = `El período no puede ser anterior a ${periodo.periodo_label}`;
      }
    }
    if (!codMedico) errs.codMedico = "Requerido";
    if (payeeEsOrganizacion && !codMedicoEjecutor)
      errs.codMedicoEjecutor = "Requerido — indicá el médico que ejecutó";
    if (!codNomenclador) errs.codNomenclador = "Requerido";
    if (precio && !precio.admitido && tipoCalculo !== "M") {
      errs.admitido =
        "Código no admitido — pasá a modo Manual para forzar la carga";
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
    setErrores(errs);
    return Object.keys(errs).length === 0;
  };

  const resetForm = () => {
    setCodNomenclador(null);
    setHonorarios("0");
    setGastos("0");
    setTipoCalculo("A");
    setPorcentaje(100);
    setCantidad(1);
    setSesion(1);
    setAyudantes([]);
    setAutorizacion("");
    if (!mantener.medico) {
      setCodMedico(null);
      setMedicoSeleccionado(null);
      setPayeeEsOrganizacion(false);
      setCodMedicoEjecutor(null);
      setMedicoEjecutor(null);
      setMedicoResetKey((k) => k + 1);
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

    // Primer campo que quedó vacío, en orden de carga. Se calcula desde `mantener` y
    // no leyendo el estado, que en esta closure todavía tiene los valores viejos.
    pendingFocusRef.current = !mantener.medico
      ? "medico"
      : !mantener.paciente
        ? "paciente"
        : !mantener.fecha
          ? "fecha"
          : "codigo";
  };

  const doGuardarEdit = async () => {
    if (!validate() || !editId) return;
    const payload: PrestacionUpdate = {
      cod_medico: codMedico!,
      cod_medico_ejecutor: payeeEsOrganizacion ? codMedicoEjecutor : null,
      dni_paciente: dni || null,
      fecha_practica: fechaPractica,
      cod_clinica: codClinica,
      autorizacion: autorizacion || null,
      cod_nomenclador: codNomenclador!,
      cantidad,
      sesion,
      tipo_calculo: tipoCalculo,
      honorarios: parseMoney(honorarios),
      gastos: parseMoney(gastos),
      porcentaje,
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
        fecha_practica: fechaPractica,
        cod_clinica: codClinica,
        autorizacion: autorizacion || null,
        cod_nomenclador: codNomenclador!,
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
          cantidad: 1,
          sesion: 1,
          tipo_calculo: linea.tipoCalculo,
          honorarios: 0,
          gastos: 0,
          ayudante: ayAmount,
          porcentaje: linea.porcentaje,
        };
        if (linea.prestacionId) {
          // Existente → PATCH.
          idsVigentes.add(linea.prestacionId);
          await editarPrestacion(linea.prestacionId, ayFields);
        } else {
          // Nuevo → se crea junto al equipo (mismo grupo_equipo_id que la cabecera).
          nuevos.push({ ...ayFields, grupo_equipo_id: headId });
        }
      }
      // Los nuevos van al mismo período/OS del equipo (que está abierto: si no, no se
      // podría editar).
      if (nuevos.length > 0) {
        await crearPrestaciones({
          obra_social: editMeta!.cod_obra_social,
          periodo: editMeta!.periodo,
          prestaciones: nuevos,
        });
      }
      // 3. Los ayudantes originales que ya no están → se anulan.
      const removidos = ayudantesOriginalesRef.current.filter((id) => !idsVigentes.has(id));
      for (const id of removidos) {
        await anularPrestacion(id);
      }

      notify("Prestación actualizada.");
      navigate(
        fromFactura
          ? `/panel/facturacion/periodos/${fromFactura}`
          : "/panel/facturacion/periodos",
      );
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
        // Es un dato de la práctica, no del prestador: el ayudante participa de la
        // misma, así que se copia igual que dni/fecha/clínica.
        autorizacion: mainItem.autorizacion,
        cod_nomenclador: mainItem.cod_nomenclador!,
        cantidad: 1,
        sesion: 1,
        tipo_calculo: linea.tipoCalculo,
        honorarios: 0,
        gastos: 0,
        ayudante: ayAmount,
        porcentaje: linea.porcentaje,
        grupo_equipo_id: null,
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

  const canGuardar = isEdit
    ? !!codMedico &&
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
        !!periodo &&
        !periodoError &&
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
    focusField(formRef.current, pendingFocusRef.current);
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

  const formDisabled = isEdit
    ? loadingEdit || guardando || editMeta?.estado !== "A"
    : isComplemento
      ? loadingComplemento || guardando || !complementoMeta
      : !obraSocial || !!periodoError || guardando;
  const maxAyudantes = precio?.cantidad_ayudantes ?? 0;
  // La sección se muestra (en carga, replicar y edición) si el código admite ayudantes
  // o si ya hay líneas cargadas (p. ej. un equipo cuyo código reporta 0 de referencia).
  const admiteAyudante =
    !!precio && !precioLoading && (maxAyudantes > 0 || ayudantes.length > 0);

  // El médico del formulario mientras haya uno; si el reset lo limpió, el último que
  // se guardó. Como `onMedicoChange` invalida el snapshot, esto sólo sobrevive a un
  // reset programático: si el operador limpia el campo a mano, la tabla se oculta.
  const medicoTabla = medicoSeleccionado ?? ultimoMedico;

  const codObraTabla = isEdit
    ? (editMeta?.cod_obra_social ?? null)
    : isComplemento
      ? (complementoMeta?.cod_obra ?? null)
      : obraSocial
        ? String(obraSocial.nro_obra_social)
        : null;
  const periodoTabla = isEdit
    ? (editMeta?.periodo ?? null)
    : isComplemento
      ? (complementoMeta?.periodo ?? null)
      : (periodoOverride ?? periodo?.periodo ?? null);

  if (isEdit && loadingEdit) {
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
          {isEdit ? (
            editMeta && (
              <>
                <span className={`${styles.infoChip} ${styles.chipNeutral}`}>
                  Período: {editMeta.periodo}
                </span>
                <span className={`${styles.infoChip} ${styles.chipNeutral}`}>
                  OS: {editMeta.cod_obra_social}
                </span>
              </>
            )
          ) : isComplemento ? null : (
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
            onClick={() =>
              navigate(
                isComplemento
                  ? "/panel/facturacion/complementarias"
                  : isEdit && fromFactura
                    ? `/panel/facturacion/periodos/${fromFactura}`
                    : "/panel/facturacion/periodos",
              )
            }
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
              if (!esOrg) {
                // Payee médico: ejecuta y cobra él mismo, no hay ejecutor aparte.
                setCodMedicoEjecutor(null);
                setMedicoEjecutor(null);
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
            ejecutorResetKey={medicoResetKey}
          />

          {/* 2. Obra social + período. En complementaria son fijos (van en el badge). */}
          {isComplemento ? null : isEdit ? (
            <div className={styles.section}>
              <span className={styles.sectionTitle}>Datos generales</span>
              <div className={styles.fieldsRow}>
                <div className={styles.filterField}>
                  <label className={styles.filterLabel}>Obra social</label>
                  <div className={styles.readonlyField}>
                    {editMeta?.cod_obra_social_label ?? editMeta?.cod_obra_social ?? "—"}
                  </div>
                </div>
                <div className={styles.filterField}>
                  <label className={styles.filterLabel}>Período</label>
                  <div className={styles.readonlyField}>
                    {editMeta?.periodo ?? "—"}
                  </div>
                </div>
              </div>
              {editMeta && editMeta.estado !== "A" && (
                <div className={styles.errorBox}>
                  ⚠ Esta prestación ya no está en estado abierto — no se puede
                  editar.
                </div>
              )}
            </div>
          ) : (
            <DatosGeneralesSection
              key={`os-${osResetKey}`}
              obraSocial={obraSocial}
              onObraSocialChange={handleObraSocialChange}
              periodo={periodo}
              periodoError={periodoError}
              // No incluir periodoLoading: al elegir la OS, loadPeriodo pone loading en
              // true sincrónicamente y, si esto deshabilita el input, el navegador le
              // saca el foco — y se rompe el "Enter para avanzar".
              disabled={guardando}
              periodoOverride={periodoOverride}
              onPeriodoOverrideChange={setPeriodoOverride}
            />
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
            <span className={styles.sectionTitle}>Fecha de práctica</span>
            <div className={styles.filterField} data-field="fecha">
              <input
                className={styles.input}
                type="date"
                value={fechaPractica}
                onChange={(e) => setFechaPractica(e.target.value)}
                disabled={formDisabled}
              />
            </div>
          </div>

          {/* 5. Código + precio preview */}
          <PrestacionSection
            key={`nom-${nomencladorResetKey}`}
            codNomenclador={codNomenclador}
            onNomencladorChange={(cod) => setCodNomenclador(cod)}
            codMedico={codMedicoEfectivo}
            precio={precio}
            precioLoading={precioLoading}
            precioError={precioError}
            disabled={formDisabled || !codMedicoEfectivo || !fechaPractica}
            errors={errores}
            presetLabel={codigoPreset ?? (isEdit ? "(valor actual)" : undefined)}
            blockedHint={
              !isEdit && !codMedicoEfectivo
                ? payeeEsOrganizacion
                  ? "Elegí el médico ejecutor para ver sus códigos habilitados."
                  : "Elegí un médico para ver sus códigos habilitados."
                : !isEdit && !fechaPractica
                  ? "Cargá la fecha de práctica para poder ingresar el código."
                  : undefined
            }
          />

          {/* 6. Clínica */}
          <div className={styles.section}>
            <span className={styles.sectionTitle}>Clínica</span>
            <div className={styles.filterField}>
              <ClinicaAutocomplete
                key={`clinica-${clinicaResetKey}`}
                value={codClinica}
                onChange={(cod) => setCodClinica(cod)}
                disabled={formDisabled}
                presetLabel={clinicaPreset ?? undefined}
                blurOnSelect={false}
              />
            </div>
          </div>

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
          </div>

          {/* 7. Sesión y cantidad */}
          <div className={styles.section}>
            <span className={styles.sectionTitle}>Cantidad y sesiones</span>
            <div className={styles.fieldsRow}>
              <div className={styles.filterField}>
                <label className={styles.filterLabel}>
                  Cantidad <span className={styles.errorText}>*</span>
                </label>
                <input
                  className={styles.input}
                  type="number"
                  min={1}
                  value={cantidad}
                  onChange={(e) =>
                    setCantidad(Math.max(1, Number(e.target.value)))
                  }
                  disabled={formDisabled}
                />
              </div>
              <div className={styles.filterField}>
                <label className={styles.filterLabel}>
                  Sesión <span className={styles.errorText}>*</span>
                </label>
                <input
                  className={styles.input}
                  type="number"
                  min={1}
                  value={sesion}
                  onChange={(e) =>
                    setSesion(Math.max(1, Number(e.target.value)))
                  }
                  disabled={formDisabled}
                />
              </div>
              <div className={styles.filterField}>
                <label className={styles.filterLabel}>% Porcentaje</label>
                <input
                  className={styles.input}
                  type="number"
                  min={1}
                  max={100}
                  value={porcentaje}
                  onChange={(e) =>
                    setPorcentaje(
                      Math.min(100, Math.max(1, Number(e.target.value))),
                    )
                  }
                  disabled={formDisabled}
                />
              </div>
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
                    onChange={() => setTipoCalculo(v)}
                    disabled={formDisabled}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* 9. Honorarios y gastos */}
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
            <div className={styles.fieldsRow}>
              <div className={styles.filterField}>
                <label className={styles.filterLabel}>Honorarios</label>
                <input
                  className={styles.input}
                  type="number"
                  min={0}
                  step="0.01"
                  value={honorarios}
                  onChange={(e) => setHonorarios(e.target.value)}
                  disabled={formDisabled || tipoCalculo === "A"}
                />
              </div>
              <div className={styles.filterField}>
                <label className={styles.filterLabel}>Gastos</label>
                <input
                  className={styles.input}
                  type="number"
                  min={0}
                  step="0.01"
                  value={gastos}
                  onChange={(e) => setGastos(e.target.value)}
                  disabled={formDisabled || tipoCalculo === "A"}
                />
              </div>
            </div>
            {errores.admitido && (
              <div className={styles.warningBox}>{errores.admitido}</div>
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
            />
          )}

          {/* Total: siempre debajo de ayudantes (incluye su monto), encima de los botones. */}
          <div className={styles.section}>
            <div className={styles.totalRow}>
              <span>Total estimado:</span>
              <strong>{formatMoney(totalEstimado)}</strong>
            </div>
          </div>

          <div className={styles.formFooter}>
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
            {/* <button
              type="button"
              className={styles.btnGhost}
              onClick={() => navigate(isEdit && fromFactura ? `/panel/facturacion/periodos/${fromFactura}` : "/panel/facturacion/periodos")}
              disabled={guardando}
            >
              Cancelar
            </button> */}
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
