import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ClipboardList, ArrowLeft, ArrowRightCircle, ArrowLeftCircle, Trash2,
  Download, SlidersHorizontal,
} from "lucide-react";

import { useAppSnackbar } from "../../../hooks/useAppSnackbar";
import {
  fetchFacturaDetalle, marcarRevisado, anularPrestacion,
  moverPeriodo,
} from "../api";
import type {
  FacturaDetalleResponse, PrestacionFacturaDetalle, Tipo,
} from "../types";
import { detailMessage } from "../types";
import { formatMoney, parseMoney } from "../money";
import ConfirmActionModal from "../components/ConfirmActionModal";
import ExportPanel from "./export/ExportPanel";
import VistaPanel from "./vista/VistaPanel";
import type { FiltrosVista, OrdenDireccion, OrdenVista, VistaOpciones } from "./vista/types";
import { COLUMNAS_VISTA_DISPONIBLES, ORDEN_TIPOS, PESO_COLUMNA, VISTA_OPCIONES_DEFAULT } from "./vista/types";
import type { FilaAcciones, PrestacionConSocio } from "./FilaPrestacion";
import GrupoTabla from "./GrupoTabla";
import { sumaEquipo, sumarTotales } from "./totales";
import type { GrupoAcciones, VistaGrupo } from "./GrupoTabla";
import { inferirEquipos } from "./equipo";
import styles from "./FacturaDetalle.module.scss";

// Set vacío compartido: los grupos sin filas ocupadas reciben siempre esta misma
// referencia y su memo no se invalida.
const SIN_OCUPADAS: ReadonlySet<number> = new Set();

const mismaFirma = (a: unknown[], b: unknown[]) => a.length === b.length && a.every((x, i) => x === b[i]);

type PendingAction =
  | { type: "eliminar"; p: PrestacionConSocio }
  | { type: "mover"; p: PrestacionConSocio; direccion: "siguiente" | "anterior" }
  | { type: "moverGrupo"; ids: number[]; marcadas: number; label: string; groupKey: string; direccion: "siguiente" | "anterior" };

const estadoChipClass = (estado: string | null): string => {
  if (estado === "A") return styles.chipAbierta;
  if (estado === "C") return styles.chipCerrada;
  return styles.chipCerrada;
};

const estadoLabel = (estado: string | null): string => {
  if (estado === "A") return "Abierta";
  if (estado === "C") return "Cerrada";
  return estado || "—";
};

const compararPorOrden = (
  a: PrestacionConSocio, b: PrestacionConSocio, orden: OrdenVista, direccion: OrdenDireccion,
): number => {
  const signo = direccion === "desc" ? -1 : 1;
  switch (orden) {
    case "fecha":
      return signo * (a.fecha_practica ?? "").localeCompare(b.fecha_practica ?? "");
    case "fecha_carga":
      // `created` es ISO (se compara como texto); el id desempata las cargas del mismo
      // segundo y cubre filas sin `created`.
      return signo * ((a.created ?? "").localeCompare(b.created ?? "") || a.id - b.id);
    case "codigo":
      return signo * (a.codigo ?? "").localeCompare(b.codigo ?? "", "es");
    case "importe":
      return signo * (parseMoney(a.subtotal) - parseMoney(b.subtotal));
    case "nombre_socio":
      return signo * (a.nombreSocio ?? a.cod_medico).localeCompare(b.nombreSocio ?? b.cod_medico, "es", { sensitivity: "base" });
    default:
      return 0;
  }
};

// Orden fijo de "Por socio" — el mismo que arma el exportable (`export/armado.py`).
const porFechaDesc = (a: PrestacionConSocio, b: PrestacionConSocio): number =>
  (b.fecha_practica ?? "").localeCompare(a.fecha_practica ?? "") || a.id - b.id;
const porPacienteAZ = (a: PrestacionConSocio, b: PrestacionConSocio): number =>
  (a.nombre_paciente ?? "").localeCompare(b.nombre_paciente ?? "", "es", { sensitivity: "base" })
  || (a.nro_afiliado ?? "").localeCompare(b.nro_afiliado ?? "", "es", { numeric: true })
  || porFechaDesc(a, b);
// Sanatorios: las prestaciones de una misma clínica quedan seguidas (A-Z por clínica) para
// poder intercalar el subtítulo con su nombre.
const nombreClinica = (p: PrestacionConSocio): string => p.nombre_clinica ?? String(p.cod_clinica ?? "");
const porClinica = (a: PrestacionConSocio, b: PrestacionConSocio): number =>
  nombreClinica(a).localeCompare(nombreClinica(b), "es", { sensitivity: "base" });
const porClinicaYPaciente = (a: PrestacionConSocio, b: PrestacionConSocio): number =>
  porClinica(a, b) || porPacienteAZ(a, b);
