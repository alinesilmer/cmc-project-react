import { getJSON, postJSON, patchJSON, delJSON, getJSONWithHeaders, postForm } from "../../lib/http";
import type {
  MedicoOption, ObraSocialOption, NomencladorOption, ClinicaOption,
  AfiliadoRead, PeriodoActivoResponse, PrecioResponse,
  PrestacionRead, PrestacionesCreate, PrestacionesComplementariaCreate, GuardadoResponse,
  PrestacionUpdate, MoverPeriodoPayload, MoverPeriodoResponse,
  CierrePreviewResponse, CierreResponse, CierrePayload, ListarPrestacionesParams,
  FacturaRead, ListarFacturasParams, FacturaDetalleResponse, ComplementoCreate,
} from "./types";

const BASE = "/api/facturacion";

const log = (label: string, params: unknown, data: unknown) => {
  console.groupCollapsed(`%c[facturacion] ${label}`, "color:#0c2a52;font-weight:600");
  console.log("params →", params);
  console.log("response →", data);
  console.groupEnd();
};

const logError = (label: string, params: unknown, err: unknown) => {
  console.groupCollapsed(`%c[facturacion] ${label} ❌`, "color:#cc2a2a;font-weight:600");
  console.log("params →", params);
  console.error("error →", err);
  console.groupEnd();
};

async function traced<T>(label: string, params: unknown, promise: Promise<T>): Promise<T> {
  try {
    const data = await promise;
    log(label, params, data);
    return data;
  } catch (err) {
    logError(label, params, err);
    throw err;
  }
}

export const fetchMedicos = (q: string, limit = 20) =>
  traced("GET /medicos", { q, limit }, getJSON<MedicoOption[]>(`${BASE}/medicos`, { q, limit }));

export const fetchObrasSociales = (q: string, limit = 20) =>
  traced("GET /obras-sociales", { q, limit }, getJSON<ObraSocialOption[]>(`${BASE}/obras-sociales`, { q, limit }));

export const fetchClinicas = (q: string, limit = 20) =>
  traced("GET /clinicas", { q, limit }, getJSON<ClinicaOption[]>(`${BASE}/clinicas`, { q, limit }));

export const fetchCodigosHabilitados = (nroSocio: string, q?: string) =>
  traced(
    `GET /medico/${nroSocio}/codigos-habilitados`,
    { nroSocio, q },
    getJSON<NomencladorOption[]>(`${BASE}/medico/${nroSocio}/codigos-habilitados`, q ? { q } : undefined),
  );

export const fetchAfiliados = (q: string, limit = 20) =>
  traced("GET /afiliados (búsqueda)", { q, limit }, getJSON<AfiliadoRead[]>(`${BASE}/afiliados`, { q, limit }));

export const crearAfiliado = (body: { dni: string; nombre: string }) =>
  traced("POST /afiliados", body, postJSON<AfiliadoRead>(`${BASE}/afiliados`, body));

export const fetchPeriodoActivo = (cod_obra: string) =>
  traced("GET /periodo-activo", { cod_obra }, getJSON<PeriodoActivoResponse>(`${BASE}/periodo-activo`, { cod_obra }));

export const fetchPrecio = (
  cod_medico: string, cod_obra: string, codigo: string, fecha?: string,
) =>
  traced(
    "GET /nomenclador/precio",
    { cod_medico, cod_obra, codigo, fecha },
    getJSON<PrecioResponse>(`${BASE}/nomenclador/precio`, { cod_medico, cod_obra, codigo, fecha }),
  );

export const listarPrestaciones = (filtros: ListarPrestacionesParams) =>
  traced(
    "GET /prestaciones (paginado)",
    filtros,
    getJSONWithHeaders<PrestacionRead[]>(`${BASE}/prestaciones`, filtros as Record<string, any>),
  );

export const listarFacturas = (filtros: ListarFacturasParams) =>
  traced(
    "GET /facturas (paginado)",
    filtros,
    getJSONWithHeaders<FacturaRead[]>(`${BASE}/facturas`, filtros as Record<string, any>),
  );

