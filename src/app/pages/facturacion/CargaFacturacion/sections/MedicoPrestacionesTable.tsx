import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Pencil, ArrowRightCircle, ArrowLeftCircle, Trash2 } from "lucide-react";

import { useAppSnackbar } from "../../../../hooks/useAppSnackbar";
import { listarPrestaciones, anularPrestacion, marcarRevisado, moverPeriodo } from "../../api";
import type { PrestacionRead, Tipo } from "../../types";
import { detailMessage } from "../../types";
import { formatMoney, parseMoney } from "../../money";
import ConfirmActionModal from "../../components/ConfirmActionModal";
import styles from "./MedicoPrestacionesTable.module.scss";

const LIMIT = 10;

type TipoPrestador = "Medico" | "Ayudante" | "Gastos" | null;

type PendingAction =
  | { type: "eliminar"; row: PrestacionRead }
  | { type: "mover"; row: PrestacionRead; direccion: "siguiente" | "anterior" };

interface Props {
  codMedico: string | null;
  medicoNombre?: string | null;
  medicoMatricula?: string | number | null;
  codObra?: string | null;
  periodo?: string | null;
  /** Cambiarlo fuerza un refetch — el padre lo incrementa al guardar. */
  refreshKey?: number;
}

const fmtFecha = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

// El listado plano no trae `tipo_prestador` (eso solo lo devuelve el detalle de
// factura agrupado) — lo derivamos con la misma prioridad documentada: ayudante>0 →
// honorarios>0 (Medico) → gastos>0 (Gastos).
const deriveTipoPrestador = (row: PrestacionRead): TipoPrestador => {
  if (parseMoney(row.ayudante) > 0) return "Ayudante";
  if (parseMoney(row.honorarios) > 0) return "Medico";
  if (parseMoney(row.gastos) > 0) return "Gastos";
  return null;
};

const tipoPrestadorClass = (t: TipoPrestador): string => {
  switch (t) {
    case "Medico":   return styles.tipoPrestadorMedico;
    case "Ayudante": return styles.tipoPrestadorAyudante;
    case "Gastos":   return styles.tipoPrestadorGastos;
    default:         return "";
  }
};

const tipoClass = (t: Tipo | null | undefined): string => {
  switch (t) {
    case "Consulta":               return styles.tipoConsulta;
    case "Practica":               return styles.tipoPractica;
    case "Honorarios individuales": return styles.tipoHonorarios;
    case "Sanatorio":              return styles.tipoSanatorio;
    default:                       return "";
  }
};

