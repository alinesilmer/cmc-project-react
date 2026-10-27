// Todas las llamadas de Liquidación (pagos, lotes, deducciones, recibos). Las pantallas no conocen las URL.

import { delJSON, delJSONBody, getJSON, patchJSON, postJSON, putJSON } from "@/app/shared/lib/http";
import type { Parametros } from "@/app/shared/lib/http";
import type {
  AtencionSearchRow,
  Liquidacion,
  LoteAjuste,
  LoteListItem,
  MedicoResult,
  ObraSocial,
  Pago,
  PeriodoDisp,
  RefacturacionListItem,
} from "./types";
import { DELETE_LOTE_URL, PERIODOS_DISP_URL } from "./utiles";
import { ESTADO_URL, ITEM_URL, ITEMS_URL, LOTE_URL } from "./LoteDetalle/utiles";

type Id = string | number;

// ── Pagos ─────────────────────────────────────────────────────────

const PAGOS_URL = "/api/pagos/";
const PAGO_URL = (id: Id) => `/api/pagos/${id}`;

export type PagoNuevo = { anio: number; mes: number; descripcion?: string };

export const listarPagos = (params: Parametros) => getJSON<Pago[]>(PAGOS_URL, params);
export const crearPago = (body: PagoNuevo) => postJSON<Pago>(PAGOS_URL, body);
export const borrarPago = (id: Id) => delJSON(`${PAGOS_URL}${id}`);
export const getPago = (id: Id) => getJSON<Pago>(PAGO_URL(id));
export const cerrarPago = (id: Id) => postJSON<Pago>(`/api/pagos/${id}/cerrar`);
export const reabrirPago = (id: Id) => postJSON<Pago>(`/api/pagos/${id}/reabrir`);
export const editarPago = (id: Id, body: { descripcion: string | null }) => putJSON<Pago>(PAGO_URL(id), body);

// ── Obras sociales y períodos ─────────────────────────────────────

export const listarObrasSociales = () => getJSON<ObraSocial[]>("/api/obras_social/");
export const listarPeriodosDisponibles = (obraSocialId: number) =>
  getJSON<PeriodoDisp[]>(PERIODOS_DISP_URL(obraSocialId));
export const listarPeriodosParaLotes = (obraSocialId: number) =>
  getJSON<PeriodoDisp[]>(`/api/periodos/disponibles_lotes_ajustes?obra_social_id=${obraSocialId}`);

// ── Facturas de un pago ───────────────────────────────────────────

export const urlLiquidacion = (id: number) => `/api/liquidacion/liquidaciones_por_os/${id}`;

export type LiquidacionNueva = { pago_id: number; obra_social_id: number; mes_periodo: number; anio_periodo: number };

export const listarLiquidacionesDePago = (pagoId: number) =>
  getJSON<Liquidacion[]>(`/api/liquidacion/liquidaciones_por_os/?pago_id=${pagoId}`);
export const crearLiquidacion = (body: LiquidacionNueva) =>
  postJSON<Liquidacion>("/api/liquidacion/liquidaciones_por_os/crear", body);
export const getLiquidacionPorOs = (id: Id) => getJSON<Liquidacion>(`/api/liquidacion/liquidaciones_por_os/${id}`);
export const detallesVista = <T>(id: Id, search?: string, medicoId?: string) => {
  const p = new URLSearchParams();
  if (search) p.set("search", search);
  if (medicoId) p.set("medico_id", medicoId);
  return getJSON<T[]>(`/api/liquidacion/liquidaciones_por_os/${id}/detalles_vista?${p}`);
};

// ── Lotes de ajustes (débitos y créditos, refacturaciones) ────────

const LISTA_LOTES_URL = "/api/lotes/snaps/lista";

export type LoteNuevo = { obra_social_id: number; mes_periodo: number; anio_periodo: number };
export type RefacturacionNueva = LoteNuevo & { snap_origen_id: number | null };
export type ItemLote = {
  tipo: string;
  honorarios: number;
  gastos: number;
  observacion: string | null;
} & ({ id_atencion: number } | { medico_id: number });
export type ItemLoteEditado = { tipo: string; honorarios: number; gastos: number; observacion: string | null };

export const listarLotes = (params: Record<string, string>) =>
  getJSON<LoteListItem[]>(`${LISTA_LOTES_URL}?${new URLSearchParams(params)}`);
