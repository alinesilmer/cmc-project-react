// Cliente del módulo de validaciones — /api/validaciones (cmc_api).

import { delJSON, getJSON, postForm, postJSON } from "@/app/shared/lib/http";
import type {
  CodigoNomenclador,
  Periodo,
  Prestacion,
} from "./validaciones.types";

const BASE = "/api/validaciones";

// Timeout de las llamadas que hacen que el backend consulte a la obra social.
const TIMEOUT_OS_EN_LINEA = 45_000;

/** `true` si la request se cortó del lado del navegador y no del servidor. */
export const esTimeoutDeRed = (err: unknown): boolean => {
  const e = err as { code?: string; message?: string; response?: unknown } | null;
  if (!e) return false;
  if (e.code === "ECONNABORTED" || e.code === "ETIMEDOUT") return true;
  // Sin `response` no hubo respuesta del servidor; el texto de axios para el corte por tiempo es "timeout of 45000ms exceeded".
  return !e.response && /timeout/i.test(String(e.message ?? ""));
};

// ─── Formas que devuelve el backend (snake_case) ──────────────────────────────

interface PrestacionApi {
  id: number;
  fecha: string | null;
  codigo: string;
  descripcion: string;
  nro_afiliado: string;
  nombre_afiliado: string;
  nro_validacion: string | null;
  estado: Prestacion["estado"];
  estado_detalle: string;
  cantidad: number;
  honorarios: number | string;
  gastos: number | string;
  coseguro: number | string;
  total: number | string;
  mes: number;
  anio: number;
  obra_social: number;
  orden?: string | null;
}

interface CodigoApi {
  codigo: string;
  descripcion: string;
  honorarios: number | string;
  gastos: number | string;
  total: number | string;
  coseguro: number | string;
  admitido: boolean;
  motivo: string | null;
}

// Los DECIMAL de MySQL llegan como string por JSON.
const num = (v: number | string | null | undefined) => Number(v ?? 0);

const toPrestacion = (p: PrestacionApi): Prestacion => ({
  id: String(p.id),
  fecha: p.fecha ?? "",
  codigo: p.codigo,
  descripcion: p.descripcion,
  nroAfiliado: p.nro_afiliado,
  nombreAfiliado: p.nombre_afiliado,
  nroValidacion: p.nro_validacion,
  estado: p.estado,
  estadoDetalle: p.estado_detalle,
  cantidad: p.cantidad,
  honorarios: num(p.honorarios),
  gastos: num(p.gastos),
  coseguro: num(p.coseguro),
  total: num(p.total),
  mes: p.mes,
  anio: p.anio,
  obraSocial: p.obra_social,
  orden: p.orden ?? null,
});

// ─── Lecturas ─────────────────────────────────────────────────────────────────

/** GET /api/validaciones/periodo-actual — período abierto para carga de médicos. */
export const getPeriodoActual = (
  obraSocial: number
): Promise<{ mes: number; anio: number }> =>
  getJSON(`${BASE}/periodo-actual`, { obra_social: obraSocial });

/** GET /api/validaciones/prestaciones */
export const getPrestaciones = async (
  obraSocial: number,
  mes: number,
  anio: number,
  nroSocio?: number
): Promise<Prestacion[]> => {
  const filas = await getJSON<PrestacionApi[]>(`${BASE}/prestaciones`, {
    obra_social: obraSocial,
    mes,
    anio,
    ...(nroSocio ? { nro_socio: nroSocio } : {}),
  });
  return filas.map(toPrestacion);
};

/** GET /api/validaciones/periodos */
export const getPeriodos = async (
  obraSocial: number,
  nroSocio?: number
): Promise<Periodo[]> => {
  const filas = await getJSON<
    { mes: number; anio: number; cantidad: number; total: number | string }[]
  >(`${BASE}/periodos`, {
    obra_social: obraSocial,
    ...(nroSocio ? { nro_socio: nroSocio } : {}),
  });
  return filas.map((p) => ({ ...p, total: num(p.total) }));
};

