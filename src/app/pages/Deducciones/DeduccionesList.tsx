import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSnackbar } from "../../hooks/useAppSnackbar";
import { motion } from "framer-motion";
import {
  Download,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import Button from "../../components/atoms/Button/Button";
import Card from "../../components/atoms/Card/Card";
import AppSearchSelect, {
  type AppSearchSelectOption,
} from "../../components/atoms/AppSearchSelect/AppSearchSelect";
import SelectableTable from "../../components/molecules/SelectableTable/SelectableTable";
import type { ActionDef, ColumnDef } from "../../components/molecules/SelectableTable/types";
import {
  deleteDeduccion,
  fetchDeduccion,
  fetchDeduccionesHistorial,
  fetchDeduccionesHistorialExport,
  fetchDescuentos,
  fetchMedicos,
  fetchOpenPago,
  pagarEnCaja,
  updateDeduccionEstado,
  updateDeduccionMonto,
} from "./api";
import type {
  DeduccionEstado,
  DeduccionHistorialItem,
  DescuentoOption,
  MedicoOption,
} from "./types";
import { formatMoney, monthLabel } from "./types";
import styles from "./DeduccionesList.module.scss";

const PAGE_SIZE = 50;
const ESTADOS_UI: Array<{ value: DeduccionEstado | ""; label: string }> = [
  { value: "", label: "Todos" },
  { value: "pendiente", label: "Pendiente" },
  { value: "en_pago", label: "En pago" },
  { value: "aplicado", label: "Aplicado" },
];

const ESTADO_LABEL: Record<DeduccionEstado, string> = {
  pendiente: "Pendiente",
  vencida: "Vencida",
  en_pago: "En pago",
  aplicado: "Aplicado",
  eliminado: "Eliminado",
};

const statusClass = (status: DeduccionEstado) => {
  if (status === "pendiente") return styles.badgePendiente;
  if (status === "vencida") return styles.badgeVencida;
  if (status === "en_pago") return styles.badgeEnPago;
  if (status === "aplicado") return styles.badgeAplicado;
  return styles.badgeEliminado;
};

const getErrorMessage = (e: any, fallback: string) => {
  const detail = e?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (typeof detail?.message === "string" && detail.message.trim())
    return detail.message;
  return e?.message ?? fallback;
};

const DeduccionesList: React.FC = () => {
  const navigate = useNavigate();
  const notify = useAppSnackbar();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<DeduccionHistorialItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [estado, setEstado] = useState<DeduccionEstado | "">("");
  const [medicoId, setMedicoId] = useState<number | null>(null);
  const [conceptoId, setConceptoId] = useState<number | null>(null);
  const [desde, setDesde] = useState<Date | null>(null);
  const [hasta, setHasta] = useState<Date | null>(null);

  const [medicos, setMedicos] = useState<MedicoOption[]>([]);
  const [medicosLoading, setMedicosLoading] = useState(false);
  const [descuentos, setDescuentos] = useState<DescuentoOption[]>([]);

  const [hasOpenPago, setHasOpenPago] = useState(false);
  const [workingId, setWorkingId] = useState<number | null>(null);

  const [editTarget, setEditTarget] = useState<DeduccionHistorialItem | null>(null);
  const [editMonto, setEditMonto] = useState("");
  const [editPagaPorCaja, setEditPagaPorCaja] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<DeduccionHistorialItem | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const descuentoMap = useMemo(() => {
    const map = new Map<number, string>();
    descuentos.forEach((d) => map.set(d.id, d.nombre));
    return map;
  }, [descuentos]);

  const medicoOptions = useMemo<AppSearchSelectOption[]>(
    () =>
      medicos.map((m) => ({
        id: m.id,
        label: m.nombre,
        subtitle: m.nro_socio ? `#${m.nro_socio}` : undefined,
      })),
    [medicos],
  );
  const descuentoOptions = useMemo<AppSearchSelectOption[]>(
    () =>
      descuentos.map((d) => ({
        id: d.id,
        label: d.nro_colegio ? `${d.nro_colegio} - ${d.nombre}` : d.nombre,
      })),
    [descuentos],
  );

  const filteredItems = useMemo(() => {
    if (!conceptoId) return items;
    return items.filter((row) => row.descuento_id === conceptoId);
  }, [items, conceptoId]);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDeduccionesHistorial({
        page,
        size: PAGE_SIZE,
        medico_id: medicoId ?? undefined,
        estado,
        mes_desde: desde ? desde.getMonth() + 1 : undefined,
        anio_desde: desde ? desde.getFullYear() : undefined,
        mes_hasta: hasta ? hasta.getMonth() + 1 : undefined,
        anio_hasta: hasta ? hasta.getFullYear() : undefined,
      });
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(Number(data.total ?? 0));
    } catch (e: any) {
      setError(getErrorMessage(e, "No se pudieron cargar las deducciones."));
    } finally {
      setLoading(false);
    }
  }, [estado, medicoId, page, desde, hasta]);

  const loadMeta = useCallback(async () => {
    try {
      const [descuentosRows, openPago] = await Promise.all([
        fetchDescuentos(),
        fetchOpenPago(),
      ]);
      setDescuentos(descuentosRows);
      setHasOpenPago(Boolean(openPago));
    } catch {
      // Silencioso: no bloquea la pantalla principal.
    }
  }, []);

  useEffect(() => { void loadMeta(); }, [loadMeta]);
  useEffect(() => { void loadPage(); }, [loadPage]);

  const searchMedicos = async (query: string) => {
    setMedicosLoading(true);
    try {
      const rows = await fetchMedicos(query);
      setMedicos(rows);
    } finally {
      setMedicosLoading(false);
    }
  };

  useEffect(() => { void searchMedicos(""); }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadPage(), loadMeta()]);
  }, [loadPage, loadMeta]);

  const refreshRow = useCallback(async (id: number) => {
    try {
      const updated = await fetchDeduccion(id);
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
    } catch (e: any) {
      if (e?.response?.status === 404) {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }
    }
  }, []);

  const setPageSafe = (next: number) => {
    setPage(Math.min(Math.max(1, next), lastPage));
  };

  const onChangeEstado =
    (id: number, next: "en_pago" | "pendiente" | "aplicado") =>
    async () => {
      setWorkingId(id);
      try {
        await updateDeduccionEstado(id, next);
        await refreshRow(id);
        notify("Estado actualizado correctamente.");
      } catch (e: any) {
        notify(getErrorMessage(e, "No se pudo actualizar el estado."), "error");
      } finally {
        setWorkingId(null);
      }
    };

  const onPagarEnCaja = (id: number) => async () => {
    setWorkingId(id);
    try {
      await pagarEnCaja(id);
      await refreshRow(id);
      notify("Pago en caja registrado correctamente.");
    } catch (e: any) {
      notify(getErrorMessage(e, "No se pudo registrar el pago en caja."), "error");
    } finally {
      setWorkingId(null);
    }
  };

  const onDelete = (row: DeduccionHistorialItem) => () => {
    setCancelError(null);
    setCancelTarget(row);
  };

  const confirmDelete = async () => {
    if (!cancelTarget) return;
    setCancelError(null);
    setWorkingId(cancelTarget.id);
    try {
      const targetId = cancelTarget.id;
      await deleteDeduccion(targetId);
      setCancelTarget(null);
      await refreshRow(targetId);
      notify("Deducción eliminada.");
    } catch (e: any) {
      setCancelError(
        getErrorMessage(e, "No se pudo eliminar la deducción."),
      );
    } finally {
      setWorkingId(null);
    }
  };

  const openEdit = (row: DeduccionHistorialItem) => {
    setEditTarget(row);
    setEditMonto(String(Number(row.monto ?? 0)));
    setEditPagaPorCaja(row.paga_por_caja);
  };

  const saveEditMonto = async () => {
    if (!editTarget) return;
    const parsed = Number(String(editMonto).replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      notify("El monto debe ser mayor a 0.", "error");
      return;
    }
    setWorkingId(editTarget.id);
    try {
      const targetId = editTarget.id;
      await updateDeduccionMonto(targetId, parsed, editPagaPorCaja);
      setEditTarget(null);
      await refreshRow(targetId);
      notify("Deducción actualizada correctamente.");
    } catch (e: any) {
      notify(getErrorMessage(e, "No se pudo editar el monto."), "error");
    } finally {
      setWorkingId(null);
    }
  };

  const buildExportParams = () => ({
    medico_id: medicoId ?? undefined,
    estado: estado || undefined,
    mes_desde: desde ? desde.getMonth() + 1 : undefined,
    anio_desde: desde ? desde.getFullYear() : undefined,
    mes_hasta: hasta ? hasta.getMonth() + 1 : undefined,
    anio_hasta: hasta ? hasta.getFullYear() : undefined,
  });

  const exportExcel = async () => {
    try {
      const data = await fetchDeduccionesHistorialExport(buildExportParams());
      const rows = data.map((row) => ({
        Medico: row.medico_nombre,
        Concepto: row.descuento_nombre,
        Monto: Number(row.monto ?? 0),
        Periodo: monthLabel(row.mes_periodo, row.anio_periodo),
        Cuota:
          row.origen === "manual"
            ? `${row.cuota_nro}/${row.cuotas_total ?? "—"}`
            : "",
        Estado: row.estado,
        Origen: row.origen,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Deducciones");
      XLSX.writeFile(wb, "deducciones.xlsx");
    } catch (e: any) {
      notify(getErrorMessage(e, "No se pudo exportar a Excel."), "error");
    }
  };

  const exportPdf = async () => {
    try {
      const data = await fetchDeduccionesHistorialExport(buildExportParams());
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      doc.setFontSize(14);
      doc.text("Deducciones", 40, 32);
      autoTable(doc, {
        startY: 48,
        head: [["Médico", "Concepto", "Monto", "Período", "Cuota", "Estado", "Origen"]],
        body: data.map((row) => [
          row.medico_nombre,
          row.descuento_nombre,
          formatMoney(row.monto),
          monthLabel(row.mes_periodo, row.anio_periodo),
          row.origen === "manual"
            ? `${row.cuota_nro}/${row.cuotas_total ?? "—"}`
            : "",
          row.estado,
          row.origen,
        ]),
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [27, 86, 255], textColor: 255 },
      });
      doc.save("deducciones.pdf");
    } catch (e: any) {
      notify(getErrorMessage(e, "No se pudo exportar a PDF."), "error");
    }
  };

  // ── Columnas de la tabla ────────────────────────────────────────────
  const columns: ColumnDef<DeduccionHistorialItem>[] = [
    { key: "medico_nombre",    header: "Médico" },
    { key: "descuento_nombre", header: "Concepto" },
    {
      key: "monto",
      header: "Monto",
      alignRight: true,
      render: (r) => formatMoney(r.monto),
    },
    {
      key: "periodo",
      header: "Período",
      render: (r) => monthLabel(r.mes_periodo, r.anio_periodo),
    },
    {
      key: "cuota",
      header: "Cuota",
      render: (r) =>
        r.origen === "manual"
          ? `${r.cuota_nro}/${r.cuotas_total ?? "—"}`
          : "—",
    },
    {
      key: "estado",
      header: "Estado",
      render: (r) => (
        <span className={`${styles.badge} ${statusClass(r.estado)}`}>
          {ESTADO_LABEL[r.estado]}
        </span>
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      render: (row) => {
        const isWorking = workingId === row.id;
        if (isWorking) {
          return (
            <div className={styles.rowActions}>
              <Loader2 size={14} className={styles.spin} />
            </div>
          );
        }
        const isPendiente = row.estado === "pendiente" || row.estado === "vencida";
        return (
          <div className={styles.rowActions} onClick={(e) => e.stopPropagation()}>
            {isPendiente && (
              <>
                <button disabled={isWorking} onClick={onChangeEstado(row.id, "en_pago")}>
                  {isWorking ? "..." : "Agregar al pago"}
                </button>
                <button disabled={isWorking} onClick={onPagarEnCaja(row.id)}>
                  {isWorking ? "..." : "Pagar en caja"}
                </button>
                <button disabled={isWorking} onClick={() => openEdit(row)} title="Editar monto">
                  <Pencil size={14} />
                </button>
                <button disabled={isWorking} onClick={onDelete(row)} title="Eliminar">
                  <Trash2 size={14} />
                </button>
              </>
            )}
            {row.estado === "en_pago" && (
              <>
                <button disabled={isWorking} onClick={onChangeEstado(row.id, "pendiente")}>
                  {isWorking ? "..." : "Quitar del pago"}
                </button>
                <button disabled={isWorking} onClick={() => openEdit(row)} title="Editar monto">
                  <Pencil size={14} />
                </button>
                <button disabled={isWorking} onClick={onDelete(row)} title="Eliminar">
                  <Trash2 size={14} />
                </button>
              </>
            )}
            {row.estado === "aplicado" && (
              <>
                <button
                  disabled={isWorking}
                  onClick={onChangeEstado(row.id, "pendiente")}
                  title="Cancelar"
                >
                  <XCircle size={14} />
                </button>
                <button disabled={isWorking} onClick={onDelete(row)} title="Eliminar">
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  // ── Acciones bulk ───────────────────────────────────────────────────
  const bulkActions: ActionDef<DeduccionHistorialItem>[] = [
    {
      label: "Quitar del pago",
      method: "PATCH",
      endpoint: (r) => `/api/deducciones/${r.id}`,
      payload: () => ({ estado: "pendiente" }),
      restrictions: [
        {
          message: 'Todas las seleccionadas deben tener estado "En pago".',
          isAllowed: (rows) => rows.every((r) => r.estado === "en_pago"),
        },
      ],
      confirmMessage: (n) =>
        `¿Quitar ${n} deducción${n !== 1 ? "es" : ""} del pago? Volverán a estado pendiente.`,
      onSuccess: (ok, fail) => {
        notify(
          `${ok} deducción${ok !== 1 ? "es" : ""} quitada${ok !== 1 ? "s" : ""} del pago${fail ? `, ${fail} fallaron` : ""}.`,
        );
        void refreshAll();
      },
    },
    {
      label: "Agregar al pago",
      method: "PATCH",
      endpoint: (r) => `/api/deducciones/${r.id}`,
      payload: () => ({ estado: "en_pago" }),
      restrictions: [
        {
          message: 'Todas las seleccionadas deben tener estado "Pendiente" o "Vencida".',
          isAllowed: (rows) =>
            rows.every((r) => r.estado === "pendiente" || r.estado === "vencida"),
        },
        {
          message: "No hay un pago abierto al que agregar deducciones.",
          isAllowed: () => hasOpenPago,
        },
      ],
      confirmMessage: (n) =>
        `¿Agregar ${n} deducción${n !== 1 ? "es" : ""} al pago activo?`,
      onSuccess: (ok, fail) => {
        notify(
          `${ok} deducción${ok !== 1 ? "es" : ""} agregada${ok !== 1 ? "s" : ""} al pago${fail ? `, ${fail} fallaron` : ""}.`,
        );
        void refreshAll();
      },
    },
    {
      label: "Eliminar",
      method: "DELETE",
      endpoint: (r) => `/api/deducciones/${r.id}`,
      restrictions: [
        {
          message: 'No se pueden eliminar deducciones ya eliminadas.',
          isAllowed: (rows) => rows.every((r) => r.estado !== "eliminado"),
        },
      ],
      confirmMessage: (n) =>
        `¿Eliminar ${n} deducción${n !== 1 ? "es" : ""}? Esta acción no se puede deshacer.`,
      onSuccess: (ok, fail) => {
        notify(
          `${ok} eliminada${ok !== 1 ? "s" : ""}${fail ? `, ${fail} fallaron` : ""}.`,
        );
        void refreshAll();
      },
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className={styles.header}>
            <div>
              <h1>Deducciones</h1>
            </div>
            <div className={styles.headerActions}>
              <Button variant="secondary" leftIcon={<FileText size={14} />} onClick={exportPdf}>
                PDF
              </Button>
              <Button variant="secondary" leftIcon={<Download size={14} />} onClick={exportExcel}>
                Excel
              </Button>
              <Button
                variant="primary"
                onClick={() => navigate("/panel/deducciones/nueva")}
                leftIcon={<Plus size={16} />}
              >
                Nueva deducción
              </Button>
            </div>
          </div>

          {error && <div className={styles.errorBanner}>{error}</div>}

          <div className={styles.layout}>
            <section className={styles.mainPanel}>
              <Card className={styles.filtersCard}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <div className={styles.filtersRow}>
                    <div className={styles.filterGroup}>
                      <label>Médico</label>
                      <AppSearchSelect
                        options={medicoOptions}
                        value={medicoId}
                        onChange={(id) => { setMedicoId(id as number | null); setPage(1); }}
                        onQueryChange={searchMedicos}
                        loading={medicosLoading}
                      />
                    </div>
                    <div className={styles.filterGroup}>
                      <label>Estado</label>
                      <select
                        value={estado}
                        onChange={(e) => { setEstado(e.target.value as DeduccionEstado | ""); setPage(1); }}
                      >
                        {ESTADOS_UI.map((opt) => (
                          <option key={opt.value || "all"} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.filterGroup}>
                      <label>Concepto</label>
                      <AppSearchSelect
                        options={descuentoOptions}
                        value={conceptoId}
                        onChange={(id) => setConceptoId(id as number | null)}
                      />
                    </div>
                    <div className={styles.filterGroup}>
                      <label>Desde</label>
                      <DatePicker
                        label="MM/YYYY"
                        views={["month", "year"]}
                        openTo="month"
                        value={desde}
                        onChange={(val) => { setDesde(val); setPage(1); }}
                        slotProps={{
                          textField: {
                            size: "small",
                            sx: { "& .MuiInputBase-root": { height: 37, fontSize: 13 } },
                          },
                        }}
                      />
                    </div>
                    <div className={styles.filterGroup}>
                      <label>Hasta</label>
                      <DatePicker
                        label="MM/YYYY"
                        views={["month", "year"]}
                        openTo="month"
                        value={hasta}
                        onChange={(val) => { setHasta(val); setPage(1); }}
                        slotProps={{
                          textField: {
                            size: "small",
                            sx: { "& .MuiInputBase-root": { height: 37, fontSize: 13 } },
                          },
                        }}
                      />
                    </div>
                  </div>
                </LocalizationProvider>
              </Card>

              <Card className={styles.tableCard}>
                {loading ? (
                  <div className={styles.loadingState}>
                    <Loader2 size={18} className={styles.spin} /> Cargando deducciones...
                  </div>
                ) : (
                  <SelectableTable
                    rows={filteredItems}
                    columns={columns}
                    actions={bulkActions}
                    isSelectable={(r) => r.estado !== "eliminado"}
                    rowClassName={(r) => workingId === r.id ? styles.rowLoading : undefined}
                    emptyMessage="Sin deducciones para los filtros actuales."
                    onActionComplete={refreshAll}
                  />
                )}
              </Card>
            </section>
          </div>
        </motion.div>
      </div>

      <div className={styles.paginationBar}>
        <button onClick={() => setPageSafe(page - 1)} disabled={page <= 1 || loading}>
          ← Anterior
        </button>
        <span>Página {page} de {lastPage}</span>
        <button onClick={() => setPageSafe(page + 1)} disabled={page >= lastPage || loading}>
          Siguiente →
        </button>
      </div>

      {/* Modal editar monto */}
      {editTarget && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3>Editar deducción</h3>
              <button onClick={() => setEditTarget(null)} aria-label="Cerrar">✕</button>
            </div>
            <div className={styles.modalBody}>
              <p>Deducción #{editTarget.id} · {editTarget.descuento_nombre}</p>
              <label>Monto</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={editMonto}
                onChange={(e) => setEditMonto(e.target.value)}
              />
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={editPagaPorCaja}
                  onChange={(e) => setEditPagaPorCaja(e.target.checked)}
                />
                Abona por caja
              </label>
            </div>
            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={() => setEditTarget(null)} disabled={workingId === editTarget.id}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={saveEditMonto} disabled={workingId === editTarget.id}>
                Guardar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminación individual */}
      {cancelTarget && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3>
                {cancelTarget.origen === "automatico"
                  ? "Eliminar deducción"
                  : "Cancelar deducción"}
              </h3>
              <button
                onClick={() => setCancelTarget(null)}
                aria-label="Cerrar"
                disabled={workingId === cancelTarget.id}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <p>
                ¿Confirmás{" "}
                {cancelTarget.origen === "automatico" ? "eliminar" : "cancelar"}{" "}
                la deducción <strong>#{cancelTarget.id}</strong>?
              </p>
              <p>
                <strong>Médico:</strong> {cancelTarget.medico_nombre}<br />
                <strong>Concepto:</strong> {cancelTarget.descuento_nombre}<br />
                <strong>Monto:</strong> {formatMoney(cancelTarget.monto)}<br />
                <strong>Período:</strong>{" "}
                {monthLabel(cancelTarget.mes_periodo, cancelTarget.anio_periodo)}
              </p>
              {cancelError && (
                <div className={styles.errorInline}>{cancelError}</div>
              )}
            </div>
            <div className={styles.modalActions}>
              <Button
                variant="secondary"
                onClick={() => setCancelTarget(null)}
                disabled={workingId === cancelTarget.id}
              >
                Volver
              </Button>
              <Button
                variant="danger"
                onClick={confirmDelete}
                disabled={workingId === cancelTarget.id}
              >
                {workingId === cancelTarget.id
                  ? "Procesando…"
                  : cancelTarget.origen === "automatico"
                    ? "Eliminar"
                    : "Cancelar deducción"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeduccionesList;
