// Todas las llamadas de Liquidación (pagos, lotes, deducciones, recibos). Las pantallas no conocen las URL.

import { delJSON, delJSONBody, getJSON, patchJSON, postJSON, putJSON } from "@/app/shared/lib/http";
import type { Parametros } from "@/app/shared/lib/http";
import type {
  AtencionSearchRow,
  FacturaDisp,
  FacturaPagoDisp,
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
import { ADELANTO_ESTADO_URL, ADELANTOS_LISTA_URL, type AdelantoListaRow } from "./Adelantos/utiles";
import { COMPENSACION_ESTADO_URL, COMPENSACIONES_LISTA_URL, type Compensacion } from "./Compensaciones/utiles";
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
export const marcarPagado = (id: Id) => postJSON<Pago>(`/api/pagos/${id}/marcar_pagado`);
export const editarPago = (id: Id, body: { descripcion: string | null }) => putJSON<Pago>(PAGO_URL(id), body);

// ── Obras sociales y períodos ─────────────────────────────────────

export const listarObrasSociales = () => getJSON<ObraSocial[]>("/api/obras_social/");
export const listarPeriodosDisponibles = (obraSocialId: number) =>
  getJSON<PeriodoDisp[]>(PERIODOS_DISP_URL(obraSocialId));
export const listarFacturasParaLotes = (obraSocialId: number) =>
  getJSON<FacturaDisp[]>(`/api/periodos/disponibles_lotes_ajustes?obra_social_id=${obraSocialId}`);
// Se refactura una factura que ya puede tener lote y refacturaciones anteriores: van todas.
export const listarFacturasParaRefacturar = (obraSocialId: number) =>
  getJSON<FacturaDisp[]>(`/api/periodos/disponibles_lotes_ajustes?obra_social_id=${obraSocialId}&incluir_con_lote=true`);

// ── Facturas de un pago ───────────────────────────────────────────

export const urlLiquidacion = (id: number) => `/api/liquidacion/liquidaciones_por_os/${id}`;

export type LiquidacionNueva = { pago_id: number; obra_social_id: number; factura_id: number };

export const listarLiquidacionesDePago = (pagoId: number) =>
  getJSON<Liquidacion[]>(`/api/liquidacion/liquidaciones_por_os/?pago_id=${pagoId}`);
export const listarFacturasParaPago = (obraSocialId: number, pagoId: number) =>
  getJSON<FacturaPagoDisp[]>("/api/periodos/facturas_para_pago", { obra_social_id: obraSocialId, pago_id: pagoId });
export const crearLiquidacion = (body: LiquidacionNueva) =>
  postJSON<Liquidacion>("/api/liquidacion/liquidaciones_por_os/crear", body);
export const getLiquidacionPorOs = (id: Id) => getJSON<Liquidacion>(`/api/liquidacion/liquidaciones_por_os/${id}`);
export const detallesVista = <T>(id: Id, search?: string, medicoId?: string) => {
  const p = new URLSearchParams();
  if (search) p.set("search", search);
  if (medicoId) p.set("medico_id", medicoId);
  return getJSON<T[]>(`/api/liquidacion/liquidaciones_por_os/${id}/detalles_vista?${p}`);
};

// ── Adelantos y compensaciones dentro de un pago ──────────────────

export const listarAdelantosDePago = (pagoId: number) => getJSON<AdelantoListaRow[]>(ADELANTOS_LISTA_URL, { pago_id: pagoId });
export const listarCompensacionesDePago = (pagoId: number) =>
  getJSON<{ items: Compensacion[] }>(COMPENSACIONES_LISTA_URL, { pago_id: pagoId });
export const quitarAdelantoDelPago = (id: number) => patchJSON(ADELANTO_ESTADO_URL(id), { estado: "C" });
export const quitarCompensacionDelPago = (id: number) => patchJSON(COMPENSACION_ESTADO_URL(id), { estado: "pendiente" });

// ── Lotes de ajustes (débitos y créditos, refacturaciones) ────────

const LISTA_LOTES_URL = "/api/lotes/snaps/lista";

export type LoteNuevo = { obra_social_id: number; mes_periodo: number; anio_periodo: number };
export type LoteConFacturaNuevo = { obra_social_id: number; factura_id: number };
export type RefacturacionNueva = { obra_social_id: number; factura_id: number };
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
export const obtenerOCrearLote = (body: LoteConFacturaNuevo) =>
  postJSON<LoteAjuste>("/api/lotes/snaps/obtener_o_crear", body);
export const crearLoteSinFactura = (body: LoteNuevo) =>
  postJSON<LoteAjuste>("/api/lotes/snaps/crear_sin_factura", body);
export const crearRefacturacion = (body: RefacturacionNueva) =>
  postJSON<LoteAjuste>("/api/lotes/snaps/crear_refacturacion", body);

export const getLote = (id: Id) => getJSON<LoteAjuste>(LOTE_URL(id));
export const buscarAtenciones = (qs: URLSearchParams | string) =>
  getJSON<AtencionSearchRow[]>(`/api/lotes/snaps/buscar_atenciones?${qs}`);
export const buscarMedicos = (q: string) =>
  getJSON<MedicoResult[]>(`/api/medicos?q=${encodeURIComponent(q)}&limit=20&skip=0`);
export const agregarItem = (loteId: Id, body: ItemLote) => postJSON(ITEMS_URL(loteId), body);
export const editarItem = (loteId: Id, ajusteId: number, body: ItemLoteEditado) =>
  putJSON(ITEM_URL(loteId, ajusteId), body);
export const borrarItem = (loteId: Id, ajusteId: number) => delJSON(ITEM_URL(loteId, ajusteId));
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
export const refrescarDeducciones = <T>(pagoId: number) =>
  postJSON<T>(`/api/deducciones/${pagoId}/deducciones/refrescar`);
export const cancelarDeduccion = (id: number) => patchJSON(`/api/deducciones/${id}`, { estado: "cancelado" });

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
export const borrarRecibos = (pagoId: number, body: { recibo_ids: number[] }) =>
  delJSONBody(`/api/pagos/${pagoId}/recibos`, body);
