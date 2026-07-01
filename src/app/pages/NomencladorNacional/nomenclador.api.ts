import { getJSON, postJSON, putJSON, patchJSON, delJSON, postForm } from "../../lib/http";
import type {
  NomencladorOut,
  NomencladorListParams,
  NomencladorCreatePayload,
  NomencladorUpdatePayload,
  GalenoOut,
  GalenoCreatePayload,
  GalenoCreateNivelesPayload,
  GalenoUpdatePayload,
  GalenoActualizarPrecioPayload,
  GalenoActualizarPrecioMasivoPayload,
  GalenoActualizarUnidadesPayload,
  GalenoActualizarUnidadesResult,
  GalenosImportarPayload,
  GalenosImportarResult,
  ActualizacionMasivaResult,
  ValorOut,
  ValorCreatePayload,
  ValorUpdatePayload,
  ValorActualizarPayload,
  TablaValorItem,
  NomencladorEspecialidadOut,
  ImportarCSVResult,
} from "./nomenclador.types";

// ─── Nomenclador ──────────────────────────────────────────────────────────────

export const listNomenclador = (params?: NomencladorListParams): Promise<NomencladorOut[]> =>
  getJSON<NomencladorOut[]>("/api/nomenclador/", params);

export const getNomencladorById = (id: number): Promise<NomencladorOut> =>
  getJSON<NomencladorOut>(`/api/nomenclador/${id}`);

export const createNomenclador = (payload: NomencladorCreatePayload): Promise<NomencladorOut> =>
  postJSON<NomencladorOut>("/api/nomenclador/", payload);

export const updateNomenclador = (id: number, payload: NomencladorUpdatePayload): Promise<NomencladorOut> =>
  putJSON<NomencladorOut>(`/api/nomenclador/${id}`, payload);

export const toggleNomencladorActivo = (id: number, activo: boolean): Promise<NomencladorOut> =>
  patchJSON<NomencladorOut>(`/api/nomenclador/${id}/activar?activo=${activo}`);

export const deleteNomenclador = (id: number): Promise<void> =>
  delJSON<void>(`/api/nomenclador/${id}`);

// ─── Galenos ──────────────────────────────────────────────────────────────────

export const listGalenos = (params?: {
  obra_social_nro?: number;
  codigo?: string;
  nivel?: number;
  vigente_a?: string;
}): Promise<GalenoOut[]> =>
  getJSON<GalenoOut[]>("/api/galenos/", params);

export const getHistorialGaleno = (obra_social_nro: number, codigo: string, nivel?: number): Promise<GalenoOut[]> =>
  getJSON<GalenoOut[]>(`/api/galenos/historial/${obra_social_nro}/${codigo}`, nivel != null ? { nivel } : undefined);

export const createGaleno = (payload: GalenoCreatePayload): Promise<GalenoOut> =>
  postJSON<GalenoOut>("/api/galenos/", payload);

export const createNivelesGaleno = (payload: GalenoCreateNivelesPayload): Promise<GalenoOut[]> =>
  postJSON<GalenoOut[]>("/api/galenos/crear_niveles", payload);

export const updateGaleno = (id: number, payload: GalenoUpdatePayload): Promise<GalenoOut> =>
  putJSON<GalenoOut>(`/api/galenos/${id}`, payload);

export const actualizarPrecioGaleno = (
  id: number,
  payload: GalenoActualizarPrecioPayload
): Promise<GalenoOut> =>
  postJSON<GalenoOut>(`/api/galenos/${id}/actualizar_precio`, payload);

export const actualizarPrecioMasivoGaleno = (
  payload: GalenoActualizarPrecioMasivoPayload
): Promise<ActualizacionMasivaResult> =>
  postJSON<ActualizacionMasivaResult>("/api/galenos/actualizar_precio_masivo", payload);

export const deleteGaleno = (id: number): Promise<void> =>
  delJSON<void>(`/api/galenos/${id}`);

export const getGalenoById = (id: number): Promise<GalenoOut> =>
  getJSON<GalenoOut>(`/api/galenos/${id}`);

