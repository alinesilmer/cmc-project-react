import type { ComponentePayload, Origen, ValorActualizarPayload, ValorNucleoPayload } from "./valores.types";

// ─── Códigos por especialidad (consulta de solo lectura, por obra social) ────
// Las especialidades pasaron a ser un dato por obra social (`nm_valor_ especialidad`) — se editan enteramente desde el modal de Valores (`ValorUpdatePayload.especialidades`).

export type CodigoPorEspecialidadOut = {
  codigo: string;
  /** Resuelta contra esta OS (con fallback si nadie cargó una todavía). */
  descripcion: string;
  especialidad_id_colegio: number;
  /** null si el ID_COLEGIO_ESPE no tiene match en el catálogo (dato huérfano). */
  especialidad: string | null;
  obra_social_nro: number;
};

export type CodigoPorEspecialidadParams = {
  obra_social_nro: number;
  q?: string;
  especialidad_id_colegio?: number;
  page?: number;
  size?: number;
};

/** Documento respaldatorio de una vigencia de valores de una obra social: la nota. */
export type ValorDocumentoOut = {
  id: number;
  obra_social_nro: number;
  /** Nombre de la obra social. `null` si salió del catálogo. */
  obra_social_nombre?: string | null;
  /** La misma fecha que agrupa los valores de la actualización (`YYYY-MM-DD`). */
  vigencia_desde: string;
  nombre_original: string;
  content_type: string;
  size: number;
  descripcion: string | null;
  /** Ruta `/api/archivos/…`: pide token, se abre con `abrirAdjunto()`. */
  url: string;
  created_at: string;
  /** Nombre de quien lo subió. `null` si no se pudo resolver. */
  subido_por_nombre: string | null;
};

/** Filtro por tipo de código. Sanatorio no se ofrece (decisión usuario 2026-10-08). */
export type TipoCodigo = "Consulta" | "Practica" | "Honorarios individuales";

/** Una versión del precio de una variante, del historial de la OS. */
type HistorialVersionOut = {
  vigencia_desde: string;
  vigencia_hasta: string | null;
  honorarios: string;
  ayudante: string;
  gastos: string;
  total: string;
  /** Contra la versión anterior de la misma variante; `null` en la primera. */
  variacion_pct: number | null;
  motivo_cambio: string;
};

export type HistorialVarianteOut = {
  origen: Origen;
  especialidad_id_colegio: number | null;
  especialidad: string | null;
  /** De la más nueva a la más vieja. */
  versiones: HistorialVersionOut[];
};

export type HistorialCodigoOut = {
  nomenclador_id: number;
  codigo: string;
  descripcion: string;
  categoria: string | null;
  /** NN primero, después NE (base y por especialidad). */
  variantes: HistorialVarianteOut[];
};

export type HistorialPorCodigoOut = {
  obra_social_nro: number;
  total: number;
  page: number;
  size: number;
  items: HistorialCodigoOut[];
};

/** Una vigencia ya agregada: cuántos códigos y cuánto varió el promedio. */
export type ResumenVigenciaOut = {
  /** `YYYY-MM-DD`. */
  vigencia_desde: string;
  cantidad: number;
  /** `null` cuando ningún código de esta vigencia tenía versión anterior. */
  avg_pct: number | null;
};

/** Una obra social que actualizó valores en una vigencia. */
interface ObraSocialActualizada {
  obra_social_nro: number;
  nombre: string;
  /** `YYYY-MM-DD`. */
  vigencia_desde: string;
  /** Filas de `nm_valores` cargadas con esa vigencia. */
  codigos: number;
  tiene_documento: boolean;
}

/** Un mes con al menos una actualización; los vacíos no vienen. */
export interface MesActualizaciones {
  /** `YYYY-MM`. */
  mes: string;
  obras_sociales: ObraSocialActualizada[];
  /** Obras sociales distintas: una puede tener dos vigencias en el mes. */
  total_obras_sociales: number;
  total_codigos: number;
}

// ─── Replicar en obras sociales de la misma familia ──────────────────────────

export type ObraSocialFamiliaItem = {
  nro_obra_social: number;
  nombre: string;
  es_principal: boolean;
};

type ReplicaEstado = "replicado" | "creado" | "omitido" | "error";

export type ReplicaResultadoItem = {
  obra_social_nro: number;
  nombre: string;
  estado: ReplicaEstado;
  motivo: string | null;
};

export type ReplicarFamiliaResult = { resultados: ReplicaResultadoItem[] };

type ReplicaAltaPayload = {
  origen: Origen;
  /** [] = una sola fila sin especialidad (NN o NE sin restricción). */
  especialidades_id_colegio: number[];
  sin_restriccion_especialidad?: boolean | null;
  descripcion: string;
  nivel?: number | null;
  complejidad?: string | null;
  categoria?: string | null;
  requiere_autorizacion?: boolean | null;
  por_presupuesto: boolean;
  cantidad_ayudantes?: number | null;
  coseguro: number;
  nomenclador_nivelado_id?: number | null;
  vigencia_desde: string;
  observacion?: string | null;
  componentes: ComponentePayload[];
};

export type ReplicarValoresFamiliaPayload = {
  origen_obra_social_nro: number;
  nomenclador_id: number;
  destinos: number[];
  operacion: "alta" | "nucleo" | "variante";
  alta?: ReplicaAltaPayload;
  nucleo?: ValorNucleoPayload;
  variante?: {
    origen: Origen;
    especialidad_id_colegio: number | null;
    ecuacion: ValorActualizarPayload;
  };
};

export type ReplicarGalenoFamiliaPayload = {
  origen_obra_social_nro: number;
  destinos: number[];
  operacion: "alta" | "precio" | "unidades";
  codigo: string;
  vigencia_desde: string;
  nombre?: string;
  niveles?: {
    nivel: number | null;
    valor_unitario: number;
    unidades_honorarios?: number | null;
    unidades_ayudante?: number | null;
    unidades_gastos?: number | null;
  }[];
  nivel?: number | null;
  nuevo_valor_unitario?: number;
  unidades_honorarios?: number | null;
  unidades_ayudante?: number | null;
  unidades_gastos?: number | null;
};