export const listarRefacturaciones = (params: Record<string, string>) =>
  getJSON<RefacturacionListItem[]>(`${LISTA_LOTES_URL}?${new URLSearchParams({ tipo: "refacturacion", ...params })}`);
export const borrarLote = (id: number) => delJSON(DELETE_LOTE_URL(id));
export const obtenerOCrearLote = (body: LoteNuevo) =>
  postJSON<LoteAjuste>("/api/lotes/snaps/obtener_o_crear", body);
export const crearLoteSinFactura = (body: LoteNuevo) =>
  postJSON<LoteAjuste>("/api/lotes/snaps/crear_sin_factura", body);
export const crearRefacturacion = (body: RefacturacionNueva) =>
  postJSON<LoteAjuste>("/api/lotes/snaps/crear_refacturacion", body);
export const lotesPorOsPeriodo = (obraSocialId: number, mes: number, anio: number) =>
  getJSON<LoteAjuste[]>(
    `/api/lotes/snaps/por_os_periodo?obra_social_id=${obraSocialId}&mes_periodo=${mes}&anio_periodo=${anio}`,
  );

export const getLote = (id: Id) => getJSON<LoteAjuste>(LOTE_URL(id));
export const buscarAtenciones = (qs: URLSearchParams | string) =>
  getJSON<AtencionSearchRow[]>(`/api/lotes/snaps/buscar_atenciones?${qs}`);
export const buscarMedicos = (q: string) =>
  getJSON<MedicoResult[]>(`/api/medicos?q=${encodeURIComponent(q)}&limit=20&skip=0`);
export const agregarItem = (loteId: Id, body: ItemLote) => postJSON(ITEMS_URL(loteId), body);
export const editarItem = (loteId: Id, ajusteId: number, body: ItemLoteEditado) =>
  putJSON(ITEM_URL(loteId, ajusteId), body);
export const cambiarEstadoLote = (loteId: Id, estado: string) => patchJSON<LoteAjuste>(ESTADO_URL(loteId), { estado });

// ── Deducciones del Colegio ───────────────────────────────────────

const CONCEPTOS_URL = "/api/conceptos";

export const listarConceptos = <T>() => getJSON<T[]>(CONCEPTOS_URL);
export const editarConcepto = <T>(id: number, body: { precio: number; porcentaje: number }) =>
  patchJSON<T>(`/api/conceptos/${id}`, body);
export const getDeduccionesPorPago = <T>(pagoId: number) => getJSON<T>(`/api/deducciones/por_pago/${pagoId}`);
export const generarDescuento = <T>(pagoId: number, descId: number) =>
  postJSON<T>(`/api/deducciones/${pagoId}/colegio/bulk_generar_descuento/${descId}`);
export const deshacerDescuento = <T>(pagoId: number, descId: number) =>
  delJSON<T>(`/api/deducciones/${pagoId}/colegio/deshacer/${descId}`);

// ── Informes, vistas previas y recibos de un pago ─────────────────

export const getInforme = <T>(pagoId: number, tipo: string) => getJSON<T>(`/api/pagos/${pagoId}/informe/${tipo}`);
export const getVistaPrevia = <T>(pagoId: number) => getJSON<T>(`/api/pagos/${pagoId}/vista_previa`);
export const getPagoMedicoActualizado = <T>(pagoId: number) =>
  getJSON<T>(`/api/pagos/${pagoId}/pago_medico_actualizado`);

export const listarRecibos = <T>(pagoId: number, estado: string) => {
  const p = new URLSearchParams({ skip: "0", limit: "1000" });
  if (estado) p.set("estado", estado);
  return getJSON<T[]>(`/api/pagos/${pagoId}/recibos?${p}`);
};
export const generarRecibos = <T>(pagoId: number) => postJSON<T>(`/api/pagos/${pagoId}/recibos/generar`);
export const emitirTodosLosRecibos = <T>(pagoId: number) => postJSON<T>(`/api/pagos/${pagoId}/recibos/emitir_todos`);
export const cambiarEstadoRecibos = (pagoId: number, body: { recibo_ids: number[]; estado: string }) =>
  patchJSON(`/api/pagos/${pagoId}/recibos/estado`, body);
export const borrarRecibos = (pagoId: number, body: { recibo_ids: number[] }) =>
  delJSONBody(`/api/pagos/${pagoId}/recibos`, body);
