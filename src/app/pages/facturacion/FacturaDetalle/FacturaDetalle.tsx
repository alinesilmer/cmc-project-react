import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ClipboardList, ArrowLeft, Pencil, Copy, ArrowRightCircle, ArrowLeftCircle, Trash2,
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
import type { ColumnaVista, FiltrosVista, OrdenVista, VistaOpciones } from "./vista/types";
import { COLUMNAS_VISTA_DISPONIBLES, ORDEN_TIPOS, PESO_COLUMNA, VISTA_OPCIONES_DEFAULT } from "./vista/types";
import styles from "./FacturaDetalle.module.scss";

// La prestación "aplanada" con los datos de su socio ya resueltos — se arma una
// sola vez a partir de `detalle.prestadores` y es la base de todo el pipeline
// de vista (filtrar → agrupar → ordenar), en vez de depender de la agrupación
// por-socio que ya viene armada del backend.
interface PrestacionConSocio extends PrestacionFacturaDetalle {
  cod_medico: string;
  nombreSocio: string | null;
  matriculaSocio: number | null;
}

interface VistaGrupo {
  key: string;
  titulo: string;
  prestaciones: PrestacionConSocio[];
  mostrarResumen: boolean;
  totalHonorarios: number;
  totalGastos: number;
  totalSubtotal: number;
}

type PendingAction =
  | { type: "eliminar"; p: PrestacionConSocio }
  | { type: "mover"; p: PrestacionConSocio; direccion: "siguiente" | "anterior" }
  | { type: "moverGrupo"; ids: number[]; label: string; groupKey: string; direccion: "siguiente" | "anterior" };

