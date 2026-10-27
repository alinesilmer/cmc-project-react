import type { TipoCodigo } from "./historial.types";

export type Complejidad = "baja" | "media" | "alta";
export type ValorEstado = "activo" | "cerrado";

/** Catálogo del Colegio — puro: código + clasificación + vínculo opcional al Nomenclador Nacional. */
export type NomencladorOut = {
  id: number;
  codigo: string;
  /** Descripción DEFAULT del catálogo (opcional): sugerencia, no fuente de verdad. */
  descripcion: string | null;
  categoria: string | null;
  complejidad: Complejidad | null;
  /** Código del Nomenclador Nacional vinculado (alimenta la generación de Valores NN). */
  nomenclador_nacional_id: number | null;
  /** Default de catálogo: `null` = el catálogo no opina. */
  sin_restriccion_especialidad: boolean | null;
  activo: boolean;
  observacion: string | null;
  created_at: string;
  updated_at: string;
};

/** `NomencladorOut` + la plantilla de especialidades sugeridas (ID_COLEGIO_ESPE). */
export type NomencladorDetalleOut = NomencladorOut & {
  especialidades: number[];
};

export type NomencladorListParams = {
  q?: string;
  /** Con `q`: busca también en la descripción del catálogo. */
  en_descripcion?: boolean;
  categoria?: string;
  /** Consulta / Practica / Honorarios individuales; sin categoría cuenta como Practica. */
  tipo?: TipoCodigo;
  complejidad?: string;
  /** Solo cambia algo para el rol médico (acota a sus códigos habilitados en esa OS). */
  obra_social_nro?: number;
  activo?: boolean;
  page?: number;
  size?: number;
};

export type NomencladorCreatePayload = {
  codigo: string;
  descripcion?: string | null;
  sin_restriccion_especialidad?: boolean | null;
  /** Plantilla de especialidades sugeridas. En update: `null`/ausente = no tocar, `[]` = vaciar. */
  especialidades?: number[] | null;
  categoria?: string | null;
  complejidad?: Complejidad | null;
  nomenclador_nacional_id?: number | null;
  observacion?: string | null;
};

export type NomencladorUpdatePayload = Partial<NomencladorCreatePayload & { activo?: boolean }>;

/** "Dar de alta en obras sociales" desde la Ficha del código: alta sin precio donde falta; donde ya estaba, suma las especialidades de la plantilla. */
export type AplicarAltaItem = {
  obra_social_nro: number;
  nombre: string;
  estado: "alta_creada" | "especialidades_agregadas" | "sin_cambios" | "error";
  motivo: string | null;
  especialidades_agregadas: number[];
  sin_quien_factura: boolean;
};
export type AplicarEspecialidadesResult = { resultados: AplicarAltaItem[] };

// ─── Flujo en 4 etapas: alta del código en la O.S. (etapa 3) ─────────────────

export type EstadoCodigoOS = "sin_alta" | "sin_precio" | "con_precio" | "suspendido";

export type CodigoPorOSItem = {
  nomenclador_id: number;
  codigo: string;
  descripcion_colegio: string | null;
  descripcion_os: string | null;
  estado: EstadoCodigoOS;
  sin_restriccion_especialidad: boolean;
  especialidades_os: number;
  especialidades_plantilla: number;
  plantilla_sin_restriccion: boolean;
  /** El código exige documentación digital en esta obra social. */
  requiere_documentacion: boolean;
};

export type CodigosPorOSResult = {
  obra_social_nro: number;
  /** La obra social tiene la documentación digital habilitada. */
  documentacion_digital: boolean;
  total: number;
  page: number;
  size: number;
  conteos: Record<EstadoCodigoOS, number>;
  items: CodigoPorOSItem[];
};

export type CodigoObraSocialOut = {
  obra_social_nro: number;
  nomenclador_id: number;
  codigo: string;
  descripcion: string | null;
  descripcion_colegio: string | null;
  categoria: string | null;
  complejidad: Complejidad | null;
  requiere_autorizacion: boolean | null;
  requiere_documentacion: boolean;
  /** La obra social tiene la documentación digital habilitada (si no, el check se deshabilita). */
  documentacion_digital: boolean;
  cantidad_ayudantes: number | null;
  observacion: string | null;
  sin_restriccion_especialidad: boolean;
  especialidades: number[];
  estado: EstadoCodigoOS;
  tiene_precio: boolean;
};

