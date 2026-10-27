import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useAppSnackbar } from "../../hooks/useAppSnackbar";
import { Loader2, MoreVertical, Pencil, Plus, Trash2, Wallet } from "lucide-react";

import SelectorMes from "@/app/components/ui/SelectorMes/SelectorMes";
import Button from "@/app/components/ui/Button/Button";
import Franja from "@/app/components/layout/Franja/Franja";
import Dialogo, { DialogoAviso, DialogoCampo, DialogoDatos } from "@/app/components/ui/Dialogo/Dialogo";
import AppSearchSelect, {
  type AppSearchSelectOption,
} from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import BotonDescarga from "@/app/components/ui/BotonDescarga/BotonDescarga";
import {
  deleteDeduccion,
  fetchDeduccionesHistorial,
  fetchDeduccionesHistorialExport,
  fetchDescuentos,
  fetchMedicos,
  fetchOpenPago,
  fetchResumenPagoAbierto,
  pagarEnCaja,
  updateDeduccionEstado,
  updateDeduccionMonto,
} from "./api";
import type {
  DeduccionHistorialItem,
  DescuentoOption,
  MedicoOption,
  Pago,
  ResumenPagoAbierto,
} from "./types";
import { formatMoney, monthLabel } from "./types";
import lq from "@/app/pages/Pagos/Liquidacion.module.scss";
import s from "./Deducciones.module.scss";
import { getErrorMessage } from "@/app/shared/lib/utiles";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import Paginador from "@/app/components/ui/Paginador/Paginador";
import { comoErrorApi } from "@/app/shared/lib/httpErrors";

const CONCEPTO_SALDO_DEUDOR = "Saldo deudor de débitos";

// En las deudas por débitos, `cuota_nro` guarda el pago de origen; no es un número de cuota.
const etiquetaCuota = (r: { descuento_nombre: string; cuota_nro: number; cuotas_total: number | null }) =>
  r.descuento_nombre === CONCEPTO_SALDO_DEUDOR
    ? `Pago #${r.cuota_nro}`
    : `${r.cuota_nro}/${r.cuotas_total ?? "—"}`;

const PAGE_SIZE = 50;

type Pestana = "pendientes" | "en_pago" | "aplicadas";

// «Pendientes» incluye las vencidas (cuotas manuales de períodos anteriores): son las que más importan.
const PESTANAS: Array<{ key: Pestana; rotulo: string; estados: string[]; param: string }> = [
  { key: "pendientes", rotulo: "Pendientes", estados: ["pendiente", "vencida"], param: "pendiente,vencida" },
  { key: "en_pago", rotulo: "En el pago", estados: ["en_pago"], param: "en_pago" },
  { key: "aplicadas", rotulo: "Aplicadas", estados: ["aplicado"], param: "aplicado" },
];

type AccionLote = "agregar" | "quitar" | "caja" | "eliminar";

const esPendiente = (r: DeduccionHistorialItem) => r.estado === "pendiente" || r.estado === "vencida";

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

// Fechas que llegan sin zona horaria («2026-08-27T06:09:00»): se muestran tal cual, sin correrlas de huso.
const partesFecha = (iso: string | null | undefined) => {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(iso) : null;
  return m ? { fecha: `${m[3]}/${m[2]}/${m[1]}`, hora: `${m[4]}:${m[5]}` } : null;
};

/** La fecha que cuenta en cada pestaña: cuándo se aplicó en las aplicadas y cuándo se creó en el resto. */
const fechaDe = (r: DeduccionHistorialItem, pestana: Pestana) =>
  partesFecha(pestana === "aplicadas" ? r.fecha_aplicacion : r.created_at);

