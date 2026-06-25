import { getJSON, postJSON, patchJSON, delJSON, getJSONWithHeaders } from "../../lib/http";
import type {
  MedicoOption, ObraSocialOption, NomencladorOption,
  AfiliadoRead, PeriodoActivoResponse, PrecioResponse,
  PrestacionRead, PrestacionesCreate, GuardadoResponse,
  PrestacionUpdate, MoverPeriodoPayload, MoverPeriodoResponse,
  CierrePreviewResponse, CierreResponse, ListarPrestacionesParams,
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

export const fetchNomenclador = (q: string, limit = 20) =>
  traced("GET /nomenclador", { q, limit }, getJSON<NomencladorOption[]>(`${BASE}/nomenclador`, { q, limit }));

export const fetchAfiliado = (dni: string) =>
  traced(`GET /afiliados/${dni}`, { dni }, getJSON<AfiliadoRead>(`${BASE}/afiliados/${dni}`));

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

export const cerrarPeriodo = (cod_obra: string, periodo: string) =>
  traced(
    "POST /cierre",
    { cod_obra, periodo },
    postJSON<CierreResponse>(`${BASE}/cierre`, { cod_obra, periodo }),
  );