const MedicoPrestacionesTable: React.FC<Props> = ({ codMedico, medicoNombre, medicoMatricula, codObra, periodo, refreshKey }) => {
  const navigate = useNavigate();
  const notify = useAppSnackbar();

  const [rows, setRows] = useState<PrestacionRead[]>([]);
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  // Cambió el médico, la obra social o el período → volvemos a la primera página.
  useEffect(() => { setOffset(0); }, [codMedico, codObra, periodo]);

  const fetchData = useCallback(async () => {
    if (!codMedico) { setRows([]); setTotalCount(undefined); return; }
    setLoading(true);
    try {
      const { data, totalCount: tc } = await listarPrestaciones({
        cod_medico: codMedico,
        cod_obra: codObra ?? undefined,
        periodo: periodo ?? undefined,
        limit: LIMIT,
        offset,
      });
      setRows(data);
      setTotalCount(tc);
    } catch (e: any) {
      notify(detailMessage(e?.response?.data?.detail) || "Error al cargar las prestaciones del médico.", "error");
    } finally {
      setLoading(false);
    }
  }, [codMedico, codObra, periodo, offset, notify]);

  // `refreshKey` no se lee acá dentro: es un disparador explícito del padre para
  // volver a pedir el listado después de guardar.
  useEffect(() => { fetchData(); }, [fetchData, refreshKey]);

  const withBusy = async (id: number, fn: () => Promise<void>) => {
    setBusyIds((prev) => new Set(prev).add(id));
    try {
      await fn();
    } finally {
      setBusyIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  if (!codMedico) return null;

  const handleToggleRevisado = (row: PrestacionRead) => {
    const nextValue = !row.revisado;
    setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, revisado: nextValue } : r));
    withBusy(row.id, async () => {
      try {
        await marcarRevisado(nextValue ? { marcados: [row.id] } : { desmarcados: [row.id] });
      } catch {
        setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, revisado: !nextValue } : r));
        notify("No se pudo actualizar el estado de auditoría.", "error");
      }
    });
  };

  const handleEditar = (row: PrestacionRead) => {
    navigate(`/panel/facturacion/carga/${row.id}`);
  };

  const handleEliminar = (row: PrestacionRead) => setPendingAction({ type: "eliminar", row });

  const handleMoverPeriodo = (row: PrestacionRead, direccion: "siguiente" | "anterior") =>
    setPendingAction({ type: "mover", row, direccion });

  const executeEliminar = (row: PrestacionRead, onSuccess: () => void) =>
    withBusy(row.id, async () => {
      try {
        await anularPrestacion(row.id);
        notify("Prestación anulada.");
        fetchData();
        onSuccess();
      } catch (e: any) {
        const status = e?.response?.status;
        if (status === 403) {
          notify("Solo podés anular tus propias prestaciones.", "error");
        } else {
          notify(detailMessage(e?.response?.data?.detail) || "No se pudo anular.", "error");
        }
      }
    });

  const executeMover = (row: PrestacionRead, direccion: "siguiente" | "anterior", onSuccess: () => void) =>
    withBusy(row.id, async () => {
      try {
        if (!row.cod_obra_social) {
          notify("La prestación no tiene obra social — no se puede mover.", "error");
          return;
        }
        const result = await moverPeriodo({
          cod_obra: row.cod_obra_social,
          periodo_origen: row.periodo,
          ids: [row.id],
          direccion,
        });
        notify(`Prestación movida al período ${result.periodo_destino}.`);
        fetchData();
        onSuccess();
      } catch (e: any) {
        const detail = e?.response?.data?.detail;
        const msg = typeof detail === "string" ? detail : detail?.mensaje ?? "No se pudo mover la prestación.";
        notify(msg, "error");
      }
    });

  const handleConfirmPending = () => {
    if (!pendingAction) return;
    if (pendingAction.type === "eliminar") {
      executeEliminar(pendingAction.row, () => setPendingAction(null));
    } else {
      executeMover(pendingAction.row, pendingAction.direccion, () => setPendingAction(null));
    }
  };

  const page = Math.floor(offset / LIMIT) + 1;
  const totalPages = totalCount !== undefined ? Math.max(1, Math.ceil(totalCount / LIMIT)) : undefined;

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.headerIcon}>
          <ClipboardList size={18} />
        </span>
        <div>
          <h2 className={styles.title}>Listado de prestaciones</h2>
          {/* Se nombra al médico en vez de decir "el seleccionado": tras guardar la
              tabla sigue mostrándolo aunque el formulario ya lo haya limpiado. */}
          <p className={styles.subtitle}>
            Prestaciones de {medicoNombre ? `${codMedico} · ${medicoNombre}` : `el socio ${codMedico}`}
            {codObra && ` · obra social ${codObra}`}
            {periodo && ` · período ${periodo}`}
            .
          </p>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.tableWrap}>
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
              {!loading && rows.length === 0 && (
                <tr><td colSpan={14} className={styles.emptyCell}>Este médico no tiene prestaciones cargadas.</td></tr>
              )}
              {!loading && rows.map((row) => {
                const editable = row.estado === "A";
                const busy = busyIds.has(row.id);
                const tipoPrestador = deriveTipoPrestador(row);
                return (
                  <tr
                    key={row.id}
                    className={`${styles.dataRow} ${row.revisado ? styles.rowRevisada : ""} ${row.estado === "X" ? styles.rowAnulada : ""}`}
                  >
                    <td className={styles.idCell}>{row.id}</td>
                    <td>
                      <div className={styles.socioCell}>
                        <span className={styles.socioNro}>
                          {row.cod_medico}
                          {medicoMatricula != null && <span className={styles.socioMatricula}> - {medicoMatricula}</span>}
                        </span>
                        <span className={styles.socioNombre}>{medicoNombre ?? "—"}</span>
                      </div>
                    </td>
                    <td>{row.autorizacion || <span className={styles.mutedText}>—</span>}</td>
                    <td>{fmtFecha(row.fecha_practica)}</td>
                    <td><span className={styles.codeCell}>{row.cod_nomenclador ?? "—"}</span></td>
                    <td>{row.dni_paciente || <span className={styles.mutedText}>—</span>}</td>
                    <td>
                      <div className={styles.cantidadCell}>
                        <span className={styles.cantidadMain}>Cant. {row.cantidad ?? "—"}</span>
                        <span className={styles.cantidadSub}>Sesión {row.sesion ?? "—"}</span>
                      </div>
                    </td>
                    <td>{row.porcentaje != null ? `${row.porcentaje}%` : "—"}</td>
                    <td><span className={styles.moneyCell}>{formatMoney(row.honorarios)}</span></td>
                    <td><span className={styles.moneyCell}>{formatMoney(row.gastos)}</span></td>
                    <td>
                      {tipoPrestador ? (
                        <span className={`${styles.tipoPrestadorBadge} ${tipoPrestadorClass(tipoPrestador)}`}>
                          {tipoPrestador}
                        </span>
                      ) : <span className={styles.mutedText}>—</span>}
                    </td>
                    <td><span className={styles.subtotalCell}>{formatMoney(row.importe_total)}</span></td>
                    <td>
                      {row.tipo ? (
                        <span className={`${styles.tipoBadge} ${tipoClass(row.tipo)}`}>{row.tipo}</span>
                      ) : <span className={styles.mutedText}>—</span>}
                    </td>
                    <td>
                      <div className={styles.actionsCell}>
                        <span className={`${styles.auditCheckboxWrap} ${row.revisado ? styles.auditCheckboxOn : ""}`}>
                          <input
                            type="checkbox"
                            className={styles.auditCheckbox}
                            checked={!!row.revisado}
                            onChange={() => handleToggleRevisado(row)}
                            title="Marcar como auditado"
                          />
                        </span>
                        <button
                          type="button"
                          className={`${styles.iconBtn} ${styles.iconBtnEdit}`}
                          title="Editar"
                          disabled={!editable || busy}
                          onClick={() => handleEditar(row)}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.iconBtn} ${styles.iconBtnMove}`}
                          title="Mover al período anterior"
                          disabled={!editable || busy}
                          onClick={() => handleMoverPeriodo(row, "anterior")}
                        >
                          <ArrowLeftCircle size={14} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.iconBtn} ${styles.iconBtnMove}`}
                          title="Mover al período siguiente"
                          disabled={!editable || busy}
                          onClick={() => handleMoverPeriodo(row, "siguiente")}
                        >
                          <ArrowRightCircle size={14} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.iconBtn} ${styles.iconBtnDelete}`}
                          title="Eliminar"
                          disabled={!editable || busy}
                          onClick={() => handleEliminar(row)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className={styles.pagination}>
          <span className={styles.pageInfo}>
            {totalCount !== undefined ? `${totalCount} prestación${totalCount !== 1 ? "es" : ""}` : "—"}
          </span>
          <div className={styles.pageBtns}>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={offset === 0 || loading}
              onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}
            >
              ◀ Anterior
            </button>
            <span className={styles.pageInfo}>
              Página {page}{totalPages ? ` / ${totalPages}` : ""}
            </span>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={(totalCount !== undefined && offset + LIMIT >= totalCount) || rows.length < LIMIT || loading}
              onClick={() => setOffset((o) => o + LIMIT)}
            >
              Siguiente ▶
            </button>
          </div>
        </div>
      </div>

      {pendingAction?.type === "eliminar" && (
        <ConfirmActionModal
          isOpen
          icon={Trash2}
          variant="danger"
          title="Eliminar prestación"
          message={
            <>El ID Nº <strong>{pendingAction.row.id}</strong> — ¿confirmás anular esta prestación?</>
          }
          warning="Esta acción anula la prestación y no se puede deshacer."
          confirmLabel="Eliminar"
          onClose={() => setPendingAction(null)}
          onConfirm={handleConfirmPending}
          loading={busyIds.has(pendingAction.row.id)}
        />
      )}

      {pendingAction?.type === "mover" && (
        <ConfirmActionModal
          isOpen
          icon={pendingAction.direccion === "siguiente" ? ArrowRightCircle : ArrowLeftCircle}
          variant="primary"
          title={pendingAction.direccion === "siguiente" ? "Mover al período siguiente" : "Mover al período anterior"}
          message={
            <>El ID Nº <strong>{pendingAction.row.id}</strong> — ¿confirmás moverla al{" "}
              <strong>{pendingAction.direccion === "siguiente" ? "período siguiente" : "período anterior"}</strong>?</>
          }
          confirmLabel="Mover"
          onClose={() => setPendingAction(null)}
          onConfirm={handleConfirmPending}
          loading={busyIds.has(pendingAction.row.id)}
        />
      )}
    </div>
  );
};

export default MedicoPrestacionesTable;