const DeduccionesList: React.FC = () => {
  const navigate = useNavigate();
  const notify = useAppSnackbar();

  const [pestana, setPestana] = useState<Pestana>("pendientes");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<DeduccionHistorialItem[]>([]);
  const [total, setTotal] = useState(0);
  const [montoTotal, setMontoTotal] = useState(0);
  const [conteos, setConteos] = useState<Array<{ estado: string; cantidad: number; monto: number }>>([]);
  const [page, setPage] = useState(1);

  const [medicoId, setMedicoId] = useState<number | null>(null);
  const [conceptoId, setConceptoId] = useState<number | null>(null);
  const [desde, setDesde] = useState<Date | null>(null);
  const [hasta, setHasta] = useState<Date | null>(null);
  const [soloEnPago, setSoloEnPago] = useState(false);

  const [medicos, setMedicos] = useState<MedicoOption[]>([]);
  const [medicosLoading, setMedicosLoading] = useState(false);
  const [descuentos, setDescuentos] = useState<DescuentoOption[]>([]);

  const [pago, setPago] = useState<Pago | null>(null);
  const [resumen, setResumen] = useState<ResumenPagoAbierto | null>(null);

  const [seleccion, setSeleccion] = useState<Map<number, DeduccionHistorialItem>>(new Map());
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [loteOcupado, setLoteOcupado] = useState(false);
  const [confirmarLote, setConfirmarLote] = useState<AccionLote | null>(null);
  const [menu, setMenu] = useState<{ ancla: HTMLElement; fila: DeduccionHistorialItem } | null>(null);

  const [editTarget, setEditTarget] = useState<DeduccionHistorialItem | null>(null);
  const [editMonto, setEditMonto] = useState("");
  const [editPagaPorCaja, setEditPagaPorCaja] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<DeduccionHistorialItem | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const hasOpenPago = Boolean(pago);
  const pestanaDef = PESTANAS.find((p) => p.key === pestana)!;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const cuentaDe = (p: (typeof PESTANAS)[number]) =>
    conteos.filter((c) => p.estados.includes(c.estado)).reduce((acc, c) => acc + c.cantidad, 0);

  // ── Opciones de los selectores ──────────────────────────────────────
  const medicoOptions = useMemo<AppSearchSelectOption[]>(
    () => medicos.map((m) => ({ id: m.id, label: m.nombre, subtitle: m.nro_socio ? `#${m.nro_socio}` : undefined })),
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

  // ── Carga ───────────────────────────────────────────────────────────
  const filtrosBase = useCallback(
    () => ({
      medico_id: medicoId ?? undefined,
      descuento_id: conceptoId ?? undefined,
      mes_desde: desde ? desde.getMonth() + 1 : undefined,
      anio_desde: desde ? desde.getFullYear() : undefined,
      mes_hasta: hasta ? hasta.getMonth() + 1 : undefined,
      anio_hasta: hasta ? hasta.getFullYear() : undefined,
      estado: pestanaDef.param,
      solo_en_pago: pestana === "pendientes" && soloEnPago ? true : undefined,
    }),
    [medicoId, conceptoId, desde, hasta, pestanaDef.param, pestana, soloEnPago],
  );

  // Sólo vale la última respuesta: si se cambian filtros rápido, las anteriores llegan tarde y se descartan.
  const pedido = useRef(0);

  const loadPage = useCallback(async () => {
    const mio = ++pedido.current;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDeduccionesHistorial({ page, size: PAGE_SIZE, ...filtrosBase() });
      if (mio !== pedido.current) return;
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(Number(data.total ?? 0));
      setMontoTotal(Number(data.monto_total ?? 0));
      setConteos(
        (data.conteos ?? []).map((c) => ({ estado: c.estado, cantidad: Number(c.cantidad), monto: Number(c.monto) })),
      );
    } catch (e: any) {
      if (mio !== pedido.current) return;
      setError(getErrorMessage(e, "No se pudieron cargar las deducciones."));
    } finally {
      if (mio === pedido.current) setLoading(false);
    }
  }, [page, filtrosBase]);

  const loadPago = useCallback(async () => {
    try {
      const abierto = await fetchOpenPago();
      setPago(abierto);
      setResumen(abierto ? await fetchResumenPagoAbierto(abierto.id) : null);
    } catch {
      // Silencioso: el lateral no bloquea la lista.
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadPage(), loadPago()]);
  }, [loadPage, loadPago]);

  useEffect(() => {
    void (async () => {
      try {
        setDescuentos(await fetchDescuentos());
      } catch {
        // Silencioso: sólo se pierde el filtro por concepto.
      }
    })();
  }, []);
  useEffect(() => { void loadPago(); }, [loadPago]);
  useEffect(() => { void loadPage(); }, [loadPage]);

  // Sólo vale la última búsqueda: al tipear rápido las anteriores llegan tarde y se descartan.
  const ultimaBusqueda = useRef(0);
  const searchMedicos = async (query: string) => {
    const mia = ++ultimaBusqueda.current;
    setMedicosLoading(true);
    try {
      const rows = await fetchMedicos(query);
      if (mia === ultimaBusqueda.current) setMedicos(rows);
    } finally {
      if (mia === ultimaBusqueda.current) setMedicosLoading(false);
    }
  };
  useEffect(() => { void searchMedicos(""); }, []);

  // Cualquier cambio de filtro o de pestaña vuelve a la primera página y suelta la selección.
  const cambiarFiltro = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
    setSeleccion(new Map());
  };

  const limpiarFiltros = () => {
    setMedicoId(null);
    setConceptoId(null);
    setDesde(null);
    setHasta(null);
    setSoloEnPago(false);
    setPage(1);
    setSeleccion(new Map());
  };
  const hayFiltros = medicoId != null || conceptoId != null || desde != null || hasta != null || soloEnPago;

  const irAPagina = (n: number) => {
    setPage(Math.min(Math.max(1, n), lastPage));
    setSeleccion(new Map());
  };

  // ── Selección ───────────────────────────────────────────────────────
  const seleccionables = items.filter((r) => r.estado !== "eliminado");
  const todasMarcadas = seleccionables.length > 0 && seleccionables.every((r) => seleccion.has(r.id));
  const algunaMarcada = seleccionables.some((r) => seleccion.has(r.id));

  const alternarTodas = () => setSeleccion(todasMarcadas || algunaMarcada ? new Map() : new Map(seleccionables.map((r) => [r.id, r])));
  const alternarFila = (r: DeduccionHistorialItem) =>
    setSeleccion((prev) => {
      const next = new Map(prev);
      if (next.has(r.id)) next.delete(r.id);
      else next.set(r.id, r);
      return next;
    });

  const marcadas = [...seleccion.values()];
  const sumaMarcadas = marcadas.reduce((acc, r) => acc + Number(r.monto ?? 0), 0);
  const puedeAgregar = marcadas.length > 0 && hasOpenPago && marcadas.every(esPendiente);
  const puedeQuitar = marcadas.length > 0 && marcadas.every((r) => r.estado === "en_pago");
  const puedeCaja = marcadas.length > 0 && marcadas.every(esPendiente);

  // ── Acciones sobre una fila ─────────────────────────────────────────
  const conRefresco = async (id: number, accion: () => Promise<unknown>, ok: string, fallo: string) => {
    setWorkingId(id);
    try {
      await accion();
      notify(ok);
      await refreshAll();
    } catch (e: any) {
      notify(getErrorMessage(e, fallo), "error");
    } finally {
      setWorkingId(null);
    }
  };

  const onChangeEstado = (r: DeduccionHistorialItem, next: "en_pago" | "pendiente") =>
    conRefresco(r.id, () => updateDeduccionEstado(r.id, next), "Estado actualizado correctamente.", "No se pudo actualizar el estado.");

  const onPagarEnCaja = (r: DeduccionHistorialItem) =>
    conRefresco(r.id, () => pagarEnCaja(r.id), "Pago en caja registrado correctamente.", "No se pudo registrar el pago en caja.");

  const onDelete = (row: DeduccionHistorialItem) => {
    setCancelError(null);
    setCancelTarget(row);
  };

  const confirmDelete = async () => {
    if (!cancelTarget) return;
    setCancelError(null);
    setWorkingId(cancelTarget.id);
    try {
      await deleteDeduccion(cancelTarget.id);
      setCancelTarget(null);
      notify("Deducción eliminada.");
      await refreshAll();
    } catch (e: any) {
      setCancelError(getErrorMessage(e, "No se pudo eliminar la deducción."));
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
      await updateDeduccionMonto(editTarget.id, parsed, editPagaPorCaja);
      setEditTarget(null);
      notify("Deducción actualizada correctamente.");
      await refreshAll();
    } catch (e: any) {
      notify(getErrorMessage(e, "No se pudo editar el monto."), "error");
    } finally {
      setWorkingId(null);
    }
  };

  // ── Acciones sobre lo seleccionado (sólo la página actual: hasta 50 pedidos a la vez) ──
  const ejecutarLote = async (accion: AccionLote) => {
    const filas = [...seleccion.values()];
    setConfirmarLote(null);
    setLoteOcupado(true);
    const hacer: Record<AccionLote, (r: DeduccionHistorialItem) => Promise<unknown>> = {
      agregar: (r) => updateDeduccionEstado(r.id, "en_pago"),
      quitar: (r) => updateDeduccionEstado(r.id, "pendiente"),
      caja: (r) => pagarEnCaja(r.id),
      eliminar: (r) => deleteDeduccion(r.id),
    };
    const resultados = await Promise.allSettled(filas.map((r) => hacer[accion](r)));
    const fallaron = resultados.filter((x) => x.status === "rejected");
    const ok = resultados.length - fallaron.length;
    const verbo: Record<AccionLote, string> = {
      agregar: "agregadas al pago",
      quitar: "quitadas del pago",
      caja: "cobradas en caja",
      eliminar: "eliminadas",
    };
    notify(
      `${plural(ok, "deducción", "deducciones")} ${verbo[accion]}${fallaron.length ? `, ${fallaron.length} fallaron` : ""}.`,
      fallaron.length ? "error" : undefined,
    );
    setSeleccion(new Map());
    setLoteOcupado(false);
    await refreshAll();
  };

  const textoConfirmacion = (accion: AccionLote, n: number) => {
    const d = plural(n, "deducción", "deducciones");
    switch (accion) {
      case "agregar": return `¿Agregar ${d} al pago de ${pago ? monthLabel(pago.mes, pago.anio) : "este mes"}?`;
      case "quitar": return `¿Quitar ${d} del pago? Vuelven a estado pendiente.`;
      case "caja": return `¿Registrar ${d} como cobradas en caja?`;
      case "eliminar": return `¿Eliminar ${d}? Esta acción no se puede deshacer.`;
    }
  };

  // ── Descargas ───────────────────────────────────────────────────────
  const buildExportParams = () => filtrosBase();

  const exportExcel = async () => {
    try {
      const { downloadExcelSheet } = await import("@/app/shared/lib/excelExport");
      const data = await fetchDeduccionesHistorialExport(buildExportParams());
      const rows = data.map((row) => ({
        Medico: row.medico_nombre,
        Concepto: row.descuento_nombre,
        Monto: Number(row.monto ?? 0),
        Periodo: monthLabel(row.mes_periodo, row.anio_periodo),
        [pestana === "aplicadas" ? "Aplicada" : "Creada"]: fechaDe(row, pestana)?.fecha ?? "",
        Cuota: row.origen === "manual" ? etiquetaCuota(row) : "",
        Estado: row.estado,
        Origen: row.origen,
      }));
      await downloadExcelSheet("deducciones.xlsx", "Deducciones", rows);
    } catch (e) {
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
        head: [["Médico", "Concepto", "Monto", "Período", pestana === "aplicadas" ? "Aplicada" : "Creada", "Cuota", "Estado", "Origen"]],
        body: data.map((row) => [
          row.medico_nombre,
          row.descuento_nombre,
          formatMoney(row.monto),
          monthLabel(row.mes_periodo, row.anio_periodo),
          fechaDe(row, pestana)?.fecha ?? "",
          row.origen === "manual" ? etiquetaCuota(row) : "",
          row.estado,
          row.origen,
        ]),
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [27, 86, 255], textColor: 255 },
      });
      doc.save("deducciones.pdf");
    } catch (e) {
      notify(getErrorMessage(e, "No se pudo exportar a PDF."), "error");
    }
  };

  // ── Menú de una fila ────────────────────────────────────────────────
  const itemsMenu = (r: DeduccionHistorialItem) => {
    const cerrar = () => setMenu(null);
    const opcion = (rotulo: string, onClick: () => void, extra?: { disabled?: boolean; peligro?: boolean }) => (
      <MenuItem
        key={rotulo}
        disabled={extra?.disabled}
        sx={extra?.peligro ? { color: "#cc2a2a" } : undefined}
        onClick={() => { cerrar(); onClick(); }}
      >
        {rotulo}
      </MenuItem>
    );
    if (esPendiente(r)) {
      return [
        opcion("Agregar al pago", () => onChangeEstado(r, "en_pago"), { disabled: !hasOpenPago }),
        opcion("Pagar en caja", () => onPagarEnCaja(r)),
        opcion("Editar monto", () => openEdit(r)),
        opcion("Eliminar", () => onDelete(r), { peligro: true }),
      ];
    }
    if (r.estado === "en_pago") {
      return [
        opcion("Quitar del pago", () => onChangeEstado(r, "pendiente")),
        opcion("Editar monto", () => openEdit(r)),
        opcion("Eliminar", () => onDelete(r), { peligro: true }),
      ];
    }
    if (r.estado === "aplicado") {
      return [
        opcion("Cancelar cobro", () => onChangeEstado(r, "pendiente")),
        opcion("Eliminar", () => onDelete(r), { peligro: true }),
      ];
    }
    return [];
  };

  const ocupadoEdit = editTarget ? workingId === editTarget.id : false;
  const ocupadoCancel = cancelTarget ? workingId === cancelTarget.id : false;
  const desdeFila = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const hastaFila = Math.min(page * PAGE_SIZE, total);
  const conceptosVisibles = resumen?.conceptos.slice(0, 6) ?? [];
  const conceptosOcultos = (resumen?.conceptos.length ?? 0) - conceptosVisibles.length;

  return (
    <div className={lq.pagina}>
      <Franja titulo="Deducciones" icono={Wallet} />

      <div className={s.encabezado}>
        <p className={s.contexto}>
          {pago ? (
            <>Cuotas, aportes y deudas de cada médico. Lo que agregues entra al pago abierto, <strong>{monthLabel(pago.mes, pago.anio)}</strong>.</>
          ) : (
            <>Cuotas, aportes y deudas de cada médico. No hay un pago abierto: las deducciones quedan pendientes hasta que se abra uno.</>
          )}
        </p>
        <div className={lq.barra}>
          <BotonDescarga formato="pdf" onClick={exportPdf} />
          <BotonDescarga formato="excel" onClick={exportExcel} />
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

      <div className={s.filtros}>
        <div className={`${lq.campo} ${lq.campoAncho}`}>
          <span className={lq.rotulo}>Médico</span>
          <AppSearchSelect
            options={medicoOptions}
            value={medicoId}
            onChange={(id) => cambiarFiltro(setMedicoId)(id as number | null)}
            onQueryChange={searchMedicos}
            loading={medicosLoading}
          />
        </div>
        <div className={`${lq.campo} ${lq.campoAncho}`}>
          <span className={lq.rotulo}>Concepto</span>
          <AppSearchSelect
            ordenar
            options={descuentoOptions}
            value={conceptoId}
            onChange={(id) => cambiarFiltro(setConceptoId)(id as number | null)}
          />
        </div>
        <div className={lq.campo}>
          <span className={lq.rotulo}>Desde</span>
          <SelectorMes value={desde} onChange={cambiarFiltro(setDesde)} />
        </div>
        <div className={lq.campo}>
          <span className={lq.rotulo}>Hasta</span>
          <SelectorMes value={hasta} onChange={cambiarFiltro(setHasta)} />
        </div>
        {hayFiltros && (
          <button type="button" className={s.limpiar} onClick={limpiarFiltros}>Limpiar</button>
        )}
      </div>

      {error && <div className={lq.error} role="alert">{error}</div>}

      <div className={s.cuerpo}>
        <section className={s.lista} aria-label="Deducciones">
          <div className={s.listaCabeza}>
            <div className={s.pestanas} role="tablist" aria-label="Estado">
              {PESTANAS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  role="tab"
                  aria-selected={pestana === p.key}
                  className={`${s.pestana} ${pestana === p.key ? s.pestanaActiva : ""}`}
                  onClick={() => cambiarFiltro(setPestana)(p.key)}
                >
                  {p.rotulo} <small>{cuentaDe(p).toLocaleString("es-AR")}</small>
                </button>
              ))}
            </div>
            {pestana === "pendientes" && (
              <label className={s.soloPago}>
                <input type="checkbox" checked={soloEnPago} onChange={(e) => cambiarFiltro(setSoloEnPago)(e.target.checked)} />
                Solo médicos del pago abierto
              </label>
            )}
          </div>

          <div className={`${s.tablaCaja} ${loading && items.length > 0 ? s.tablaVieja : ""}`}>
            {loading && items.length === 0 ? (
              <div className={lq.cargando}>
                <Loader2 size={18} className={lq.gira} aria-hidden="true" /> Cargando deducciones…
              </div>
            ) : items.length === 0 ? (
              <div className={s.vacioTabla}>Sin deducciones para los filtros actuales.</div>
            ) : (
              <Tabla>
                <thead>
                  <tr>
                    <th className={s.celdaCheck}>
                      <input
                        type="checkbox"
                        checked={todasMarcadas}
                        ref={(el) => { if (el) el.indeterminate = algunaMarcada && !todasMarcadas; }}
                        onChange={alternarTodas}
                        aria-label="Seleccionar o soltar todas las de esta página"
                      />
                    </th>
                    <th>Médico</th>
                    <th>Concepto</th>
                    <th>Período</th>
                    <th>{pestana === "aplicadas" ? "Aplicada" : "Creada"}</th>
                    <th>Monto</th>
                    <th aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => {
                    const marcada = seleccion.has(r.id);
                    const trabajando = workingId === r.id;
                    const detalle =
                      r.origen === "manual"
                        ? `Cuota ${etiquetaCuota(r)}`
                        : r.paga_por_caja
                          ? "Cobra en caja"
                          : "Automática";
                    return (
                      <tr key={r.id} className={`${marcada ? s.filaSeleccionada : ""} ${trabajando ? lq.filaOcupada : ""}`}>
                        <td className={s.celdaCheck}>
                          <input
                            type="checkbox"
                            checked={marcada}
                            disabled={r.estado === "eliminado"}
                            onChange={() => alternarFila(r)}
                            aria-label={`Seleccionar la deducción de ${r.medico_nombre}`}
                          />
                        </td>
                        <td>{r.medico_nombre}</td>
                        <td>
                          <span className={s.celdaDoble}>
                            {r.descuento_nombre}
                            <small>{detalle}</small>
                          </span>
                        </td>
                        <td>
                          {monthLabel(r.mes_periodo, r.anio_periodo)}
                          {r.estado === "vencida" && <span className={s.etiquetaVencida}>Vencida</span>}
                        </td>
                        <td>
                          {(() => {
                            const f = fechaDe(r, pestana);
                            return f ? (
                              <span className={s.celdaDoble}>
                                {f.fecha}
                                <small>{f.hora}</small>
                              </span>
                            ) : (
                              <span className={lq.tenue}>—</span>
                            );
                          })()}
                        </td>
                        <td className={s.celdaMonto}>{formatMoney(r.monto)}</td>
                        <td>
                          {trabajando ? (
                            <Loader2 size={16} className={lq.gira} aria-label="Procesando" />
                          ) : (
                            <button
                              type="button"
                              className={lq.botonIcono}
                              aria-label="Más acciones"
                              aria-haspopup="menu"
                              onClick={(e) => setMenu({ ancla: e.currentTarget, fila: r })}
                            >
                              <MoreVertical size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Tabla>
            )}
          </div>

          <div className={s.pie}>
            <span>
              {desdeFila.toLocaleString("es-AR")}–{hastaFila.toLocaleString("es-AR")} de {total.toLocaleString("es-AR")}
              {" · "}Total {formatMoney(montoTotal)}
              {loading && items.length > 0 && " · Actualizando…"}
            </span>
            <nav className={s.pieNav} aria-label="Paginación">
              <button type="button" onClick={() => irAPagina(page - 1)} disabled={page <= 1 || loading}>← Anterior</button>
              <span>Página {page} de {lastPage.toLocaleString("es-AR")}</span>
              <button type="button" onClick={() => irAPagina(page + 1)} disabled={page >= lastPage || loading}>Siguiente →</button>
            </nav>
          </div>
        </section>

        <aside className={s.lateral} aria-label="Pago abierto">
          <section className={s.panel}>
            <div className={s.panelCabeza}>
              <div>
                <span className={s.panelRotulo}>Pago abierto</span>
                <h2 className={s.panelTitulo}>{pago ? monthLabel(pago.mes, pago.anio) : "Sin pago abierto"}</h2>
              </div>
              {pago && <span className={`${lq.estado} ${lq.abierto}`}>Abierto</span>}
            </div>

            {pago && resumen ? (
              <>
                <div className={s.datos}>
                  <div className={s.dato}><span>Deducciones en el pago</span><b>{resumen.cantidad.toLocaleString("es-AR")}</b></div>
                  <div className={s.dato}><span>A descontar</span><b>{formatMoney(resumen.total)}</b></div>
                </div>
                {pago.deducciones_dirty ? (
                  <p className={lq.alerta}>Las deducciones cambiaron: el monto a descontar es una estimación. Se actualiza al refrescar el pago o al cerrarlo.</p>
                ) : (
                  <p className={s.nota}>Se descuenta según lo que cobra cada médico. Al cerrar el pago se recalcula todo.</p>
                )}
                {conceptosVisibles.length > 0 && (
                  <ul className={s.conceptos}>
                    {conceptosVisibles.map((c) => (
                      <li key={c.nombre}>
                        <span>{c.nombre} <em>· {c.cantidad.toLocaleString("es-AR")}</em></span>
                        <b>{formatMoney(c.monto)}</b>
                      </li>
                    ))}
                    {conceptosOcultos > 0 && (
                      <li><span><em>y {plural(conceptosOcultos, "concepto más", "conceptos más")}</em></span></li>
                    )}
                  </ul>
                )}
                <Button variant="ghost" size="md" onClick={() => navigate(`/panel/liquidation/${pago.id}`)}>
                  Ver el pago completo →
                </Button>
              </>
            ) : (
              <p className={s.nota}>
                {pago ? "Cargando el detalle del pago…" : "Cuando se abra un pago, acá vas a ver cuánto se va a descontar y de qué conceptos."}
              </p>
            )}
          </section>

          {marcadas.length > 0 ? (
            <section className={s.seleccion} aria-live="polite">
              <div className={s.seleccionCabeza}>
                <b>{plural(marcadas.length, "seleccionada", "seleccionadas")}</b>
                <b>{formatMoney(sumaMarcadas)}</b>
              </div>
              {puedeAgregar && (
                <Button variant="primary" size="md" disabled={loteOcupado} onClick={() => setConfirmarLote("agregar")}>
                  Agregar {marcadas.length} al pago{pago ? ` de ${monthLabel(pago.mes, pago.anio)}` : ""}
                </Button>
              )}
              {puedeQuitar && (
                <Button variant="primary" size="md" disabled={loteOcupado} onClick={() => setConfirmarLote("quitar")}>
                  Quitar {marcadas.length} del pago
                </Button>
              )}
              {!puedeAgregar && !puedeQuitar && (
                <p className={s.nota}>
                  {marcadas.every(esPendiente) && !hasOpenPago
                    ? "No hay un pago abierto al que agregar deducciones."
                    : "Para agregar o quitar del pago, elegí deducciones que estén todas en el mismo estado (pendientes o en el pago)."}
                </p>
              )}
              <div className={s.seleccionBotones}>
                {puedeCaja && (
                  <Button variant="ghost" size="md" disabled={loteOcupado} onClick={() => setConfirmarLote("caja")}>
                    Pagar en caja
                  </Button>
                )}
                <Button variant="danger" size="md" disabled={loteOcupado} onClick={() => setConfirmarLote("eliminar")}>
                  Eliminar
                </Button>
              </div>
            </section>
          ) : (
            <p className={s.sinSeleccion}>Marcá deducciones en la lista para agregarlas al pago, cobrarlas en caja o eliminarlas.</p>
          )}
        </aside>
      </div>

      <Menu anchorEl={menu?.ancla ?? null} open={Boolean(menu)} onClose={() => setMenu(null)}>
        {menu ? itemsMenu(menu.fila) : null}
      </Menu>

      {confirmarLote && (
        <Dialogo
          titulo="Confirmar"
          icono={confirmarLote === "eliminar" ? Trash2 : Wallet}
          peligro={confirmarLote === "eliminar"}
          onClose={() => setConfirmarLote(null)}
          acciones={
            <>
              <Button variant="ghost" onClick={() => setConfirmarLote(null)}>Cancelar</Button>
              <Button variant={confirmarLote === "eliminar" ? "danger" : "primary"} onClick={() => ejecutarLote(confirmarLote)}>
                Confirmar
              </Button>
            </>
          }
        >
          <p>{textoConfirmacion(confirmarLote, marcadas.length)}</p>
        </Dialogo>
      )}

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
              { rotulo: "Médico", valor: editTarget.medico_nombre },
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