export const actualizarUnidadesGaleno = (
  id: number,
  payload: GalenoActualizarUnidadesPayload
): Promise<GalenoActualizarUnidadesResult> =>
  postJSON<GalenoActualizarUnidadesResult>(`/api/galenos/${id}/actualizar_unidades`, payload);

export const importarGalenosDeObraSocial = (
  payload: GalenosImportarPayload
): Promise<GalenosImportarResult> =>
  postJSON<GalenosImportarResult>("/api/galenos/importar_de_obra_social", payload);

// ─── Valores ──────────────────────────────────────────────────────────────────

export const listValores = (params: {
  obra_social_nro: number;
  codigo?: string;
  nivel?: number;
  especialidad_id_colegio?: number;
  estado?: string;
  vigente_a?: string;
  page?: number;
  size?: number;
}): Promise<ValorOut[]> =>
  getJSON<ValorOut[]>("/api/valores_nm/", params);

export const createValor = (payload: ValorCreatePayload): Promise<ValorOut> =>
  postJSON<ValorOut>("/api/valores_nm/", payload);

export const actualizarValor = (id: number, payload: ValorActualizarPayload): Promise<ValorOut> =>
  postJSON<ValorOut>(`/api/valores_nm/${id}/actualizar`, payload);

// Cantidad de valores ya cargados para una OS en una vigencia exacta (guard anti doble carga).
export const contarValoresPorVigencia = (
  obra_social_nro: number,
  vigencia_desde: string,
): Promise<{ obra_social_nro: number; vigencia_desde: string; cantidad: number }> =>
  getJSON("/api/valores_nm/por_vigencia", { obra_social_nro, vigencia_desde });

// Vigencias con valores cargados para una OS (para el selector del modal de eliminación).
export const listVigenciasCargadas = (
  obra_social_nro: number,
): Promise<{ vigencia_desde: string; cantidad: number }[]> =>
  getJSON("/api/valores_nm/vigencias", { obra_social_nro });

// Elimina todos los valores (con componentes e historial) de una OS en una vigencia exacta.
export const eliminarValoresPorVigencia = (
  obra_social_nro: number,
  vigencia_desde: string,
): Promise<{ eliminados: number }> => {
  const qs = new URLSearchParams({
    obra_social_nro: String(obra_social_nro),
    vigencia_desde,
  }).toString();
  return delJSON(`/api/valores_nm/por_vigencia?${qs}`);
};

// Importa un CSV (formato por componente) de valores para una OS y vigencia.
export const importarValoresCsv = (
  file: File,
  obra_social_nro: number,
  vigencia_desde: string,
): Promise<ImportarCSVResult> => {
  const fd = new FormData();
  fd.append("file", file);
  const qs = new URLSearchParams({
    obra_social_nro: String(obra_social_nro),
    vigencia_desde,
  }).toString();
  return postForm<ImportarCSVResult>(`/api/valores_nm/importar_csv?${qs}`, fd);
};

export const getValorById = (id: number): Promise<ValorOut> =>
  getJSON<ValorOut>(`/api/valores_nm/${id}`);

export const updateValorMetadata = (id: number, payload: ValorUpdatePayload): Promise<ValorOut> =>
  putJSON<ValorOut>(`/api/valores_nm/${id}`, payload);

export const deleteValor = (id: number): Promise<void> =>
  delJSON<void>(`/api/valores_nm/${id}`);

// ─── Reportes ─────────────────────────────────────────────────────────────────

export const getTablaValores = (params: {
  obra_social_nro: number;
  fecha?: string;
  codigo?: string;
  orden?: "codigo" | "valor";
  page?: number;
  size?: number;
}): Promise<TablaValorItem[]> =>
  getJSON<TablaValorItem[]>("/api/reportes_nm/tabla_valores", params);

// ─── Nomenclador Especialidades ───────────────────────────────────────────────

export const getNomencladorEspecialidades = (id: number): Promise<NomencladorEspecialidadOut[]> =>
  getJSON<NomencladorEspecialidadOut[]>(`/api/nomenclador/${id}/especialidades`);