const fmtFecha = (iso: string | null): string => {
  if (!iso) return "—";
  // `new Date("2026-11-01")` parsea las date-only como medianoche UTC, y al mostrarlas
  // en hora local (AR = UTC-3) retroceden un día. Las fechas de la API (`fecha_practica`,
  // `fecha`) son columnas DATE, así que se formatean sin pasar por Date.
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (soloFecha) return `${soloFecha[3]}/${soloFecha[2]}/${soloFecha[1]}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const tipoPrestadorClass = (t: string | null): string => {
  switch (t) {
    case "Medico":   return styles.tipoPrestadorMedico;
    case "Ayudante": return styles.tipoPrestadorAyudante;
    case "Gastos":   return styles.tipoPrestadorGastos;
    case "Pediatra": return styles.tipoPrestadorPediatra;
    default:         return "";
  }
};

const tipoClass = (t: Tipo | null): string => {
  switch (t) {
    case "Consulta":               return styles.tipoConsulta;
    case "Practica":               return styles.tipoPractica;
    case "Honorarios individuales": return styles.tipoHonorarios;
    case "Sanatorio":              return styles.tipoSanatorio;
    default:                       return "";
  }
};

const viaLabel = (v: string | null | undefined): string =>
  v === "L" ? "Laparoscópica" : v === "T" ? "Tradicional" : "";

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

const sumarTotales = (arr: PrestacionConSocio[]) => arr.reduce(
  (acc, p) => {
    acc.totalHonorarios += parseMoney(p.honorarios);
    acc.totalGastos += parseMoney(p.gastos);
    acc.totalSubtotal += parseMoney(p.subtotal);
    return acc;
  },
  { totalHonorarios: 0, totalGastos: 0, totalSubtotal: 0 },
);

const compararPorOrden = (a: PrestacionConSocio, b: PrestacionConSocio, orden: OrdenVista): number => {
  switch (orden) {
    case "fecha":
      return (a.fecha_practica ?? "").localeCompare(b.fecha_practica ?? "");
    case "codigo":
      return (a.codigo ?? "").localeCompare(b.codigo ?? "", "es");
    case "monto_desc":
      return parseMoney(b.subtotal) - parseMoney(a.subtotal);
    case "nombre_socio":
      return (a.nombreSocio ?? a.cod_medico).localeCompare(b.nombreSocio ?? b.cod_medico, "es", { sensitivity: "base" });
    default:
      return 0;
  }
};

const pasaFiltros = (p: PrestacionConSocio, f: FiltrosVista): boolean => {
  if (f.fecha_desde && (!p.fecha_practica || p.fecha_practica < f.fecha_desde)) return false;
  if (f.fecha_hasta && (!p.fecha_practica || p.fecha_practica > f.fecha_hasta)) return false;
  if (f.tipos && f.tipos.length > 0 && (!p.tipo || !f.tipos.includes(p.tipo))) return false;
  if (f.revisado !== undefined && p.revisado !== f.revisado) return false;
  if (f.cod_medicos && f.cod_medicos.length > 0 && !f.cod_medicos.includes(p.cod_medico)) return false;
  if (f.id_especialidad !== undefined && (p.id_especialidad ?? null) !== f.id_especialidad) return false;
  return true;
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
    setDetalle({
      ...detalle,
      prestadores: detalle.prestadores.map((g) => ({
        ...g,
        prestaciones: g.prestaciones.map((row) => row.id === p.id ? { ...row, revisado: nextValue } : row),
      })),
    });
    withBusy(p.id, async () => {
      try {
        await marcarRevisado(nextValue ? { marcados: [p.id] } : { desmarcados: [p.id] });
      } catch {
        setDetalle((cur) => cur ? {
          ...cur,
          prestadores: cur.prestadores.map((g) => ({
            ...g,
            prestaciones: g.prestaciones.map((row) => row.id === p.id ? { ...row, revisado: !nextValue } : row),
          })),
        } : cur);
        notify("No se pudo actualizar el estado de auditoría.", "error");
      }
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
        load();
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
        load();
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
        load();
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
        load();
      } catch (e: any) {
        notify(detailMessage(e?.response?.data?.detail) || "No se pudo desmarcar el grupo.", "error");
      }
    });
  };

  const handleMoverGrupo = (g: VistaGrupo, direccion: "siguiente" | "anterior") => {
    const movibles = g.prestaciones.filter((p) => p.estado === "A");
    if (movibles.length === 0) {
      notify("No hay prestaciones abiertas para mover en este grupo.", "error");
      return;
    }
    setPendingAction({
      type: "moverGrupo", ids: movibles.map((p) => p.id), label: g.titulo, groupKey: g.key, direccion,
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
        load();
        onSuccess();
      } catch (e: any) {
        const detail = e?.response?.data?.detail;
        const msg = typeof detail === "string" ? detail : detail?.mensaje ?? "No se pudo mover el grupo.";
        notify(msg, "error");
      }
    });
  };

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

  const todasFlat = useMemo<PrestacionConSocio[]>(() => {
    if (!detalle) return [];
    const out: PrestacionConSocio[] = [];
    for (const g of detalle.prestadores) {
      for (const p of g.prestaciones) {
        out.push({ ...p, cod_medico: g.cod_medico, nombreSocio: g.nombre, matriculaSocio: g.matricula });
      }
    }
    return out;
  }, [detalle]);

  // Todas las prestaciones de cada equipo quirúrgico (cabeza + compañeros), sin
  // filtrar — así el equipo se puede mostrar completo aunque algún filtro deje
  // afuera a un compañero.
  const equipoPorGrupo = useMemo(() => {
    const map = new Map<number, PrestacionConSocio[]>();
    for (const p of todasFlat) {
      if (p.grupo_equipo_id == null) continue;
      const arr = map.get(p.grupo_equipo_id) ?? [];
      arr.push(p);
      map.set(p.grupo_equipo_id, arr);
    }
    return map;
  }, [todasFlat]);

  const prestadoresOpciones = useMemo(
    () => detalle?.prestadores.map((p) => ({ cod_medico: p.cod_medico, nombre: p.nombre })) ?? [],
    [detalle],
  );

  const filtradas = useMemo(
    () => todasFlat.filter((p) => pasaFiltros(p, vistaOpciones)),
    [todasFlat, vistaOpciones],
  );

  const vistaGrupos = useMemo<VistaGrupo[]>(() => {
    if (vistaOpciones.agrupacion === "plana") {
      const ordenadas = [...filtradas].sort((a, b) => compararPorOrden(a, b, vistaOpciones.orden));
      return [{ key: "__plana__", titulo: "", prestaciones: ordenadas, mostrarResumen: false, ...sumarTotales(ordenadas) }];
    }

    if (vistaOpciones.agrupacion === "por_tipo") {
      return ORDEN_TIPOS
        .map((t) => filtradas.filter((p) => p.tipo === t))
        .map((arr, i) => ({ tipo: ORDEN_TIPOS[i], arr }))
        .filter(({ arr }) => arr.length > 0)
        .map(({ tipo, arr }) => {
          const ordenadas = [...arr].sort((a, b) => compararPorOrden(a, b, vistaOpciones.orden));
          return { key: `tipo-${tipo}`, titulo: tipo, prestaciones: ordenadas, mostrarResumen: true, ...sumarTotales(ordenadas) };
        });
    }

    // por_socio (default)
    const porSocio = new Map<string, PrestacionConSocio[]>();
    for (const p of filtradas) {
      const arr = porSocio.get(p.cod_medico) ?? [];
      arr.push(p);
      porSocio.set(p.cod_medico, arr);
    }
    const entries = [...porSocio.entries()].map(([cod, arr]) => {
      const ordenadas = [...arr].sort((a, b) => compararPorOrden(a, b, vistaOpciones.orden));
      const titulo = `Socio ${cod} ${arr[0]?.nombreSocio ?? ""}`.trim();
      return { key: cod, titulo, prestaciones: ordenadas, mostrarResumen: true, ...sumarTotales(ordenadas) };
    });
    entries.sort((a, b) => a.titulo.localeCompare(b.titulo, "es", { sensitivity: "base" }));
    return entries;
  }, [filtradas, vistaOpciones.agrupacion, vistaOpciones.orden]);

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

  const renderRevisadoCheckbox = (p: PrestacionConSocio) => (
    <span className={`${styles.auditCheckboxWrap} ${p.revisado ? styles.auditCheckboxOn : ""}`}>
      <input
        type="checkbox"
        className={styles.auditCheckbox}
        checked={p.revisado}
        onChange={() => handleToggleRevisado(p)}
        title="Marcar como auditado"
      />
    </span>
  );

  // Un complemento (version > 1) es una factura para un período ya cerrado y enviado:
  // mover sus prestaciones a otro período no tiene sentido, así que se ocultan esos botones.
  const esComplemento = (detalle?.version ?? 1) > 1;

  const renderAcciones = (p: PrestacionConSocio) => {
    const editable = p.estado === "A";
    const busy = busyIds.has(p.id);
    return (
      <div className={styles.actionsCell}>
        {renderRevisadoCheckbox(p)}
        <button
          type="button"
          className={`${styles.iconBtn} ${styles.iconBtnEdit}`}
          title="Editar"
          disabled={!editable || busy}
          onClick={() => handleEditar(p)}
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          className={styles.iconBtn}
          title="Replicar carga"
          disabled={busy}
          onClick={() => handleReplicar(p)}
        >
          <Copy size={14} />
        </button>
        {!esComplemento && (
          <>
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.iconBtnMove}`}
              title="Mover al período anterior"
              disabled={!editable || busy}
              onClick={() => handleMoverPeriodo(p, "anterior")}
            >
              <ArrowLeftCircle size={15} />
            </button>
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.iconBtnMove}`}
              title="Mover al período siguiente"
              disabled={!editable || busy}
              onClick={() => handleMoverPeriodo(p, "siguiente")}
            >
              <ArrowRightCircle size={15} />
            </button>
          </>
        )}
        <button
          type="button"
          className={`${styles.iconBtn} ${styles.iconBtnDelete}`}
          title="Eliminar"
          disabled={!editable || busy}
          onClick={() => handleEliminar(p)}
        >
          <Trash2 size={14} />
        </button>
      </div>
    );
  };

  const renderCeldaColumna = (p: PrestacionConSocio, col: ColumnaVista) => {
    switch (col) {
      case "autorizacion":
        return <td key={col}>{p.autorizacion || <span className={styles.mutedText}>—</span>}</td>;
      case "fecha":
        return <td key={col}>{fmtFecha(p.fecha_practica)}</td>;
      case "codigo":
        return <td key={col}><span className={styles.codeCell}>{p.codigo ?? "—"}</span></td>;
      case "via":
        return (
          <td key={col}>
            {p.via ? (
              <span
                className={`${styles.viaBadge} ${p.via === "L" ? styles.viaLaparoscopica : ""}`}
                title={viaLabel(p.via)}
              >
                {p.via}
              </span>
            ) : <span className={styles.mutedText}>—</span>}
          </td>
        );
      case "nro_afiliado":
        return <td key={col}>{p.nro_afiliado || <span className={styles.mutedText}>—</span>}</td>;
      case "paciente":
        return <td key={col}>{p.nombre_paciente || <span className={styles.mutedText}>—</span>}</td>;
      case "cantidad":
        return (
          <td key={col}>
            <div className={styles.cantidadCell}>
              <span className={styles.cantidadMain}>Cant. {p.cantidad ?? "—"}</span>
              <span className={styles.cantidadSub}>Sesión {p.sesion ?? "—"}</span>
            </div>
          </td>
        );
      case "porcentaje":
        return <td key={col}>{p.porcentaje != null ? `${p.porcentaje}%` : "—"}</td>;
      case "honorarios":
        return <td key={col}><span className={styles.moneyCell}>{formatMoney(p.honorarios)}</span></td>;
      case "gastos":
        return <td key={col}><span className={styles.moneyCell}>{formatMoney(p.gastos)}</span></td>;
      case "tipo_prestador":
        return (
          <td key={col}>
            {p.tipo_prestador ? (
              <span className={`${styles.tipoPrestadorBadge} ${tipoPrestadorClass(p.tipo_prestador)}`}>
                {p.tipo_prestador}
              </span>
            ) : <span className={styles.mutedText}>—</span>}
          </td>
        );
      case "subtotal":
        return <td key={col}><span className={styles.subtotalCell}>{formatMoney(p.subtotal)}</span></td>;
      case "tipo":
        return (
          <td key={col}>
            {p.tipo ? (
              <span className={`${styles.tipoBadge} ${tipoClass(p.tipo)}`}>{p.tipo}</span>
            ) : <span className={styles.mutedText}>—</span>}
          </td>
        );
      default:
        return null;
    }
  };

  const renderDataRow = (
    p: PrestacionConSocio,
    opts?: { indent?: boolean; keyOverride?: string; ultimoDelEquipo?: boolean; equipoHead?: boolean },
  ) => {
    const indent = opts?.indent ?? false;
    return (
      <tr
        key={opts?.keyOverride ?? p.id}
        className={[
          styles.dataRow,
          p.revisado ? styles.rowRevisada : "",
          p.estado === "X" ? styles.rowAnulada : "",
          indent ? styles.equipoPreviewRow : "",
          opts?.ultimoDelEquipo ? styles.equipoPreviewRowLast : "",
          opts?.equipoHead ? styles.equipoGrupoHeadRow : "",
        ].filter(Boolean).join(" ")}
      >
        <td className={styles.idCell}>{p.id}</td>
        <td>
          <div className={styles.socioCell}>
            <span className={styles.socioNro}>
              {p.cod_medico}
              {p.matriculaSocio != null && <span className={styles.socioMatricula}> - {p.matriculaSocio}</span>}
            </span>
            <span className={styles.socioNombre}>{p.nombreSocio ?? "—"}</span>
          </div>
        </td>
        {columnasActivas.map((c) => renderCeldaColumna(p, c.key))}
        <td>
          {indent ? <span className={styles.mutedText}>En su grupo</span> : renderAcciones(p)}
        </td>
      </tr>
    );
  };

  // Cada prestación cabeza de equipo (`grupo_equipo_id === su propio id`) arrastra,
  // indentadas justo debajo, filas de solo lectura con el detalle completo de sus
  // compañeros (ayudante/gastos) — sin afectar el subtotal del grupo en el que
  // está esta fila. Cada compañero sigue teniendo, además, su propia fila
  // interactiva completa en su propio grupo (por eso estas son de sólo lectura:
  // actuar sobre la prestación real se hace ahí).
  const renderFilaConEquipo = (p: PrestacionConSocio): React.ReactNode[] => {
    if (vistaOpciones.agruparEquipo && p.grupo_equipo_id != null && p.grupo_equipo_id === p.id) {
      const companeros = (equipoPorGrupo.get(p.grupo_equipo_id) ?? []).filter((m) => m.id !== p.id);
      if (companeros.length > 0) {
        const filas: React.ReactNode[] = [renderDataRow(p, { equipoHead: true })];
        companeros.forEach((m, i) => {
          filas.push(renderDataRow(m, {
            indent: true,
            keyOverride: `${p.id}-eq-${m.id}`,
            ultimoDelEquipo: i === companeros.length - 1,
          }));
        });
        return filas;
      }
    }
    return [renderDataRow(p)];
  };

  const renderResumenRow = (g: VistaGrupo) => {
    const grupoBusy = busyGroups.has(g.key);
    const ids = g.prestaciones.map((p) => p.id);
    const esPorSocio = vistaOpciones.agrupacion === "por_socio";

    return (
      <tr key={`resumen-${g.key}`} className={styles.resumenRow}>
        <td colSpan={columnasConPeso.length}>
          <div className={styles.resumenContent}>
            <span className={styles.resumenLabel}>RESUMEN: {g.titulo}</span>
            {esPorSocio && (
              <>
                <span className={styles.resumenBadge}>Prácticas: {g.prestaciones.filter((p) => p.tipo === "Practica").length}</span>
                <span className={styles.resumenBadge}>Consultas: {g.prestaciones.filter((p) => p.tipo === "Consulta").length}</span>
                <span className={styles.resumenBadge}>Honorarios: {g.prestaciones.filter((p) => p.tipo === "Honorarios individuales").length}</span>
              </>
            )}
            <span className={styles.resumenMoney}>
              Honorarios: <strong>{formatMoney(g.totalHonorarios)}</strong>
            </span>
            <span className={styles.resumenMoney}>
              Gastos: <strong>{formatMoney(g.totalGastos)}</strong>
            </span>
            <div className={styles.resumenActions}>
              <button
                type="button"
                className={styles.resumenActionBtn}
                disabled={grupoBusy}
                onClick={() => handleMarcarTodos(ids, g.key)}
              >
                Marcar todos
              </button>
              <button
                type="button"
                className={styles.resumenActionBtn}
                disabled={grupoBusy}
                onClick={() => handleDesmarcarTodos(ids, g.key)}
              >
                Desmarcar todos
              </button>
              {!esComplemento && esPorSocio && (
                <>
                  <button
                    type="button"
                    className={styles.resumenActionBtn}
                    disabled={grupoBusy}
                    onClick={() => handleMoverGrupo(g, "siguiente")}
                  >
                    <ArrowRightCircle size={12} /> Siguiente período todos
                  </button>
                  <button
                    type="button"
                    className={styles.resumenActionBtn}
                    disabled={grupoBusy}
                    onClick={() => handleMoverGrupo(g, "anterior")}
                  >
                    <ArrowLeftCircle size={12} /> Anterior período todos
                  </button>
                </>
              )}
            </div>
            <span className={styles.resumenTotalBadge}>Total: {formatMoney(g.totalSubtotal)}</span>
          </div>
        </td>
      </tr>
    );
  };

  const filtrosActivos = hayFiltrosActivos(vistaOpciones);
  const totalFiltrado = useMemo(() => sumarTotales(filtradas).totalSubtotal, [filtradas]);

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
                  Mostrando {filtradas.length} filtrada{filtradas.length !== 1 ? "s" : ""} — {formatMoney(totalFiltrado)}
                </span>
              )}
            </div>
          </div>
        )}

        <motion.div
          className={styles.tableWrap}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <table className={styles.table}>
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
              {!loading && !error && detalle && detalle.total_prestaciones > 0 && filtradas.length === 0 && (
                <tr><td colSpan={columnasConPeso.length} className={styles.emptyCell}>Ningún resultado con los filtros de vista actuales.</td></tr>
              )}
              {!loading && !error && detalle && vistaGrupos.map((g) => (
                <React.Fragment key={g.key}>
                  {g.prestaciones.flatMap((p) => renderFilaConEquipo(p))}
                  {g.mostrarResumen && renderResumenRow(g)}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </motion.div>
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
          confirmLabel="Mover todos"
          onClose={() => setPendingAction(null)}
          onConfirm={handleConfirmPending}
          loading={busyGroups.has(pendingAction.groupKey)}
        />
      )}

      {exportOpen && detalle && (
        <ExportPanel detalle={detalle} onClose={() => setExportOpen(false)} />
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
