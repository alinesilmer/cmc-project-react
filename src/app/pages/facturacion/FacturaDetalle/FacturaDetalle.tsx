import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ClipboardList, ArrowLeft, Pencil, Copy, ArrowRightCircle, ArrowLeftCircle, Trash2 } from "lucide-react";

import { useAppSnackbar } from "../../../hooks/useAppSnackbar";
import {
  fetchFacturaDetalle, marcarRevisado, anularPrestacion,
  moverPeriodo,
} from "../api";
import type {
  FacturaDetalleResponse, PrestadorFacturaGrupo, PrestacionFacturaDetalle, Tipo,
} from "../types";
import { detailMessage } from "../types";
import { formatMoney } from "../money";
import ConfirmActionModal from "../components/ConfirmActionModal";
import styles from "./FacturaDetalle.module.scss";

type PendingAction =
  | { type: "eliminar"; p: PrestacionFacturaDetalle }
  | { type: "mover"; p: PrestacionFacturaDetalle; direccion: "siguiente" | "anterior" }
  | { type: "moverGrupo"; grupo: PrestadorFacturaGrupo; direccion: "siguiente" | "anterior" };

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

  const handleToggleRevisado = (p: PrestacionFacturaDetalle) => {
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

  const handleEditar = (p: PrestacionFacturaDetalle) => {
    navigate(`/panel/facturacion/carga/${p.id}?from=${id}`);
  };

  // Precarga el formulario de carga con los datos de esta prestación, pero como una
  // prestación nueva (POST) — la original no se toca.
  const handleReplicar = (p: PrestacionFacturaDetalle) => {
    navigate(`/panel/facturacion/carga?replicar=${p.id}`);
  };

  const handleEliminar = (p: PrestacionFacturaDetalle) => setPendingAction({ type: "eliminar", p });

  const handleMoverPeriodo = (p: PrestacionFacturaDetalle, direccion: "siguiente" | "anterior") =>
    setPendingAction({ type: "mover", p, direccion });

  const executeEliminar = (p: PrestacionFacturaDetalle, onSuccess: () => void) =>
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

  const executeMoverPeriodo = (p: PrestacionFacturaDetalle, direccion: "siguiente" | "anterior", onSuccess: () => void) =>
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

  const handleMarcarTodos = (grupo: PrestadorFacturaGrupo) => {
    const ids = grupo.prestaciones.map((p) => p.id);
    if (ids.length === 0) return;
    withGroupBusy(grupo.cod_medico, async () => {
      try {
        await marcarRevisado({ marcados: ids });
        notify(`Se marcaron ${ids.length} prestación${ids.length !== 1 ? "es" : ""} como auditadas.`);
        load();
      } catch (e: any) {
        notify(detailMessage(e?.response?.data?.detail) || "No se pudo marcar el grupo.", "error");
      }
    });
  };

  const handleDesmarcarTodos = (grupo: PrestadorFacturaGrupo) => {
    const ids = grupo.prestaciones.map((p) => p.id);
    if (ids.length === 0) return;
    withGroupBusy(grupo.cod_medico, async () => {
      try {
        await marcarRevisado({ desmarcados: ids });
        notify(`Se desmarcaron ${ids.length} prestación${ids.length !== 1 ? "es" : ""}.`);
        load();
      } catch (e: any) {
        notify(detailMessage(e?.response?.data?.detail) || "No se pudo desmarcar el grupo.", "error");
      }
    });
  };

  const handleMoverGrupo = (grupo: PrestadorFacturaGrupo, direccion: "siguiente" | "anterior") => {
    const movibles = grupo.prestaciones.filter((p) => p.estado === "A");
    if (movibles.length === 0) {
      notify("No hay prestaciones abiertas para mover en este grupo.", "error");
      return;
    }
    setPendingAction({ type: "moverGrupo", grupo, direccion });
  };

  const executeMoverGrupo = (grupo: PrestadorFacturaGrupo, direccion: "siguiente" | "anterior", onSuccess: () => void) => {
    if (!detalle) return Promise.resolve();
    const movibles = grupo.prestaciones.filter((p) => p.estado === "A");
    return withGroupBusy(grupo.cod_medico, async () => {
      try {
        const result = await moverPeriodo({
          cod_obra: detalle.cod_obra,
          periodo_origen: detalle.periodo,
          ids: movibles.map((p) => p.id),
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
      executeMoverGrupo(pendingAction.grupo, pendingAction.direccion, () => setPendingAction(null));
    }
  };

  const gruposOrdenados = useMemo(() => {
    if (!detalle) return [];
    return [...detalle.prestadores].sort((a, b) =>
      (a.nombre ?? a.cod_medico).localeCompare(b.nombre ?? b.cod_medico, "es", { sensitivity: "base" }),
    );
  }, [detalle]);

  const renderRevisadoCheckbox = (p: PrestacionFacturaDetalle) => (
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

  const renderAcciones = (p: PrestacionFacturaDetalle) => {
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

  const renderDataRow = (p: PrestacionFacturaDetalle, grupo: PrestadorFacturaGrupo) => (
    <tr
      key={p.id}
      className={`${styles.dataRow} ${p.revisado ? styles.rowRevisada : ""} ${p.estado === "X" ? styles.rowAnulada : ""}`}
    >
      <td className={styles.idCell}>{p.id}</td>
      <td>
        <div className={styles.socioCell}>
          <span className={styles.socioNro}>
            {grupo.cod_medico}
            {grupo.matricula != null && <span className={styles.socioMatricula}> - {grupo.matricula}</span>}
          </span>
          <span className={styles.socioNombre}>{grupo.nombre ?? "—"}</span>
        </div>
      </td>
      <td>{p.autorizacion || <span className={styles.mutedText}>—</span>}</td>
      <td>{fmtFecha(p.fecha_practica)}</td>
      <td><span className={styles.codeCell}>{p.codigo ?? "—"}</span></td>
      <td>{p.nro_afiliado || <span className={styles.mutedText}>—</span>}</td>
      <td>
        <div className={styles.cantidadCell}>
          <span className={styles.cantidadMain}>Cant. {p.cantidad ?? "—"}</span>
          <span className={styles.cantidadSub}>Sesión {p.sesion ?? "—"}</span>
        </div>
      </td>
      <td>{p.porcentaje != null ? `${p.porcentaje}%` : "—"}</td>
      <td><span className={styles.moneyCell}>{formatMoney(p.honorarios)}</span></td>
      <td><span className={styles.moneyCell}>{formatMoney(p.gastos)}</span></td>
      <td>
        {p.tipo_prestador ? (
          <span className={`${styles.tipoPrestadorBadge} ${tipoPrestadorClass(p.tipo_prestador)}`}>
            {p.tipo_prestador}
          </span>
        ) : <span className={styles.mutedText}>—</span>}
      </td>
      <td><span className={styles.subtotalCell}>{formatMoney(p.subtotal)}</span></td>
      <td>
        {p.tipo ? (
          <span className={`${styles.tipoBadge} ${tipoClass(p.tipo)}`}>{p.tipo}</span>
        ) : <span className={styles.mutedText}>—</span>}
      </td>
      <td>{renderAcciones(p)}</td>
    </tr>
  );

  const renderResumenRow = (grupo: PrestadorFacturaGrupo) => {
    const cantPracticas = grupo.prestaciones.filter((p) => p.tipo === "Practica").length;
    const cantConsultas = grupo.prestaciones.filter((p) => p.tipo === "Consulta").length;
    const cantHonorarios = grupo.prestaciones.filter((p) => p.tipo === "Honorarios individuales").length;
    const grupoBusy = busyGroups.has(grupo.cod_medico);

    return (
      <tr key={`resumen-${grupo.cod_medico}`} className={styles.resumenRow}>
        <td colSpan={14}>
          <div className={styles.resumenContent}>
            <span className={styles.resumenLabel}>
              RESUMEN: Socio {grupo.cod_medico} {grupo.nombre ?? ""}
            </span>
            <span className={styles.resumenBadge}>Prácticas: {cantPracticas}</span>
            <span className={styles.resumenBadge}>Consultas: {cantConsultas}</span>
            <span className={styles.resumenBadge}>Honorarios: {cantHonorarios}</span>
            <span className={styles.resumenMoney}>
              Honorarios del socio: <strong>{formatMoney(grupo.total_honorarios)}</strong>
            </span>
            <span className={styles.resumenMoney}>
              Gastos del socio: <strong>{formatMoney(grupo.total_gastos)}</strong>
            </span>
            <div className={styles.resumenActions}>
              <button
                type="button"
                className={styles.resumenActionBtn}
                disabled={grupoBusy}
                onClick={() => handleMarcarTodos(grupo)}
              >
                Marcar todos
              </button>
              <button
                type="button"
                className={styles.resumenActionBtn}
                disabled={grupoBusy}
                onClick={() => handleDesmarcarTodos(grupo)}
              >
                Desmarcar todos
              </button>
              {!esComplemento && (
                <>
                  <button
                    type="button"
                    className={styles.resumenActionBtn}
                    disabled={grupoBusy}
                    onClick={() => handleMoverGrupo(grupo, "siguiente")}
                  >
                    <ArrowRightCircle size={12} /> Siguiente período todos
                  </button>
                  <button
                    type="button"
                    className={styles.resumenActionBtn}
                    disabled={grupoBusy}
                    onClick={() => handleMoverGrupo(grupo, "anterior")}
                  >
                    <ArrowLeftCircle size={12} /> Anterior período todos
                  </button>
                </>
              )}
            </div>
            <span className={styles.resumenTotalBadge}>Total: {formatMoney(grupo.total_subtotal)}</span>
          </div>
        </td>
      </tr>
    );
  };

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
            <thead>
              <tr>
                <th>ID</th>
                <th>Socio</th>
                <th>Autorización</th>
                <th>Fecha</th>
                <th>Código</th>
                <th>Nro Afiliado</th>
                <th>Cantidad</th>
                <th>%</th>
                <th>Honorarios</th>
                <th>Gastos</th>
                <th>TP</th>
                <th>Sub total</th>
                <th>Tipo</th>
                <th className={styles.thActions}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={14} className={styles.loadingCell}>Cargando…</td></tr>
              )}
              {!loading && error && (
                <tr><td colSpan={14} className={styles.emptyCell}>{error}</td></tr>
              )}
              {!loading && !error && detalle && detalle.total_prestaciones === 0 && (
                <tr><td colSpan={14} className={styles.emptyCell}>Esta factura no tiene prestaciones.</td></tr>
              )}
              {!loading && !error && detalle && gruposOrdenados.map((grupo) => (
                <React.Fragment key={grupo.cod_medico}>
                  {grupo.prestaciones.map((p) => renderDataRow(p, grupo))}
                  {renderResumenRow(grupo)}
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

      {pendingAction?.type === "moverGrupo" && (() => {
        const movibles = pendingAction.grupo.prestaciones.filter((p) => p.estado === "A").length;
        const label = pendingAction.direccion === "siguiente" ? "período siguiente" : "período anterior";
        return (
          <ConfirmActionModal
            isOpen
            icon={pendingAction.direccion === "siguiente" ? ArrowRightCircle : ArrowLeftCircle}
            variant="primary"
            title={pendingAction.direccion === "siguiente" ? "Mover al período siguiente" : "Mover al período anterior"}
            message={
              <>¿Mover <strong>{movibles}</strong> prestación{movibles !== 1 ? "es" : ""} de{" "}
                <strong>{pendingAction.grupo.nombre ?? pendingAction.grupo.cod_medico}</strong> al <strong>{label}</strong>?</>
            }
            confirmLabel="Mover todos"
            onClose={() => setPendingAction(null)}
            onConfirm={handleConfirmPending}
            loading={busyGroups.has(pendingAction.grupo.cod_medico)}
          />
        );
      })()}
    </div>
  );
};

export default FacturaDetalle;