/** GET /api/validaciones/codigos — nomenclador con el valor de esa obra social. */
export const buscarCodigos = async (
  obraSocial: number,
  q: string,
  limit = 20,
  nroSocio?: number
): Promise<CodigoNomenclador[]> => {
  const filas = await getJSON<CodigoApi[]>(`${BASE}/codigos`, {
    obra_social: obraSocial,
    q,
    limit,
    ...(nroSocio ? { nro_socio: nroSocio } : {}),
  });
  return filas.map((c) => ({
    codigo: c.codigo,
    descripcion: c.descripcion,
    honorarios: num(c.honorarios),
    gastos: num(c.gastos),
    coseguro: num(c.coseguro),
    admitido: c.admitido,
    motivo: c.motivo,
  }));
};

interface AfiliadoNobisApi {
  encontrado: boolean;
  activo: boolean;
  nombre: string | null;
  estado: string;
}

/** GET /api/validaciones/nobis/afiliado — estado en vivo del afiliado (sólo lectura, no bloquea el alta). */
export const consultarAfiliadoNobis = (nroAfiliado: string): Promise<AfiliadoNobisApi> =>
  getJSON<AfiliadoNobisApi>(`${BASE}/nobis/afiliado`, { nro_afiliado: nroAfiliado });

// ─── Escrituras ───────────────────────────────────────────────────────────────

export interface CargarPrestacionPayload {
  obra_social: number;
  codigo: string;
  nombre_afiliado?: string;
  nro_afiliado?: string;
  /** Dígito verificador / orden familiar (Sancor lo pide separado). */
  barra_afiliado?: string;
  nro_validacion?: string;
  /** Token de la credencial — obligatorio en las O.S. que validan en línea. */
  token?: string;
  coseguro?: number;
  cantidad?: number;
  nro_socio?: number;
}

/** POST /api/validaciones/prestaciones — carga manual (Boreal / Omint) y autorización en línea (Sancor / OSPJN / Nobis / OSPM). */
export const cargarPrestacion = async (
  payload: CargarPrestacionPayload
): Promise<Prestacion> => {
  const r = await postJSON<PrestacionApi>(`${BASE}/prestaciones`, payload, {
    timeout: TIMEOUT_OS_EN_LINEA,
  });
  return toPrestacion(r);
};

/** POST /api/validaciones/prestaciones/{id}/orden — sube la orden en PDF. */
export const adjuntarOrden = async (
  id: string,
  archivo: File,
  nroSocio?: number
): Promise<Prestacion> => {
  const form = new FormData();
  form.append("archivo", archivo);
  const qs = nroSocio ? `?nro_socio=${encodeURIComponent(nroSocio)}` : "";
  const r = await postForm<PrestacionApi>(`${BASE}/prestaciones/${id}/orden${qs}`, form);
  return toPrestacion(r);
};

/** DELETE /api/validaciones/prestaciones/{id} — baja lógica (EXISTE='N'). */
export const eliminarPrestacion = (id: string, nroSocio?: number): Promise<void> => {
  // `delJSON` no acepta params, así que el socio va en la query string.
  const qs = nroSocio ? `?nro_socio=${encodeURIComponent(nroSocio)}` : "";
  return delJSON<void>(`${BASE}/prestaciones/${id}${qs}`, {
    timeout: TIMEOUT_OS_EN_LINEA,
  });
};

/** Un dato de acceso a un portal externo, con su rótulo. */
export type CredencialPortal = { label: string; valor: string };

/** GET /api/validaciones/portales/{slug}/credenciales — usuario y clave que el Colegio comparte para un portal externo. */
export const getCredencialesPortal = (slug: string): Promise<CredencialPortal[]> =>
  getJSON<CredencialPortal[]>(`${BASE}/portales/${encodeURIComponent(slug)}/credenciales`);