const TRAMOS_MEDICO: { tipo: Tipo; subtitulo: string; comparar: typeof porFechaDesc }[] = [
  { tipo: "Consulta", subtitulo: "Consultas", comparar: porFechaDesc },
  { tipo: "Practica", subtitulo: "Prácticas", comparar: porFechaDesc },
  { tipo: "Honorarios individuales", subtitulo: "Honorarios individuales", comparar: porPacienteAZ },
  { tipo: "Sanatorio", subtitulo: "Sanatorios", comparar: porClinicaYPaciente },
];
// Subtítulo de cada sección de "Por tipo".
const SUBTITULO_TIPO: Record<Tipo, string> = {
  Consulta: "Consultas",
  Practica: "Prácticas",
  "Honorarios individuales": "Honorarios individuales",
  Sanatorio: "Sanatorios",
};
const porNombreMedico = (a: PrestacionConSocio, b: PrestacionConSocio): number =>
  (a.nombreSocio ?? a.cod_medico).localeCompare(b.nombreSocio ?? b.cod_medico, "es", { sensitivity: "base" })
  || a.cod_medico.localeCompare(b.cod_medico);
const porNombreSocio = (a: VistaGrupo, b: VistaGrupo): number =>
  (a.prestaciones[0]?.nombreSocio ?? a.key)
    .localeCompare(b.prestaciones[0]?.nombreSocio ?? b.key, "es", { sensitivity: "base" });

const pasaFiltros = (p: PrestacionConSocio, f: FiltrosVista): boolean => {
  if (f.fecha_desde && (!p.fecha_practica || p.fecha_practica < f.fecha_desde)) return false;
  if (f.fecha_hasta && (!p.fecha_practica || p.fecha_practica > f.fecha_hasta)) return false;
  if (f.tipos && f.tipos.length > 0 && (!p.tipo || !f.tipos.includes(p.tipo))) return false;
  if (f.revisado !== undefined && p.revisado !== f.revisado) return false;
  if (f.cod_medicos && f.cod_medicos.length > 0 && !f.cod_medicos.includes(p.cod_medico)) return false;
  if (f.id_especialidad !== undefined && (p.id_especialidad ?? null) !== f.id_especialidad) return false;
  return true;
};

const sumarMoney = <T,>(arr: T[], get: (x: T) => string | null): string =>
  arr.reduce((s, x) => s + parseMoney(get(x)), 0).toFixed(2);

// Saca del detalle ya cargado las prestaciones anuladas o movidas de período y
// recalcula los mismos totales que arma el backend (`obtener_factura_detalle`),
// para no tener que volver a pedir la factura entera después de cada acción.
const quitarPrestaciones = (detalle: FacturaDetalleResponse, ids: number[]): FacturaDetalleResponse => {
  const fuera = new Set(ids);
  const unidades = (p: PrestacionFacturaDetalle) => (p.cantidad || 1) * (p.sesion || 1);
  const prestadores = detalle.prestadores
    .map((g) => {
      const prestaciones = g.prestaciones.filter((p) => !fuera.has(p.id));
      if (prestaciones.length === g.prestaciones.length) return g;
      return {
        ...g,
        prestaciones,
        cantidad_prestaciones: prestaciones.length,
        total_cantidad: prestaciones.reduce((s, p) => s + unidades(p), 0),
        total_honorarios: sumarMoney(prestaciones, (p) => p.honorarios),
        total_gastos: sumarMoney(prestaciones, (p) => p.gastos),
        total_subtotal: sumarMoney(prestaciones, (p) => p.subtotal),
      };
    })
    .filter((g) => g.prestaciones.length > 0);
  return {
    ...detalle,
    prestadores,
    total_prestaciones: prestadores.reduce((s, g) => s + g.prestaciones.reduce((t, p) => t + unidades(p), 0), 0),
    total_importe: sumarMoney(prestadores, (g) => g.total_subtotal),
  };
};

const marcarRevisadoLocal = (detalle: FacturaDetalleResponse, ids: number[], valor: boolean): FacturaDetalleResponse => {
  const set = new Set(ids);
  return {
    ...detalle,
    prestadores: detalle.prestadores.map((g) => ({
      ...g,
      prestaciones: g.prestaciones.map((p) => set.has(p.id) ? { ...p, revisado: valor } : p),
    })),
  };
};

const hayFiltrosActivos = (f: FiltrosVista): boolean =>
  Boolean(f.fecha_desde || f.fecha_hasta || f.revisado !== undefined
    || (f.tipos && f.tipos.length > 0) || (f.cod_medicos && f.cod_medicos.length > 0)
    || f.id_especialidad !== undefined);

const FacturaDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const notify = useAppSnackbar();

  const [detalle, setDetalle] = useState<FacturaDetalleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());
  const [busyGroups, setBusyGroups] = useState<Set<string>>(new Set());
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [vistaOpen, setVistaOpen] = useState(false);
  const [vistaOpciones, setVistaOpciones] = useState<VistaOpciones>(VISTA_OPCIONES_DEFAULT);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFacturaDetalle(id);
      setDetalle(data);
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "No se pudo cargar el detalle de la factura.");
      setDetalle(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const withBusy = async (pid: number, fn: () => Promise<void>) => {
    setBusyIds((prev) => new Set(prev).add(pid));
    try {
      await fn();
    } finally {
      setBusyIds((prev) => { const next = new Set(prev); next.delete(pid); return next; });
    }
  };

  const withGroupBusy = async (groupKey: string, fn: () => Promise<void>) => {
    setBusyGroups((prev) => new Set(prev).add(groupKey));
    try {
      await fn();
    } finally {
      setBusyGroups((prev) => { const next = new Set(prev); next.delete(groupKey); return next; });
    }
  };

  const handleToggleRevisado = (p: PrestacionConSocio) => {
    if (!detalle) return;
    const nextValue = !p.revisado;
    setDetalle(marcarRevisadoLocal(detalle, [p.id], nextValue));
    marcarRevisado(nextValue ? { marcados: [p.id] } : { desmarcados: [p.id] }).catch(() => {
      setDetalle((cur) => cur ? marcarRevisadoLocal(cur, [p.id], !nextValue) : cur);
      notify("No se pudo actualizar el estado de auditoría.", "error");
    });
  };

  const handleEditar = (p: PrestacionConSocio) => {
    navigate(`/panel/facturacion/carga/${p.id}?from=${id}`);
  };

  // Precarga el formulario de carga con los datos de esta prestación, pero como una
  // prestación nueva (POST) — la original no se toca.
  const handleReplicar = (p: PrestacionConSocio) => {
    navigate(`/panel/facturacion/carga?replicar=${p.id}`);
  };

  const handleEliminar = (p: PrestacionConSocio) => setPendingAction({ type: "eliminar", p });

  const handleMoverPeriodo = (p: PrestacionConSocio, direccion: "siguiente" | "anterior") =>
    setPendingAction({ type: "mover", p, direccion });

  const executeEliminar = (p: PrestacionConSocio, onSuccess: () => void) =>
    withBusy(p.id, async () => {
      try {
        await anularPrestacion(p.id);
        notify("Prestación anulada.");
        setDetalle((cur) => cur ? quitarPrestaciones(cur, [p.id]) : cur);
        onSuccess();
      } catch (e: any) {
        const status = e?.response?.status;
        if (status === 403) {
          notify("Solo podés anular tus propias prestaciones.", "error");
        } else {
          const detail = e?.response?.data?.detail;
          notify(typeof detail === "string" ? detail : "No se pudo anular.", "error");
        }
      }
    });

  const executeMoverPeriodo = (p: PrestacionConSocio, direccion: "siguiente" | "anterior", onSuccess: () => void) =>
    withBusy(p.id, async () => {
      try {
        if (!detalle) return;
        const result = await moverPeriodo({
          cod_obra: detalle.cod_obra,
          periodo_origen: p.periodo,
          ids: [p.id],
          direccion,
        });
        notify(`Prestación movida al período ${result.periodo_destino}.`);
        setDetalle((cur) => cur ? quitarPrestaciones(cur, result.ids_movidos) : cur);
        onSuccess();
      } catch (e: any) {
        const detail = e?.response?.data?.detail;
        const msg = typeof detail === "string" ? detail : detail?.mensaje ?? "No se pudo mover la prestación.";
        notify(msg, "error");
      }
    });

  const handleMarcarTodos = (ids: number[], groupKey: string) => {
    if (ids.length === 0) return;
    withGroupBusy(groupKey, async () => {
      try {
        await marcarRevisado({ marcados: ids });
        notify(`Se marcaron ${ids.length} prestación${ids.length !== 1 ? "es" : ""} como auditadas.`);
        setDetalle((cur) => cur ? marcarRevisadoLocal(cur, ids, true) : cur);
      } catch (e: any) {
        notify(detailMessage(e?.response?.data?.detail) || "No se pudo marcar el grupo.", "error");
      }
    });
  };

  const handleDesmarcarTodos = (ids: number[], groupKey: string) => {
    if (ids.length === 0) return;
    withGroupBusy(groupKey, async () => {
      try {
        await marcarRevisado({ desmarcados: ids });
        notify(`Se desmarcaron ${ids.length} prestación${ids.length !== 1 ? "es" : ""}.`);
        setDetalle((cur) => cur ? marcarRevisadoLocal(cur, ids, false) : cur);
      } catch (e: any) {
        notify(detailMessage(e?.response?.data?.detail) || "No se pudo desmarcar el grupo.", "error");
      }
    });
  };

  const handleMoverGrupo = (g: VistaGrupo, direccion: "siguiente" | "anterior") => {
    // Las marcadas (auditadas) se quedan en este período: solo se mueven las abiertas sin marcar.
    const movibles = g.miembros.filter((p) => p.estado === "A" && !p.revisado);
    if (movibles.length === 0) {
      notify("No hay prestaciones sin marcar para mover en este grupo.", "error");
      return;
    }
    setPendingAction({
      type: "moverGrupo", ids: movibles.map((p) => p.id), label: g.titulo, groupKey: g.key, direccion,
      marcadas: g.miembros.filter((p) => p.estado === "A" && p.revisado).length,
    });
  };

  const executeMoverGrupo = (ids: number[], groupKey: string, direccion: "siguiente" | "anterior", onSuccess: () => void) => {
    if (!detalle) return Promise.resolve();
    return withGroupBusy(groupKey, async () => {
      try {
        const result = await moverPeriodo({
          cod_obra: detalle.cod_obra,
          periodo_origen: detalle.periodo,
          ids,
          direccion,
        });
        notify(`Se movieron ${result.ids_movidos.length} prestación${result.ids_movidos.length !== 1 ? "es" : ""} al período ${result.periodo_destino}.`);
        setDetalle((cur) => cur ? quitarPrestaciones(cur, result.ids_movidos) : cur);
        onSuccess();
      } catch (e: any) {
        const detail = e?.response?.data?.detail;
        const msg = typeof detail === "string" ? detail : detail?.mensaje ?? "No se pudo mover el grupo.";
        notify(msg, "error");
      }
    });
  };

  // Objeto de acciones con identidad fija: delega en los handlers del render actual
  // (que leen `detalle` fresco) sin invalidar el memo de cada fila.
  const accionesRef = useRef<FilaAcciones | null>(null);
  accionesRef.current = {
    onToggleRevisado: handleToggleRevisado,
    onEditar: handleEditar,
    onReplicar: handleReplicar,
    onMover: handleMoverPeriodo,
    onEliminar: handleEliminar,
  };
  const accionesGrupoRef = useRef<GrupoAcciones | null>(null);
  accionesGrupoRef.current = {
    onMarcarTodos: (g) => handleMarcarTodos(g.miembros.map((p) => p.id), g.key),
    onDesmarcarTodos: (g) => handleDesmarcarTodos(g.miembros.map((p) => p.id), g.key),
    onMoverGrupo: handleMoverGrupo,
    onOrdenAlfabetico: (tipo, valor) => setVistaOpciones((o) => (
      tipo === "Sanatorio" ? { ...o, ordenSanatorio: valor } : { ...o, ordenHonorarios: valor }
    )),
  };
  const accionesGrupo = useMemo<GrupoAcciones>(() => ({
    onMarcarTodos: (g) => accionesGrupoRef.current?.onMarcarTodos(g),
    onDesmarcarTodos: (g) => accionesGrupoRef.current?.onDesmarcarTodos(g),
    onMoverGrupo: (g, d) => accionesGrupoRef.current?.onMoverGrupo(g, d),
    onOrdenAlfabetico: (t, v) => accionesGrupoRef.current?.onOrdenAlfabetico(t, v),
  }), []);
  const acciones = useMemo<FilaAcciones>(() => ({
    onToggleRevisado: (p) => accionesRef.current?.onToggleRevisado(p),
    onEditar: (p) => accionesRef.current?.onEditar(p),
    onReplicar: (p) => accionesRef.current?.onReplicar(p),
    onMover: (p, d) => accionesRef.current?.onMover(p, d),
    onEliminar: (p) => accionesRef.current?.onEliminar(p),
  }), []);

  const handleConfirmPending = () => {
    if (!pendingAction) return;
    if (pendingAction.type === "eliminar") {
      executeEliminar(pendingAction.p, () => setPendingAction(null));
    } else if (pendingAction.type === "mover") {
      executeMoverPeriodo(pendingAction.p, pendingAction.direccion, () => setPendingAction(null));
    } else {
      executeMoverGrupo(pendingAction.ids, pendingAction.groupKey, pendingAction.direccion, () => setPendingAction(null));
    }
  };

  // ── Pipeline de vista: aplanar → filtrar → agrupar → ordenar ────────────────
  // Todo en el cliente: el endpoint no tiene filtros/orden propios y ya trae
  // todas las prestaciones de una — ver `vista/types.ts`.

  // Cache por identidad: las acciones locales (tildar, mover, anular) sólo crean un
  // objeto nuevo para las filas que tocan, así el resto mantiene su referencia y
  // `FilaPrestacion` (memo) no se vuelve a dibujar.
  const aplanadasRef = useRef(new WeakMap<PrestacionFacturaDetalle, PrestacionConSocio>());
  const todasFlat = useMemo<PrestacionConSocio[]>(() => {
    if (!detalle) return [];
    const cache = aplanadasRef.current;
    const out: PrestacionConSocio[] = [];
    for (const g of detalle.prestadores) {
      for (const p of g.prestaciones) {
        let flat = cache.get(p);
        if (!flat) {
          flat = { ...p, cod_medico: g.cod_medico, nombreSocio: g.nombre, matriculaSocio: g.matricula };
          cache.set(p, flat);
        }
        out.push(flat);
      }
    }
    return out;
  }, [detalle]);

  // Equipo de cada cabeza (id cabeza → integrantes, sin ella), sin filtrar — así el equipo
  // se muestra completo aunque algún filtro deje afuera a un integrante. Un ayudante o
  // pediatra sin grupo se asigna a su cabeza por paciente + fecha (ver `inferirEquipos`).
  // Los integrantes cuya cabeza ya no está en la factura quedan como filas comunes.
  const { equipoPorCabeza, integrantes } = useMemo(() => {
    const ids = new Set(todasFlat.map((p) => p.id));
    const inferidos = inferirEquipos(todasFlat);
    const porCabeza = new Map<number, PrestacionConSocio[]>();
    const sueltos = new Set<number>();
    for (const p of todasFlat) {
      const cabeza = p.grupo_equipo_id ?? inferidos.get(p.id);
      if (cabeza == null || cabeza === p.id || !ids.has(cabeza)) continue;
      const arr = porCabeza.get(cabeza) ?? [];
      arr.push(p);
      porCabeza.set(cabeza, arr);
      sueltos.add(p.id);
    }
    porCabeza.forEach((arr) => arr.sort((a, b) => a.id - b.id));
    return { equipoPorCabeza: porCabeza, integrantes: sueltos };
  }, [todasFlat]);

  const prestadoresOpciones = useMemo(
    () => detalle?.prestadores.map((p) => ({ cod_medico: p.cod_medico, nombre: p.nombre })) ?? [],
    [detalle],
  );

  const filtradas = useMemo(
    () => todasFlat.filter((p) => pasaFiltros(p, vistaOpciones)),
    [todasFlat, vistaOpciones],
  );

  // Equipo quirúrgico: el ayudante/gastos/pediatra de una cabeza son inseparables de ella,
  // en cualquier agrupación. Los filtros y el orden se aplican a la CABEZA: si pasa, entra
  // con todo su equipo (anidado debajo y sumado a su grupo); si no, el equipo entero queda
  // afuera. Un integrante nunca es línea propia de su socio. Sólo las prestaciones sin equipo,
  // o cuya cabeza ya no está en la factura (anulada), son líneas comunes.
  const { principales, hijosPorCabeza, visibles } = useMemo(() => {
    const propias = filtradas.filter((p) => !integrantes.has(p.id));
    const hijos = new Map<number, PrestacionConSocio[]>();
    for (const p of propias) {
      const otros = equipoPorCabeza.get(p.id);
      if (otros && otros.length > 0) hijos.set(p.id, otros);
    }
    return {
      principales: propias,
      hijosPorCabeza: hijos,
      visibles: propias.flatMap((p) => [p, ...(hijos.get(p.id) ?? [])]),
    };
  }, [filtradas, integrantes, equipoPorCabeza]);

  const vistaGrupos = useMemo<VistaGrupo[]>(() => {
    const miembrosDe = (arr: PrestacionConSocio[]) => arr.flatMap((p) => [p, ...(hijosPorCabeza.get(p.id) ?? [])]);
    // Lo que suma a los totales del médico: en Honorarios individuales y Sanatorios el
    // equipo se muestra pero no se suma (ver `sumaEquipo`).
    const sumablesDe = (arr: PrestacionConSocio[]) =>
      arr.flatMap((p) => [p, ...(sumaEquipo(p) ? hijosPorCabeza.get(p.id) ?? [] : [])]);

    if (vistaOpciones.agrupacion === "plana") {
      const ordenadas = [...principales].sort((a, b) => compararPorOrden(a, b, vistaOpciones.orden, vistaOpciones.direccion));
      const miembros = miembrosDe(ordenadas);
      return [{ key: "__plana__", titulo: "", prestaciones: ordenadas, miembros, sumables: miembros, mostrarResumen: false, ...sumarTotales(miembros) }];
    }

    if (vistaOpciones.agrupacion === "por_tipo") {
      return ORDEN_TIPOS
        .map((t) => principales.filter((p) => p.tipo === t))
        .map((arr, i) => ({ tipo: ORDEN_TIPOS[i], arr }))
        .filter(({ arr }) => arr.length > 0)
        .map(({ tipo, arr }) => {
          // Honorarios individuales y Sanatorios traen un selector. Con "paciente" la sección
          // entera va por paciente A-Z, sin partir por médico (en Sanatorios, dentro de cada
          // clínica A-Z). Si no, las filas de cada médico quedan seguidas (para cerrar con su
          // subtotal) y el orden elegido rige dentro de cada médico. Igual que el exportable
          // (`export/armado.py`).
          const selector = tipo === "Honorarios individuales" ? vistaOpciones.ordenHonorarios
            : tipo === "Sanatorio" ? vistaOpciones.ordenSanatorio : undefined;
          const porPaciente = selector === "paciente";
          const ordenadas = [...arr].sort((a, b) => porPaciente
            ? (tipo === "Sanatorio" ? porClinica(a, b) : 0) || porPacienteAZ(a, b)
            : porNombreMedico(a, b)
              || (tipo === "Sanatorio" ? porClinica(a, b) : 0)
              // Lo que el orden elegido no distingue (con "nombre del socio" empatan todas
              // las filas del socio) queda por paciente A-Z y no en el orden de carga.
              || compararPorOrden(a, b, vistaOpciones.orden, vistaOpciones.direccion)
              || (selector ? porPacienteAZ(a, b) : 0));
          const miembros = miembrosDe(ordenadas);
          // El total de la sección es lo que se factura en ella: con el equipo de todas
          // las cirugías, también en Honorarios individuales y Sanatorios (que sí lo dejan
          // afuera del subtotal de cada médico, ver GrupoTabla). Así la suma de las
          // secciones da el total de la factura. Igual que el exportable.
          const sumables = miembros;
          return {
            key: `tipo-${tipo}`, titulo: SUBTITULO_TIPO[tipo], subtitulo: SUBTITULO_TIPO[tipo], subtotalPorMedico: true,
            ordenAlfabetico: selector ? { tipo, valor: selector } : undefined,
            prestaciones: ordenadas, miembros, sumables, mostrarResumen: true, ...sumarTotales(sumables),
          };
        });
    }

    // por_socio (default): orden fijo. Médicos A-Z, cada uno con sus tramos por tipo.
    // `cod_medico` es siempre el médico que cobra (la clínica, si hay, va en `cod_clinica`
    // y se muestra como etiqueta en la fila), así que nunca se agrupa a un socio como clínica.
    const medicos = new Map<string, PrestacionConSocio[]>();
    for (const p of principales) {
      const arr = medicos.get(p.cod_medico) ?? [];
      arr.push(p);
      medicos.set(p.cod_medico, arr);
    }
    const tiposTramo = new Set<Tipo | null>(TRAMOS_MEDICO.map((t) => t.tipo));

    const gruposMedicos: VistaGrupo[] = [...medicos.entries()].map(([cod, arr]) => {
      const tramos: NonNullable<VistaGrupo["tramos"]> = TRAMOS_MEDICO.map((t) => ({
        key: t.tipo, subtitulo: t.subtitulo, prestaciones: arr.filter((p) => p.tipo === t.tipo).sort(t.comparar),
      }));
      // Filas legacy sin tipo reconocible: al final, para no perderlas.
      tramos.push({ key: "otras", subtitulo: "Otras", prestaciones: arr.filter((p) => !tiposTramo.has(p.tipo)).sort(porFechaDesc) });
      const conFilas = tramos.filter((t) => t.prestaciones.length > 0);
      const prestaciones = conFilas.flatMap((t) => t.prestaciones);
      const miembros = miembrosDe(prestaciones);
      const sumables = sumablesDe(prestaciones);
      return {
        key: cod, titulo: `Socio ${cod} ${arr[0]?.nombreSocio ?? ""}`.trim(), prestaciones, miembros, sumables,
        tramos: conFilas, mostrarResumen: true, ...sumarTotales(sumables),
      };
    }).sort(porNombreSocio);

    return gruposMedicos;
  }, [principales, hijosPorCabeza, vistaOpciones.agrupacion, vistaOpciones.orden, vistaOpciones.direccion,
    vistaOpciones.ordenHonorarios, vistaOpciones.ordenSanatorio]);

  const columnasActivas = useMemo(
    () => COLUMNAS_VISTA_DISPONIBLES.filter((c) => vistaOpciones.columnas.includes(c.key)),
    [vistaOpciones.columnas],
  );

  const columnasConPeso = useMemo(() => {
    const activos: { id: string; peso: number }[] = [
      { id: "id", peso: PESO_COLUMNA.id },
      { id: "socio", peso: PESO_COLUMNA.socio },
      ...columnasActivas.map((c) => ({ id: c.key, peso: PESO_COLUMNA[c.key] })),
      { id: "acciones", peso: PESO_COLUMNA.acciones },
    ];
    const suma = activos.reduce((s, c) => s + c.peso, 0) || 1;
    return activos.map((c) => ({ ...c, pct: (c.peso / suma) * 100 }));
  }, [columnasActivas]);

  const esPorSocio = vistaOpciones.agrupacion === "por_socio";

  // Un complemento (version > 1) no mueve prestaciones de período (ver FilaPrestacion).
  const esComplemento = (detalle?.version ?? 1) > 1;

  const columnasKeys = useMemo(() => columnasActivas.map((c) => c.key), [columnasActivas]);
  const anchos = useMemo(() => columnasConPeso.map((c) => c.pct), [columnasConPeso]);

  // Grupos con identidad estable: si un grupo tiene exactamente las mismas filas (por
  // referencia), el mismo armado y los mismos compañeros de equipo que en el render
  // anterior, se reusa el objeto anterior y `GrupoTabla` (memo) no se vuelve a dibujar.
  // Tildar una fila sólo redibuja el grupo de esa fila.
  const gruposCacheRef = useRef(new Map<string, { g: VistaGrupo; firma: unknown[] }>());
  const gruposEstables = useMemo(() => {
    const anterior = gruposCacheRef.current;
    const nuevo = new Map<string, { g: VistaGrupo; firma: unknown[] }>();
    const out = vistaGrupos.map((g) => {
      const firma: unknown[] = [
        g.titulo, g.subtitulo, g.subtotalPorMedico, g.ordenAlfabetico?.valor, g.mostrarResumen, ...g.prestaciones,
      ];
      g.tramos?.forEach((t) => firma.push(t.key, t.prestaciones.length));
      const companeros: Record<number, PrestacionConSocio[]> = {};
      for (const p of g.prestaciones) {
        const otros = hijosPorCabeza.get(p.id);
        if (otros && otros.length > 0) {
          companeros[p.id] = otros;
          firma.push(p.id, ...otros);
        }
      }
      const previo = anterior.get(g.key);
      const final = previo && mismaFirma(previo.firma, firma) ? previo.g : { ...g, companeros };
      nuevo.set(g.key, { g: final, firma });
      return final;
    });
    gruposCacheRef.current = nuevo;
    return out;
  }, [vistaGrupos, hijosPorCabeza]);

  // La tabla se dibuja con una versión "diferida" de los grupos: cambiar filtros/orden
  // o abrir un panel responde al instante y la tabla se actualiza al terminar de calcularse.
  const gruposDibujados = useDeferredValue(gruposEstables);

  const ocupadasDe = (g: VistaGrupo): ReadonlySet<number> => {
    if (busyIds.size === 0) return SIN_OCUPADAS;
    const ids = g.miembros.filter((p) => busyIds.has(p.id)).map((p) => p.id);
    return ids.length > 0 ? new Set(ids) : SIN_OCUPADAS;
  };

  const filtrosActivos = hayFiltrosActivos(vistaOpciones);
  const totalFiltrado = useMemo(() => sumarTotales(visibles).totalSubtotal, [visibles]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerIcon}>
          <ClipboardList size={22} />
        </span>
        <div>
          <h1 className={styles.title}>Listado de prestaciones</h1>
          <p className={styles.subtitle}>Período activo: {detalle?.periodo ?? "—"}</p>
        </div>

        <div className={styles.headerRight}>
          {detalle && (
            <>
              <span className={`${styles.infoChip} ${styles.chipOs}`}>OS {detalle.cod_obra}</span>
              <span className={`${styles.infoChip} ${estadoChipClass(detalle.estado)}`}>
                {estadoLabel(detalle.estado)}
              </span>
              <span className={`${styles.infoChip} ${styles.chipTotal}`}>
                Total: {formatMoney(detalle.total_importe)}
              </span>
            </>
          )}
          <button type="button" className={styles.backBtn} onClick={() => setVistaOpen(true)} disabled={!detalle}>
            <SlidersHorizontal size={15} /> Vista
          </button>
          <button type="button" className={styles.backBtn} onClick={() => setExportOpen(true)} disabled={!detalle}>
            <Download size={15} /> Exportar
          </button>
          <button type="button" className={styles.backBtn} onClick={() => navigate("/panel/facturacion/periodos")}>
            <ArrowLeft size={15} /> Volver
          </button>
        </div>
      </div>

      <div className={styles.layout}>
        {detalle && (
          <div className={styles.toolbar}>
            <div className={styles.toolbarStats}>
              <span className={styles.infoChip}>{detalle.total_prestaciones} prestación{detalle.total_prestaciones !== 1 ? "es" : ""}</span>
              {filtrosActivos && (
                <span className={styles.infoChip}>
                  Mostrando {visibles.length} filtrada{visibles.length !== 1 ? "s" : ""} — {formatMoney(totalFiltrado)}
                </span>
              )}
            </div>
          </div>
        )}

        <div className={styles.tableWrap}>
          <table className={`${styles.table} ${styles.tablaEncabezado}`}>
            <colgroup>
              {columnasConPeso.map((c) => <col key={c.id} style={{ width: `${c.pct}%` }} />)}
            </colgroup>
            <thead>
              <tr>
                <th>ID</th>
                <th>Socio</th>
                {columnasActivas.map((c) => <th key={c.key}>{c.label}</th>)}
                <th className={styles.thActions}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={columnasConPeso.length} className={styles.loadingCell}>Cargando…</td></tr>
              )}
              {!loading && error && (
                <tr><td colSpan={columnasConPeso.length} className={styles.emptyCell}>{error}</td></tr>
              )}
              {!loading && !error && detalle && detalle.total_prestaciones === 0 && (
                <tr><td colSpan={columnasConPeso.length} className={styles.emptyCell}>Esta factura no tiene prestaciones.</td></tr>
              )}
              {!loading && !error && detalle && detalle.total_prestaciones > 0 && visibles.length === 0 && (
                <tr><td colSpan={columnasConPeso.length} className={styles.emptyCell}>Ningún resultado con los filtros de vista actuales.</td></tr>
              )}
            </tbody>
          </table>
          {!loading && !error && detalle && gruposDibujados.map((g) => (
            <GrupoTabla
              key={g.key}
              g={g}
              columnas={columnasKeys}
              anchos={anchos}
              acciones={acciones}
              accionesGrupo={accionesGrupo}
              busyIds={ocupadasDe(g)}
              grupoBusy={busyGroups.has(g.key)}
              esComplemento={esComplemento}
              esPorSocio={esPorSocio}
            />
          ))}
        </div>
      </div>

      {pendingAction?.type === "eliminar" && (
        <ConfirmActionModal
          isOpen
          icon={Trash2}
          variant="danger"
          title="Eliminar prestación"
          message={
            <>El ID Nº <strong>{pendingAction.p.id}</strong> — ¿confirmás anular esta prestación?</>
          }
          warning="Esta acción anula la prestación y no se puede deshacer."
          confirmLabel="Eliminar"
          onClose={() => setPendingAction(null)}
          onConfirm={handleConfirmPending}
          loading={busyIds.has(pendingAction.p.id)}
        />
      )}

      {pendingAction?.type === "mover" && (
        <ConfirmActionModal
          isOpen
          icon={pendingAction.direccion === "siguiente" ? ArrowRightCircle : ArrowLeftCircle}
          variant="primary"
          title={pendingAction.direccion === "siguiente" ? "Mover al período siguiente" : "Mover al período anterior"}
          message={
            <>El ID Nº <strong>{pendingAction.p.id}</strong> — ¿confirmás moverla al{" "}
              <strong>{pendingAction.direccion === "siguiente" ? "período siguiente" : "período anterior"}</strong>?</>
          }
          confirmLabel="Mover"
          onClose={() => setPendingAction(null)}
          onConfirm={handleConfirmPending}
          loading={busyIds.has(pendingAction.p.id)}
        />
      )}

      {pendingAction?.type === "moverGrupo" && (
        <ConfirmActionModal
          isOpen
          icon={pendingAction.direccion === "siguiente" ? ArrowRightCircle : ArrowLeftCircle}
          variant="primary"
          title={pendingAction.direccion === "siguiente" ? "Mover al período siguiente" : "Mover al período anterior"}
          message={
            <>¿Mover <strong>{pendingAction.ids.length}</strong> prestación{pendingAction.ids.length !== 1 ? "es" : ""} de{" "}
              <strong>{pendingAction.label}</strong> al{" "}
              <strong>{pendingAction.direccion === "siguiente" ? "período siguiente" : "período anterior"}</strong>?</>
          }
          warning={pendingAction.marcadas > 0
            ? `${pendingAction.marcadas} marcada${pendingAction.marcadas !== 1 ? "s" : ""} se queda${pendingAction.marcadas !== 1 ? "n" : ""} en este período.`
            : undefined}
          confirmLabel="Mover todos"
          onClose={() => setPendingAction(null)}
          onConfirm={handleConfirmPending}
          loading={busyGroups.has(pendingAction.groupKey)}
        />
      )}

      {exportOpen && detalle && (
        <ExportPanel detalle={detalle} vista={vistaOpciones} onClose={() => setExportOpen(false)} />
      )}

      {vistaOpen && detalle && (
        <VistaPanel
          opciones={vistaOpciones}
          onChange={setVistaOpciones}
          prestadores={prestadoresOpciones}
          onClose={() => setVistaOpen(false)}
        />
      )}
    </div>
  );
};

export default FacturaDetalle;
