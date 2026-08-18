// Cliente del módulo de validaciones — /api/validaciones (cmc_api).
//
// Lo que se valida se guarda en `detalle_facturacion` con `origen_carga='medico'`,
// en el período que devuelve `periodo_medico_actual` para esa obra social: la
// misma tabla y el mismo puntero que usa la carga del médico en facturación, así
// que entra derecho a la liquidación. Lo que la obra social contestó queda en las
// columnas `validacion_*` de esa misma fila.
//
// La escritura (POST /prestaciones) hoy acepta las de carga manual —Boreal (285)
// y Omint (243)— y Sancor (411) en línea. Para el resto el backend responde 422
// con el detalle; ver `cargaImplementada` en validaciones.config.ts.
//
// Una prestación que la obra social NO autorizó se graba igual (para que el
// prestador vea qué pasó) pero con importe 0 y fuera de la factura.

import { delJSON, getJSON, postForm, postJSON } from "../../lib/http";
import type {
  CodigoNomenclador,
  Periodo,
  Prestacion,
  PrestadorInfo,
} from "./validaciones.types";

const BASE = "/api/validaciones";

// Timeout de las llamadas que hacen que el backend consulte a la obra social.
//
// El default de axios (15 s, ver lib/http.ts) es más corto que lo que el propio
// backend está dispuesto a esperar: `SANCOR_TIMEOUT` es 30 s. Con esa
// diferencia, el navegador abandonaba operaciones que el servidor terminaba
// igual — verificado el 2026-08-17, una baja que el backend resolvió en 30,3 s
// y el panel reportó como "no pudimos eliminar la prestación", con la
// prestación ya anulada.
//
// Cuando el alta es la que aparenta fallar el problema es peor: el médico
// reintenta y **se emite una segunda autorización real**, consumiendo otro
// token del afiliado.
//
// 45 s = los 30 del backend + margen para la base, el espejo al sistema viejo y
// la red. Si sube `SANCOR_TIMEOUT`, subir esto también: tiene que ser siempre
// mayor, nunca al revés.
const TIMEOUT_OS_EN_LINEA = 45_000;

/** `true` si la request se cortó del lado del navegador y no del servidor.
 *
 * Es la distinción que importa: un 4xx/5xx significa que el backend decidió y
 * la operación no se hizo; un corte por timeout significa que **no sabemos** en
 * qué quedó, y hay que ir a mirar antes de reintentar. */
export const esTimeoutDeRed = (err: unknown): boolean => {
  const e = err as { code?: string; message?: string; response?: unknown } | null;
  if (!e) return false;
  if (e.code === "ECONNABORTED" || e.code === "ETIMEDOUT") return true;
  // Sin `response` no hubo respuesta del servidor; el texto de axios para el
  // corte por tiempo es "timeout of 45000ms exceeded".
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
}

interface CodigoApi {
  codigo: string;
  descripcion: string;
  honorarios: number | string;
  gastos: number | string;
  total: number | string;
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
});

// ─── Lecturas ─────────────────────────────────────────────────────────────────

/** GET /api/validaciones/prestador */
export const getPrestador = async (nroSocio?: number): Promise<PrestadorInfo> => {
  const r = await getJSON<{
    nro_socio: number;
    nombre: string;
    matricula: number;
    categoria: string;
  }>(`${BASE}/prestador`, nroSocio ? { nro_socio: nroSocio } : undefined);
  return {
    nroSocio: r.nro_socio,
    nombre: r.nombre,
    matricula: String(r.matricula),
    especialidad: "",
  };
};

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
  limit = 20
): Promise<CodigoNomenclador[]> => {
  const filas = await getJSON<CodigoApi[]>(`${BASE}/codigos`, {
    obra_social: obraSocial,
    q,
    limit,
  });
  return filas.map((c) => ({
    codigo: c.codigo,
    descripcion: c.descripcion,
    honorarios: num(c.honorarios),
    gastos: num(c.gastos),
    admitido: c.admitido,
    motivo: c.motivo,
  }));
};

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

/** POST /api/validaciones/prestaciones — carga manual (Boreal / Omint) y
 * autorización en línea (Sancor / OSPJN / Nobis / OSPM). */
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

/** DELETE /api/validaciones/prestaciones/{id} — baja lógica (EXISTE='N').
 *
 * En Sancor y Nobis además intenta anular la autorización en la obra social
 * antes de marcar nada, así que también depende de un tercero. */
export const eliminarPrestacion = (id: string, nroSocio?: number): Promise<void> => {
  // `delJSON` no acepta params, así que el socio va en la query string.
  const qs = nroSocio ? `?nro_socio=${encodeURIComponent(nroSocio)}` : "";
  return delJSON<void>(`${BASE}/prestaciones/${id}${qs}`, {
    timeout: TIMEOUT_OS_EN_LINEA,
  });
};
