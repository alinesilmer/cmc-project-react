import {
  getJSON,
  postJSON,
  putJSON,
  patchJSON,
  delJSON,
  http,
  postForm,
} from "@/app/shared/lib/http";
import type {
  NomencladorOut,
  NomencladorDetalleOut,
  AplicarEspecialidadesResult,
  AltaCodigosPayload,
  AltaCodigoResultado,
  CodigoObraSocialOut,
  CodigoObraSocialUpdate,
  CodigosPorOSResult,
  EstadoCodigoOS,
  FichaCodigoOut,
  PropagarEspecialidadesResult,
  PropagarModo,
  RevalorizarResult,
  NomencladorListParams,
  NomencladorCreatePayload,
  NomencladorUpdatePayload,
  NomencladorNacionalOut,
  NomencladorNacionalListParams,
  NomencladorNacionalCreatePayload,
  NomencladorNacionalUpdatePayload,
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
  GalenoImportarLotePayload,
  GalenoImportarLoteResult,
  GalenoPlantillaOut,
  GalenoVisibilidadResult,
  ComponentesNNSugeridos,
  CompletarBaseNNResult,
  ActualizacionMasivaResult,
  ValorOut,
  ValorCreatePayload,
  ValorCreateMultiPayload,
  ValorUpdatePayload,
  ValorActualizarPayload,
  ValorNucleoPayload,
  TablaValorItem,
  ViaPractica,
  CodigoPorEspecialidadOut,
  CodigoPorEspecialidadParams,
  ImportarCSVResult,
  ActualizarPorcentajePayload,
  RevertirActualizacionPayload,
  AumentoPorcentualResult,
  ValorDocumentoOut,
  MesActualizaciones,
  ResumenVigenciaOut,
  ObraSocialFamiliaItem,
  ReplicarFamiliaResult,
  ReplicarValoresFamiliaPayload,
  ReplicarGalenoFamiliaPayload,
} from "./nomenclador.types";

// ─── Nomenclador ──────────────────────────────────────────────────────────────

export const listNomenclador = (
  params?: NomencladorListParams,
): Promise<NomencladorOut[]> =>
  getJSON<NomencladorOut[]>("/api/nomenclador/", params);

export const getNomencladorById = (id: number): Promise<NomencladorDetalleOut> =>
  getJSON<NomencladorDetalleOut>(`/api/nomenclador/${id}`);

// Solo los códigos del catálogo (para auto-detección/validación en importaciones).
export const listNomencladorCodigos = (): Promise<string[]> =>
  getJSON<string[]>("/api/nomenclador/codigos", { activo: true });

export const createNomenclador = (
  payload: NomencladorCreatePayload,
): Promise<NomencladorDetalleOut> =>
  postJSON<NomencladorDetalleOut>("/api/nomenclador/", payload);

export const updateNomenclador = (
  id: number,
  payload: NomencladorUpdatePayload,
): Promise<NomencladorDetalleOut> =>
  putJSON<NomencladorDetalleOut>(`/api/nomenclador/${id}`, payload);

/** Aplica la plantilla YA guardada del código a las obras sociales dadas. */
/**
 * Timeout para las operaciones masivas, que pueden tardar minutos contra la
 * base de prod. Ejemplo: aplicar el 420351 a 65 O.S. × ~35 especialidades
 * creó 2.260 filas en ~100 s. Con el default de 15 s el navegador cortaba y
 * mostraba error mientras el backend terminaba bien.
 */
const TIMEOUT_MASIVO_MS = 10 * 60_000;

export const aplicarEspecialidades = (
  id: number,
  obra_social_nros: number[],
): Promise<AplicarEspecialidadesResult> =>
  postJSON<AplicarEspecialidadesResult>(
    `/api/nomenclador/${id}/aplicar-especialidades`,
    { obra_social_nros },
    { timeout: TIMEOUT_MASIVO_MS },
  );

export const toggleNomencladorActivo = (
  id: number,
  activo: boolean,
): Promise<NomencladorOut> =>
  patchJSON<NomencladorOut>(`/api/nomenclador/${id}/activar?activo=${activo}`);

export const deleteNomenclador = (id: number): Promise<void> =>
  delJSON<void>(`/api/nomenclador/${id}`);

// ─── Nomenclador Nacional ───────────────────────────────────────────────────
// Catálogo NN, independiente del catálogo del Colegio de arriba. Uno o varios
// códigos del Colegio pueden vincularse a la misma fila acá.

