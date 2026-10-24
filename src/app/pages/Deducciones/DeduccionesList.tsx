import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSnackbar } from "../../hooks/useAppSnackbar";
import {
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Wallet,
  XCircle,
} from "lucide-react";
import SelectorMes from "@/app/components/ui/SelectorMes/SelectorMes";

import Button from "@/app/components/ui/Button/Button";
import Franja from "@/app/components/layout/Franja/Franja";
import Caja, { Cajas } from "@/app/components/ui/Caja/Caja";
import Dialogo, { DialogoAviso, DialogoCampo, DialogoDatos } from "@/app/components/ui/Dialogo/Dialogo";
import AppSearchSelect, {
  type AppSearchSelectOption,
} from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import SelectableTable from "@/app/components/ui/SelectableTable/SelectableTable";
import type { ActionDef, ColumnDef } from "@/app/components/ui/SelectableTable/types";
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
import lq from "@/app/pages/Pagos/Liquidacion.module.scss";
import BotonDescarga from "@/app/components/ui/BotonDescarga/BotonDescarga";
import { getErrorMessage } from "@/app/shared/lib/utiles";

const CONCEPTO_SALDO_DEUDOR = "Saldo deudor de débitos";

// En las deudas por débitos, `cuota_nro` guarda el pago de origen; no es un número de cuota.
const etiquetaCuota = (r: { descuento_nombre: string; cuota_nro: number; cuotas_total: number | null }) =>
  r.descuento_nombre === CONCEPTO_SALDO_DEUDOR
    ? `Pago #${r.cuota_nro}`
    : `${r.cuota_nro}/${r.cuotas_total ?? "—"}`;

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
  if (status === "pendiente") return lq.abierto;
  if (status === "vencida") return lq.anulado;
  if (status === "en_pago") return lq.enLiquidacion;
  if (status === "aplicado") return lq.aplicado;
  return lq.cerrado;
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
      const { downloadExcelSheet } = await import("@/app/shared/lib/excelExport");
      const data = await fetchDeduccionesHistorialExport(buildExportParams());
      const rows = data.map((row) => ({
        Medico: row.medico_nombre,
        Concepto: row.descuento_nombre,
        Monto: Number(row.monto ?? 0),
        Periodo: monthLabel(row.mes_periodo, row.anio_periodo),
        Cuota:
          row.origen === "manual"
            ? etiquetaCuota(row)
            : "",
        Estado: row.estado,
        Origen: row.origen,
      }));
      await downloadExcelSheet("deducciones.xlsx", "Deducciones", rows);
    } catch (e: any) {
      notify(getErrorMessage(e, "No se pudo exportar a Excel."), "error");
    }
  };

  const exportPdf = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
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
            ? etiquetaCuota(row)
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
      render: (r) => <span className={lq.monto}>{formatMoney(r.monto)}</span>,
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
          ? etiquetaCuota(r)
          : <span className={lq.tenue}>—</span>,
    },
    {
      key: "estado",
      header: "Estado",
      render: (r) => (
        <span className={`${lq.estado} ${statusClass(r.estado)}`}>
          {ESTADO_LABEL[r.estado]}
        </span>
      ),
    },
    {
      key: "acciones",
      header: "",
      render: (row) => {
        const isWorking = workingId === row.id;
        if (isWorking) {
          return (
            <div className={lq.accionesFila}>
              <Loader2 size={16} className={lq.gira} aria-label="Procesando" />
            </div>
          );
        }
        const isPendiente = row.estado === "pendiente" || row.estado === "vencida";
        const editar = (
          <button type="button" className={lq.botonIcono} onClick={() => openEdit(row)} title="Editar monto" aria-label="Editar monto">
            <Pencil size={16} />
          </button>
        );
        const eliminar = (
          <button type="button" className={lq.botonIconoPeligro} onClick={onDelete(row)} title="Eliminar" aria-label="Eliminar">
            <Trash2 size={16} />
          </button>
        );
        return (
          <div className={lq.accionesFila} onClick={(e) => e.stopPropagation()}>
            {isPendiente && (
              <>
                <button type="button" className={lq.accionTexto} onClick={onChangeEstado(row.id, "en_pago")}>
                  Agregar al pago
                </button>
                <button type="button" className={lq.accionTexto} onClick={onPagarEnCaja(row.id)}>
                  Pagar en caja
                </button>
                {editar}
                {eliminar}
              </>
            )}
            {row.estado === "en_pago" && (
              <>
                <button type="button" className={lq.accionTexto} onClick={onChangeEstado(row.id, "pendiente")}>
                  Quitar del pago
                </button>
                {editar}
                {eliminar}
              </>
            )}
            {row.estado === "aplicado" && (
              <>
                <button
                  type="button"
                  className={lq.botonIcono}
                  onClick={onChangeEstado(row.id, "pendiente")}
                  title="Cancelar"
                  aria-label="Cancelar"
                >
                  <XCircle size={16} />
                </button>
                {eliminar}
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

  const ocupadoEdit = editTarget ? workingId === editTarget.id : false;
  const ocupadoCancel = cancelTarget ? workingId === cancelTarget.id : false;

  return (
    <div className={lq.pagina}>
      <Franja titulo="Deducciones" icono={Wallet} />

      <Cajas>
        <Caja titulo="Configuración">
          <div className={lq.filtros}>
            <div className={`${lq.campo} ${lq.campoAncho}`}>
              <span className={lq.rotulo}>Médico</span>
              <AppSearchSelect
                options={medicoOptions}
                value={medicoId}
                onChange={(id) => { setMedicoId(id as number | null); setPage(1); }}
                onQueryChange={searchMedicos}
                loading={medicosLoading}
              />
            </div>
            <label className={lq.campo}>
              <span className={lq.rotulo}>Estado</span>
              <select
                className={lq.select}
                value={estado}
                onChange={(e) => { setEstado(e.target.value as DeduccionEstado | ""); setPage(1); }}
              >
                {ESTADOS_UI.map((opt) => (
                  <option key={opt.value || "all"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <div className={`${lq.campo} ${lq.campoAncho}`}>
              <span className={lq.rotulo}>Concepto</span>
              <AppSearchSelect
                options={descuentoOptions}
                value={conceptoId}
                onChange={(id) => setConceptoId(id as number | null)}
              />
            </div>
            <div className={lq.campo}>
              <span className={lq.rotulo}>Desde</span>
              <SelectorMes value={desde} onChange={(val) => { setDesde(val); setPage(1); }} />
            </div>
            <div className={lq.campo}>
              <span className={lq.rotulo}>Hasta</span>
              <SelectorMes value={hasta} onChange={(val) => { setHasta(val); setPage(1); }} />
            </div>
          </div>
        </Caja>
        <Caja titulo="Descargas">
          <div className={lq.barra}>
            <BotonDescarga formato="pdf" onClick={exportPdf} />
            <BotonDescarga formato="excel" onClick={exportExcel} />
          </div>
        </Caja>
      </Cajas>

      <div className={lq.barra}>
        <div className={lq.acciones}>
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate("/panel/deducciones/nueva")}
            leftIcon={<Plus size={18} aria-hidden="true" />}
          >
            Nueva deducción
          </Button>
        </div>
      </div>

      {error && <div className={lq.error} role="alert">{error}</div>}

      {loading ? (
        <div className={`${lq.tablaCaja} ${lq.cargando}`}>
          <Loader2 size={18} className={lq.gira} aria-hidden="true" /> Cargando deducciones…
        </div>
      ) : (
        <SelectableTable
          rows={filteredItems}
          columns={columns}
          actions={bulkActions}
          isSelectable={(r) => r.estado !== "eliminado"}
          rowClassName={(r) => workingId === r.id ? lq.filaOcupada : undefined}
          emptyMessage="Sin deducciones para los filtros actuales."
          onActionComplete={refreshAll}
        />
      )}

      <nav className={lq.paginador} aria-label="Paginación">
        <button type="button" onClick={() => setPageSafe(page - 1)} disabled={page <= 1 || loading}>
          ← Anterior
        </button>
        <span>Página {page} de {lastPage}</span>
        <button type="button" onClick={() => setPageSafe(page + 1)} disabled={page >= lastPage || loading}>
          Siguiente →
        </button>
      </nav>

      {editTarget && (
        <Dialogo
          titulo="Editar deducción"
          icono={Pencil}
          onClose={ocupadoEdit ? undefined : () => setEditTarget(null)}
          acciones={
            <>
              <Button variant="ghost" onClick={() => setEditTarget(null)} disabled={ocupadoEdit}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={saveEditMonto} disabled={ocupadoEdit}>
                Guardar
              </Button>
            </>
          }
        >
          <DialogoDatos
            filas={[
              { rotulo: "Deducción", valor: `#${editTarget.id}` },
              { rotulo: "Concepto", valor: editTarget.descuento_nombre },
            ]}
          />
          <DialogoCampo rotulo="Monto" htmlFor="ded-monto">
            <input
              id="ded-monto"
              type="number"
              min="0.01"
              step="0.01"
              value={editMonto}
              onChange={(e) => setEditMonto(e.target.value)}
            />
          </DialogoCampo>
          <label className={lq.casilla}>
            <input
              type="checkbox"
              checked={editPagaPorCaja}
              onChange={(e) => setEditPagaPorCaja(e.target.checked)}
            />
            Abona por caja
          </label>
        </Dialogo>
      )}

      {cancelTarget && (
        <Dialogo
          titulo={cancelTarget.origen === "automatico" ? "Eliminar deducción" : "Cancelar deducción"}
          icono={Trash2}
          peligro
          onClose={ocupadoCancel ? undefined : () => setCancelTarget(null)}
          acciones={
            <>
              <Button variant="ghost" onClick={() => setCancelTarget(null)} disabled={ocupadoCancel}>
                Volver
              </Button>
              <Button variant="danger" onClick={confirmDelete} disabled={ocupadoCancel}>
                {ocupadoCancel
                  ? "Procesando…"
                  : cancelTarget.origen === "automatico"
                    ? "Eliminar"
                    : "Cancelar deducción"}
              </Button>
            </>
          }
        >
          <p>
            ¿Confirmás {cancelTarget.origen === "automatico" ? "eliminar" : "cancelar"} la deducción{" "}
            <strong>#{cancelTarget.id}</strong>?
          </p>
          <DialogoDatos
            filas={[
              { rotulo: "Médico", valor: cancelTarget.medico_nombre },
              { rotulo: "Concepto", valor: cancelTarget.descuento_nombre },
              { rotulo: "Monto", valor: formatMoney(cancelTarget.monto) },
              { rotulo: "Período", valor: monthLabel(cancelTarget.mes_periodo, cancelTarget.anio_periodo) },
            ]}
          />
          {cancelError && <DialogoAviso tono="peligro">{cancelError}</DialogoAviso>}
        </Dialogo>
      )}
    </div>
  );
};

export default DeduccionesList;
