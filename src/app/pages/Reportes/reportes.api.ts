import { getJSON } from "../../lib/http";
import type {
  CodigoStat,
  MedicoStat,
  ObraSocialStat,
  OrdenCodigos,
  PaginaPrestaciones,
  PuntoSerie,
  ResumenReporte,
  ValidacionEstado,
} from "./reportes.types";

const BASE = "/api/reportes";

// ─── Colegio ─────────────────────────────────────────────────────────────────
// Todas exigen el scope `facturas:ver`: cruzan la facturación de todos los
// médicos. El backend las rechaza con 403 si el usuario no lo tiene.

export const getResumen = (periodo: string): Promise<ResumenReporte> =>
  getJSON<ResumenReporte>(`${BASE}/resumen`, { periodo });

export const getCodigos = (params: {
  periodo: string;
  especialidad_id?: number;
  obra_social?: string;
  /** Busca en código y descripción. Lo resuelve el backend, no el navegador:
   *  la tabla muestra 25 filas pero el período tiene miles. */
  q?: string;
  orden?: OrdenCodigos;
  limit?: number;
  offset?: number;
}): Promise<CodigoStat[]> => getJSON<CodigoStat[]>(`${BASE}/codigos`, params);

/** Todos los que facturaron un código en el período, de mayor a menor. */
export const getMedicosDeCodigo = (
  codigo: string,
  params: { periodo: string; obra_social?: string; limit?: number }
): Promise<MedicoStat[]> =>
  getJSON<MedicoStat[]>(`${BASE}/codigos/${encodeURIComponent(codigo)}/medicos`, params);

export const getMedicos = (params: {
  periodo: string;
  obra_social?: string;
  /** Busca por nombre o número de socio. */
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<MedicoStat[]> => getJSON<MedicoStat[]>(`${BASE}/medicos`, params);

/** Qué facturó un médico, abierto por código. */
export const getCodigosDeMedico = (
  nroSocio: string,
  params: { periodo: string; obra_social?: string; limit?: number }
): Promise<CodigoStat[]> =>
  getJSON<CodigoStat[]>(
    `${BASE}/medicos/${encodeURIComponent(nroSocio)}/codigos`,
    params
  );

export const getObrasSociales = (params: {
  periodo: string;
  limit?: number;
}): Promise<ObraSocialStat[]> =>
  getJSON<ObraSocialStat[]>(`${BASE}/obras-sociales`, params);

export const getPrestaciones = (params: {
  obra_social?: string;
  periodo?: string;
  nro_socio?: string;
  codigo?: string;
  validacion_estado?: ValidacionEstado;
  desde?: string;
  hasta?: string;
  limit?: number;
  offset?: number;
}): Promise<PaginaPrestaciones> =>
  getJSON<PaginaPrestaciones>(`${BASE}/prestaciones`, params);

export const getEvolucion = (params: {
  obra_social?: string;
  meses?: number;
}): Promise<PuntoSerie[]> => getJSON<PuntoSerie[]>(`${BASE}/evolucion`, params);

// ─── Médico ──────────────────────────────────────────────────────────────────
// Sólo piden estar logueado. El backend saca el nro de socio del token: no hay
// parámetro para pedir los datos de otro médico.

export const getMiResumen = (periodo: string): Promise<ResumenReporte> =>
  getJSON<ResumenReporte>(`${BASE}/mios/resumen`, { periodo });

export const getMisCodigos = (params: {
  periodo: string;
  obra_social?: string;
  orden?: OrdenCodigos;
  limit?: number;
}): Promise<CodigoStat[]> => getJSON<CodigoStat[]>(`${BASE}/mios/codigos`, params);

export const getMisObrasSociales = (params: {
  periodo: string;
  limit?: number;
}): Promise<ObraSocialStat[]> =>
  getJSON<ObraSocialStat[]>(`${BASE}/mios/obras-sociales`, params);

export const getMisPrestaciones = (params: {
  periodo?: string;
  obra_social?: string;
  codigo?: string;
  desde?: string;
  hasta?: string;
  limit?: number;
  offset?: number;
}): Promise<PaginaPrestaciones> =>
  getJSON<PaginaPrestaciones>(`${BASE}/mios/prestaciones`, params);

export const getMiEvolucion = (meses = 12): Promise<PuntoSerie[]> =>
  getJSON<PuntoSerie[]>(`${BASE}/mios/evolucion`, { meses });