export const listNomencladorNacional = (
  params?: NomencladorNacionalListParams,
): Promise<NomencladorNacionalOut[]> =>
  getJSON<NomencladorNacionalOut[]>("/api/nomenclador_nacional/", params);

export const listNomencladorNacionalCodigos = (): Promise<string[]> =>
  getJSON<string[]>("/api/nomenclador_nacional/codigos", { activo: true });

export const getNomencladorNacionalById = (id: number): Promise<NomencladorNacionalOut> =>
  getJSON<NomencladorNacionalOut>(`/api/nomenclador_nacional/${id}`);

export const createNomencladorNacional = (
  payload: NomencladorNacionalCreatePayload,
): Promise<NomencladorNacionalOut> =>
  postJSON<NomencladorNacionalOut>("/api/nomenclador_nacional/", payload);

export const updateNomencladorNacional = (
  id: number,
  payload: NomencladorNacionalUpdatePayload,
): Promise<NomencladorNacionalOut> =>
  putJSON<NomencladorNacionalOut>(`/api/nomenclador_nacional/${id}`, payload);

export const toggleNomencladorNacionalActivo = (
  id: number,
  activo: boolean,
): Promise<NomencladorNacionalOut> =>
  patchJSON<NomencladorNacionalOut>(
    `/api/nomenclador_nacional/${id}/activar?activo=${activo}`,
  );

export const deleteNomencladorNacional = (id: number): Promise<void> =>
  delJSON<void>(`/api/nomenclador_nacional/${id}`);

// ─── Galenos ──────────────────────────────────────────────────────────────────

export const listGalenos = (params?: {
  obra_social_nro?: number;
  codigo?: string;
  nivel?: number;
  vigente_a?: string;
}): Promise<GalenoOut[]> => getJSON<GalenoOut[]>("/api/galenos/", params);

export const getHistorialGaleno = (
  obra_social_nro: number,
  codigo: string,
  nivel?: number,
): Promise<GalenoOut[]> =>
  getJSON<GalenoOut[]>(
    `/api/galenos/historial/${obra_social_nro}/${codigo}`,
    nivel != null ? { nivel } : undefined,
  );

export const createGaleno = (
  payload: GalenoCreatePayload,
): Promise<GalenoOut> => postJSON<GalenoOut>("/api/galenos/", payload);

export const createNivelesGaleno = (
  payload: GalenoCreateNivelesPayload,
): Promise<GalenoOut[]> =>
  postJSON<GalenoOut[]>("/api/galenos/crear_niveles", payload);

export const updateGaleno = (
  id: number,
  payload: GalenoUpdatePayload,
): Promise<GalenoOut> => putJSON<GalenoOut>(`/api/galenos/${id}`, payload);

/** POST /api/galenos/importar_lote — alta masiva desde una planilla. */
export const importarLoteGalenos = (
  payload: GalenoImportarLotePayload,
): Promise<GalenoImportarLoteResult> =>
  postJSON<GalenoImportarLoteResult>("/api/galenos/importar_lote", payload);

export const actualizarPrecioGaleno = (
  id: number,
  payload: GalenoActualizarPrecioPayload,
): Promise<GalenoOut> =>
  postJSON<GalenoOut>(`/api/galenos/${id}/actualizar_precio`, payload);

export const actualizarPrecioMasivoGaleno = (
  payload: GalenoActualizarPrecioMasivoPayload,
): Promise<ActualizacionMasivaResult> =>
  postJSON<ActualizacionMasivaResult>(
    "/api/galenos/actualizar_precio_masivo",
    payload,
  );

/** Muestra/oculta el galeno (todos sus niveles) de una OS en el boletín del médico. */
export const cambiarVisibilidadGaleno = (payload: {
  obra_social_nro: number;
  codigo: string;
  visible: boolean;
}): Promise<GalenoVisibilidadResult> =>
  patchJSON<GalenoVisibilidadResult>("/api/galenos/visibilidad", payload);

export const deleteGaleno = (id: number): Promise<void> =>
  delJSON<void>(`/api/galenos/${id}`);

export const getGalenoById = (id: number): Promise<GalenoOut> =>
  getJSON<GalenoOut>(`/api/galenos/${id}`);

export const actualizarUnidadesGaleno = (
  id: number,
  payload: GalenoActualizarUnidadesPayload,
): Promise<GalenoActualizarUnidadesResult> =>
  postJSON<GalenoActualizarUnidadesResult>(
    `/api/galenos/${id}/actualizar_unidades`,
    payload,
  );