export type CodigoObraSocialUpdate = Partial<{
  descripcion: string | null;
  categoria: string | null;
  complejidad: Complejidad | null;
  requiere_autorizacion: boolean | null;
  requiere_documentacion: boolean;
  cantidad_ayudantes: number | null;
  observacion: string | null;
  sin_restriccion_especialidad: boolean;
  especialidades: number[];
  /** Cerrar (vigentes hasta ayer) los precios que quedarían sin especialidad. */
  cerrar_precios: boolean;
}>;

/** 409 al editar el alta: quitar especialidades (o "sin restricción") deja precios activos sin con qué cotizar. */
export type PreciosDependientes = {
  tipo: "precios_dependientes";
  mensaje: string;
  /** Hasta cuándo quedan vigentes si se cierran (ayer), ISO. */
  cierre: string;
  precios: { id: number; especialidad: string; vigencia_desde: string }[];
};

type AltaCodigoItem = {
  obra_social_nro: number;
  nomenclador_id: number;
  descripcion?: string | null;
  especialidades?: number[] | null;
  sin_restriccion_especialidad?: boolean | null;
};

export type AltaCodigosPayload = {
  items: AltaCodigoItem[];
  requiere_autorizacion?: boolean | null;
  cantidad_ayudantes?: number | null;
};

/** Acciones de la barra de la tabla de "Códigos por obra social". */
export type AccionCodigosOS = "suspender" | "reactivar" | "activar_documentacion" | "desactivar_documentacion";

type AccionCodigoResultado = {
  nomenclador_id: number;
  codigo: string;
  estado: "aplicado" | "no_aplica";
  motivo: string | null;
};

export type AccionCodigosResult = {
  accion: AccionCodigosOS;
  aplicados: number;
  resultados: AccionCodigoResultado[];
};

export type AltaCodigoResultado = {
  obra_social_nro: number;
  nomenclador_id: number;
  codigo: string;
  estado: "creado" | "reactivado" | "ya_existia" | "error";
  motivo: string | null;
  sin_quien_factura: boolean;
};

type FichaObraSocialItem = {
  obra_social_nro: number;
  nombre: string;
  estado: EstadoCodigoOS;
  sin_restriccion_especialidad: boolean;
  especialidades: number;
  precio_tipo: "igual" | "por_especialidad" | null;
  precio_total: string | null;
  variantes: number;
  vigencia_desde: string | null;
  prestaciones_sin_valorizar: number;
};

export type FichaCodigoOut = {
  nomenclador_id: number;
  codigo: string;
  descripcion: string | null;
  categoria: string | null;
  complejidad: Complejidad | null;
  activo: boolean;
  plantilla_especialidades: number[];
  plantilla_sin_restriccion: boolean;
  conteos: Record<EstadoCodigoOS, number>;
  obras_sociales: FichaObraSocialItem[];
};

export type PropagarModo = "agregar" | "igualar";
type PropagarEspecialidadesItem = {
  obra_social_nro: number;
  nombre: string;
  estado: "actualizada" | "sin_cambios" | "salteada" | "error";
  motivo: string | null;
  agrega: number[];
  quita: number[];
  /** Subconjunto de `quita` con precio NE activo: el precio se da de baja con la especialidad. */
  quita_con_precio: number[];
};
export type PropagarEspecialidadesResult = {
  dry_run: boolean;
  modo: PropagarModo;
  resultados: PropagarEspecialidadesItem[];
};

type RevalorizarItem = {
  id: number;
  periodo: string;
  cod_med: string;
  fecha_practica: string | null;
  conceptos: string;
  estado: "revalorizada" | "sin_precio" | "omitida" | "error";
  motivo: string | null;
  importe_antes: string;
  honorarios: string;
  gastos: string;
  ayudante: string;
  coseguro: string;
  importe_despues: string;
};
export type RevalorizarResult = {
  dry_run: boolean;
  cod_obra: string;
  codigo: string;
  total: number;
  revalorizadas: number;
  /** Automáticas abiertas que ya tienen ese precio (no vienen en `items`). */
  sin_cambios: number;
  items: RevalorizarItem[];
};

/** Etiqueta de cada estado del código en una O.S. (mismo texto en todas las pantallas). */
export const ESTADO_CODIGO_OS_LABEL: Record<EstadoCodigoOS, string> = {
  sin_alta: "Sin alta",
  sin_precio: "Sin precio",
  con_precio: "Con precio",
  suspendido: "Suspendido",
};
