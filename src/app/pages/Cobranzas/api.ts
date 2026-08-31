import { getJSON } from "../../lib/http";
import type {
  CobranzaExportRow,
  CobranzaMedicoDetalle,
  CobranzaMedicosPage,
  CobranzaPorConceptoItem,
  CobranzasResumen,
  CobranzaSociosPage,
} from "./types";

const COBRANZAS_URL = "/api/cobranzas";

export type CobranzasFiltrosParams = {
  q?: string;
  mes_desde?: number;
  anio_desde?: number;
  mes_hasta?: number;
  anio_hasta?: number;
  paga_por_caja?: boolean;
  incluir_futuros?: boolean;
  saldo_min?: number;
  /** Acota la deuda a un solo concepto (detalle de socio dentro de "Por concepto"). */
  concepto_id?: number;
};

export const fetchResumen = (params: CobranzasFiltrosParams) =>
  getJSON<CobranzasResumen>(`${COBRANZAS_URL}/resumen`, params);

export const fetchPorConcepto = (params: CobranzasFiltrosParams) =>
  getJSON<CobranzaPorConceptoItem[]>(`${COBRANZAS_URL}/por_concepto`, params);

export const fetchPorSocio = (params: CobranzasFiltrosParams & { page: number; size: number }) =>
  getJSON<CobranzaSociosPage>(`${COBRANZAS_URL}/por_socio`, params);

export const fetchMedicosPorConcepto = (
  descuentoId: number,
  params: CobranzasFiltrosParams & { page: number; size: number },
) =>
  getJSON<CobranzaMedicosPage>(`${COBRANZAS_URL}/por_concepto/${descuentoId}/medicos`, params);

export const fetchDetalleMedico = (medicoId: number, params: CobranzasFiltrosParams) =>
  getJSON<CobranzaMedicoDetalle>(`${COBRANZAS_URL}/medicos/${medicoId}`, params);

export const fetchExport = (params: CobranzasFiltrosParams) =>
  getJSON<CobranzaExportRow[]>(`${COBRANZAS_URL}/export`, params);