export const importarGalenosDeObraSocial = (
  payload: GalenosImportarPayload,
): Promise<GalenosImportarResult> =>
  postJSON<GalenosImportarResult>(
    "/api/galenos/importar_de_obra_social",
    payload,
  );

// ─── Plantillas de Galenos (solo lectura) ──────────────────────────────────────

export const listGalenoPlantillas = (): Promise<GalenoPlantillaOut[]> =>
  getJSON<GalenoPlantillaOut[]>("/api/galenos/plantillas");

export const getGalenoPlantilla = (grupo: string): Promise<GalenoPlantillaOut> =>
  getJSON<GalenoPlantillaOut>(`/api/galenos/plantillas/${grupo}`);

// ─── Valores ──────────────────────────────────────────────────────────────────

export const listValores = (params: {
  obra_social_nro: number;
  codigo?: string;
  nivel?: number;
  especialidad_id_colegio?: number;
  estado?: string;
  vigente_a?: string;
  /** Filtra por la vigencia exacta (no "vigente a la fecha X"). */
  vigencia_desde?: string;
  page?: number;
  size?: number;
}): Promise<ValorOut[]> => getJSON<ValorOut[]>("/api/valores_nm/", params);

export const createValor = (payload: ValorCreatePayload): Promise<ValorOut> =>
  postJSON<ValorOut>("/api/valores_nm/", payload);

// Alta de una variante NE para varias especialidades a la vez (mismo precio, misma
// vigencia): reemplaza el rol que tenía cargar un NNE.
export const createValorMulti = (
  payload: ValorCreateMultiPayload,
): Promise<ValorOut[]> => postJSON<ValorOut[]>("/api/valores_nm/multi", payload);

export const actualizarValor = (
  id: number,
  payload: ValorActualizarPayload,
): Promise<ValorOut> =>
  postJSON<ValorOut>(`/api/valores_nm/${id}/actualizar`, payload);

// Aumento/baja porcentual lineal sobre los valores fijos de una OS (por origen),
// opcionalmente acotado por códigos o por rango. Devuelve actualizados/omitidos/errores.
// Aumento porcentual de valores fijos y/o galenos. Con `dry_run` es la vista previa.
export const actualizarPorcentajeValores = (
  payload: ActualizarPorcentajePayload,
): Promise<AumentoPorcentualResult> =>
  postJSON<AumentoPorcentualResult>(
    "/api/valores_nm/actualizar_porcentaje",
    payload,
    { timeout: TIMEOUT_MASIVO_MS },
  );

// Revierte el aumento de una fecha: solo valores abiertos por un aumento y galenos
// rotados ese día. Con `dry_run` muestra qué se revertiría.
export const revertirActualizacionValores = (
  payload: RevertirActualizacionPayload,
): Promise<AumentoPorcentualResult> =>
  postJSON<AumentoPorcentualResult>(
    "/api/valores_nm/revertir_ultima_actualizacion",
    payload,
    { timeout: TIMEOUT_MASIVO_MS },
  );

// Cantidad de valores ya cargados para una OS en una vigencia exacta (guard anti doble carga).
export const contarValoresPorVigencia = (
  obra_social_nro: number,
  vigencia_desde: string,
): Promise<{
  obra_social_nro: number;
  vigencia_desde: string;
  cantidad: number;
}> =>
  getJSON("/api/valores_nm/por_vigencia", { obra_social_nro, vigencia_desde });

// Códigos ya cargados para una OS en una vigencia exacta. Permite cargar la misma
// vigencia por partes (varias hojas): se omiten los códigos ya presentes.
export const listCodigosPorVigencia = (
  obra_social_nro: number,
  vigencia_desde: string,
): Promise<{ obra_social_nro: number; vigencia_desde: string; codigos: string[] }> =>
  getJSON("/api/valores_nm/codigos_por_vigencia", { obra_social_nro, vigencia_desde });

// Vigencias con valores cargados para una OS (para el selector del modal de eliminación).
export const listVigenciasCargadas = (
  obra_social_nro: number,
): Promise<{ vigencia_desde: string; cantidad: number }[]> =>
  getJSON("/api/valores_nm/vigencias", { obra_social_nro });

/**
 * Cuándo y cuánto actualizó esta obra social, ya agregado por vigencia —
 * cantidad de códigos y variación promedio contra la versión anterior de cada
 * uno. Sale de `nm_historial_precio_codigo`, no de bajar la grilla completa de
 * `/api/valores_nm/`. Alimenta la vista "Actualizaciones porcentuales" del
 * historial. Ver auditoría H-01/H-02.
 */