export const crearComplemento = (payload: ComplementoCreate) =>
  traced(
    "POST /facturas/complemento",
    payload,
    postJSON<FacturaRead>(`${BASE}/facturas/complemento`, payload),
  );

export const fetchFacturaDetalle = (id: number | string) =>
  traced(
    `GET /facturas/${id}/detalle`,
    { id },
    getJSON<FacturaDetalleResponse>(`${BASE}/facturas/${id}/detalle`),
  );

export const fetchPrestacion = (id: number | string) =>
  traced(`GET /prestaciones/${id}`, { id }, getJSON<PrestacionRead>(`${BASE}/prestaciones/${id}`));

export const marcarRevisado = (payload: { marcados?: number[]; desmarcados?: number[] }) =>
  traced(
    "PATCH /prestaciones/revisado",
    payload,
    patchJSON<PrestacionRead[]>(`${BASE}/prestaciones/revisado`, payload),
  );

export const fetchRecientes = (cod_obra: string, usuario?: string) =>
  traced(
    "GET /prestaciones/recientes",
    { cod_obra, usuario },
    getJSON<PrestacionRead[]>(`${BASE}/prestaciones/recientes`, { cod_obra, usuario }),
  );

export const crearPrestaciones = (payload: PrestacionesCreate, confirmar_duplicado = false) =>
  traced(
    `POST /prestaciones${confirmar_duplicado ? "?confirmar_duplicado=true" : ""}`,
    payload,
    postJSON<GuardadoResponse>(
      `${BASE}/prestaciones${confirmar_duplicado ? "?confirmar_duplicado=true" : ""}`,
      payload,
    ),
  );

export const crearPrestacionesComplementaria = (
  payload: PrestacionesComplementariaCreate,
  confirmar_duplicado = false,
) =>
  traced(
    `POST /prestaciones-complementaria${confirmar_duplicado ? "?confirmar_duplicado=true" : ""}`,
    payload,
    postJSON<GuardadoResponse>(
      `${BASE}/prestaciones-complementaria${confirmar_duplicado ? "?confirmar_duplicado=true" : ""}`,
      payload,
    ),
  );

export const editarPrestacion = (id: number, payload: PrestacionUpdate) =>
  traced(
    `PATCH /prestaciones/${id}`,
    payload,
    patchJSON<PrestacionRead>(`${BASE}/prestaciones/${id}`, payload),
  );

export const anularPrestacion = (id: number) =>
  traced(
    `DELETE /prestaciones/${id}`,
    { id },
    delJSON<void>(`${BASE}/prestaciones/${id}`),
  );

export const moverPeriodo = (payload: MoverPeriodoPayload) =>
  traced(
    "POST /prestaciones/mover-periodo",
    payload,
    postJSON<MoverPeriodoResponse>(`${BASE}/prestaciones/mover-periodo`, payload),
  );

export const previewCierre = (cod_obra: string, periodo: string) =>
  traced(
    "GET /cierre/preview",
    { cod_obra, periodo },
    getJSON<CierrePreviewResponse>(`${BASE}/cierre/preview`, { cod_obra, periodo }),
  );

export const cerrarPeriodo = (payload: CierrePayload) => {
  const form = new FormData();
  form.append("cod_obra", payload.cod_obra);
  form.append("periodo", payload.periodo);
  if (payload.tipo_factura) form.append("tipo_factura", payload.tipo_factura);
  if (payload.nro_factura) form.append("nro_factura", payload.nro_factura);
  if (payload.archivo) form.append("archivo", payload.archivo);

  return traced(
    "POST /cierre",
    { cod_obra: payload.cod_obra, periodo: payload.periodo, tipo_factura: payload.tipo_factura, nro_factura: payload.nro_factura, archivo: payload.archivo?.name },
    postForm<CierreResponse>(`${BASE}/cierre`, form),
  );
};