export const getResumenPorVigencia = (
  obra_social_nro: number,
): Promise<ResumenVigenciaOut[]> =>
  getJSON<ResumenVigenciaOut[]>("/api/valores_nm/resumen_por_vigencia", { obra_social_nro });

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

export const updateValorMetadata = (
  id: number,
  payload: ValorUpdatePayload,
): Promise<ValorOut> => putJSON<ValorOut>(`/api/valores_nm/${id}`, payload);

export const updateNucleoPar = (
  obra_social_nro: number,
  nomenclador_id: number,
  payload: ValorNucleoPayload,
): Promise<ValorOut[]> =>
  putJSON<ValorOut[]>(`/api/valores_nm/par/${obra_social_nro}/${nomenclador_id}`, payload);

export const deleteValor = (id: number): Promise<void> =>
  delJSON<void>(`/api/valores_nm/${id}`);

// ─── Reportes ─────────────────────────────────────────────────────────────────

export const getTablaValores = async (params: {
  obra_social_nro: number;
  fecha?: string;
  codigo?: string;
  /** IDs de especialidad del colegio, en orden de prioridad (la principal primero). */
  especialidades?: number[];
  orden?: "codigo" | "valor";
  page?: number;
  size?: number;
  via?: ViaPractica;
}): Promise<TablaValorItem[]> => {
  const { data } = await http.get<TablaValorItem[]>(
    "/api/reportes_nm/tabla_valores",
    {
      params,
      // El backend espera el param repetido (`especialidades=5&especialidades=12`),
      // no con corchetes (`especialidades[]=5`), que es lo que serializa axios por default.
      paramsSerializer: { indexes: null },
    },
  );
  return data;
};

// ─── Códigos por especialidad (solo lectura, por obra social) ────────────────
// Las especialidades se editan desde el modal de Valores (updateValorMetadata,
// ver ValorUpdatePayload.especialidades) — esto es únicamente para consultarlas.

export const listCodigosPorEspecialidad = (
  params: CodigoPorEspecialidadParams,
): Promise<CodigoPorEspecialidadOut[]> =>
  getJSON<CodigoPorEspecialidadOut[]>("/api/nomenclador/especialidades", params);

// ─── Documentos de una vigencia de valores ────────────────────────────────────
// El respaldo de cada actualización de precios: lo que la obra social mandó.
// Ver app/modules/nomenclador/routes_valores_documentos.py.

export const listValorDocumentos = (
  obra_social_nro: number,
  vigencia_desde?: string,
): Promise<ValorDocumentoOut[]> =>
  getJSON<ValorDocumentoOut[]>("/api/valores_nm/documentos", {
    obra_social_nro,
    ...(vigencia_desde ? { vigencia_desde } : {}),
  });

/** Multipart: PDF, Excel (.xlsx/.xls) o CSV. */
export const subirValorDocumento = (params: {
  obra_social_nro: number;
  vigencia_desde: string;
  archivo: File;
  descripcion?: string;
}): Promise<ValorDocumentoOut> => {
  const form = new FormData();
  form.append("obra_social_nro", String(params.obra_social_nro));
  form.append("vigencia_desde", params.vigencia_desde);
  form.append("archivo", params.archivo);
  if (params.descripcion?.trim()) form.append("descripcion", params.descripcion.trim());
  return postForm<ValorDocumentoOut>("/api/valores_nm/documentos", form);
};

export const eliminarValorDocumento = (id: number): Promise<void> =>
  delJSON<void>(`/api/valores_nm/documentos/${id}`);

/**
 * Qué obras sociales actualizaron valores, por mes de vigencia.
 * Una sola llamada: el backend agrupa y devuelve ~9 meses. `nomenclador:leer`.
 */
export const getActualizacionesPorMes = (): Promise<MesActualizaciones[]> =>
  getJSON<MesActualizaciones[]>("/api/valores_nm/actualizaciones");

// ─── Replicar en obras sociales de la misma familia ──────────────────────────

/**
 * Completa los 7 galenos base y los NN que le falten a una OS, sin tocar lo que
 * ya tiene. `dry_run` = vista previa (no guarda nada).
 */
export const completarBaseNN = (
  obra_social_nro: number,
  dry_run: boolean,
): Promise<CompletarBaseNNResult> =>
  postJSON<CompletarBaseNNResult>(
    "/api/valores_nm/completar_base_nn",
    { obra_social_nro, dry_run },
    { timeout: TIMEOUT_MASIVO_MS },
  );

/** Componentes de un NN para precargar el alta: misma regla que la generación automática. */
export const getComponentesNN = (
  obra_social_nro: number,
  nomenclador_id: number,
): Promise<ComponentesNNSugeridos> =>
  getJSON<ComponentesNNSugeridos>("/api/valores_nm/componentes_nn", {
    obra_social_nro,
    nomenclador_id,
  });

/** Las OTRAS obras sociales activas de la familia (planes de la misma empresa). */
export const getFamiliaObraSocial = (nro: number): Promise<ObraSocialFamiliaItem[]> =>
  getJSON<ObraSocialFamiliaItem[]>(`/api/obras_social/familia/${nro}`);

export const replicarValoresEnFamilia = (
  payload: ReplicarValoresFamiliaPayload,
): Promise<ReplicarFamiliaResult> =>
  postJSON<ReplicarFamiliaResult>("/api/valores_nm/replicar_en_familia", payload, {
    timeout: TIMEOUT_MASIVO_MS,
  });

export const replicarGalenoEnFamilia = (
  payload: ReplicarGalenoFamiliaPayload,
): Promise<ReplicarFamiliaResult> =>
  postJSON<ReplicarFamiliaResult>("/api/galenos/replicar_en_familia", payload, {
    timeout: TIMEOUT_MASIVO_MS,
  });

// ─── Flujo en 4 etapas ────────────────────────────────────────────────────────

/** Ficha del código: su estado en cada obra social activa. */
export const getFichaCodigo = (id: number): Promise<FichaCodigoOut> =>
  getJSON<FichaCodigoOut>(`/api/nomenclador/${id}/ficha`);

/** Etapa 2: quién puede facturar el código según el Colegio (no toca ninguna O.S.). */
export const guardarPlantillaEspecialidades = (
  id: number,
  payload: { sin_restriccion_especialidad: boolean; especialidades: number[] },
) =>
  putJSON<{ especialidades: number[]; sin_restriccion_especialidad: boolean }>(
    `/api/nomenclador/${id}/especialidades`,
    payload,
  );

/** Etapa 2 → O.S. que ya tienen el código: agregar lo nuevo o igualar a la plantilla. */
export const propagarPlantillaEspecialidades = (
  id: number,
  payload: { obra_social_nros: number[]; modo: PropagarModo; dry_run: boolean },
): Promise<PropagarEspecialidadesResult> =>
  postJSON<PropagarEspecialidadesResult>(
    `/api/nomenclador/${id}/especialidades/propagar`,
    payload,
    { timeout: TIMEOUT_MASIVO_MS },
  );

/** Etapa 3: códigos del catálogo con su estado en una O.S. */
export const listCodigosPorOS = (params: {
  obra_social_nro: number;
  estado?: EstadoCodigoOS;
  q?: string;
  page?: number;
  size?: number;
}): Promise<CodigosPorOSResult> => getJSON<CodigosPorOSResult>("/api/codigos_os/", params);

export const getCodigoOS = (os: number, nomencladorId: number): Promise<CodigoObraSocialOut> =>
  getJSON<CodigoObraSocialOut>(`/api/codigos_os/${os}/${nomencladorId}`);

export const darDeAltaCodigos = (
  payload: AltaCodigosPayload,
): Promise<{ resultados: AltaCodigoResultado[] }> =>
  postJSON<{ resultados: AltaCodigoResultado[] }>("/api/codigos_os/alta", payload, {
    timeout: TIMEOUT_MASIVO_MS,
  });

export const updateCodigoOS = (
  os: number,
  nomencladorId: number,
  payload: CodigoObraSocialUpdate,
): Promise<CodigoObraSocialOut> =>
  patchJSON<CodigoObraSocialOut>(`/api/codigos_os/${os}/${nomencladorId}`, payload);

export const cambiarEstadoCodigoOS = (
  os: number,
  nomencladorId: number,
  accion: "suspender" | "reactivar",
): Promise<CodigoObraSocialOut> =>
  postJSON<CodigoObraSocialOut>(`/api/codigos_os/${os}/${nomencladorId}/${accion}`);

/** Prestaciones abiertas cargadas en $0 por falta de precio → recalcularlas. */
export const revalorizarPrestaciones = (payload: {
  cod_obra: string;
  codigo: string;
  ids?: number[];
  dry_run: boolean;
}): Promise<RevalorizarResult> =>
  postJSON<RevalorizarResult>("/api/facturacion/revalorizar", payload, {
    timeout: TIMEOUT_MASIVO_MS,
  });

