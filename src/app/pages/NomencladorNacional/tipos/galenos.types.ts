import type { Complejidad } from "./codigos.types";

// ─── Nomenclador Nacional ───────────────────────────────────────────────────

export type NomencladorNacionalOut = {
  id: number;
  codigo: string;
  descripcion: string | null;
  unidades_honorarios: string | null;
  unidades_ayudante: string | null;
  unidades_gastos: string | null;
  categoria: string | null;
  complejidad: Complejidad | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type NomencladorNacionalListParams = {
  q?: string;
  activo?: boolean;
  page?: number;
  size?: number;
};

export type NomencladorNacionalCreatePayload = {
  codigo: string;
  descripcion?: string | null;
  unidades_honorarios?: number | null;
  unidades_ayudante?: number | null;
  unidades_gastos?: number | null;
  categoria?: string | null;
  complejidad?: Complejidad | null;
};

export type NomencladorNacionalUpdatePayload = Partial<
  NomencladorNacionalCreatePayload & { activo?: boolean }
>;

// ─── Galenos ──────────────────────────────────────────────────────────────────

export type GalenoOut = {
  id: number;
  obra_social_nro: number;
  codigo: string;
  nombre: string;
  nivel: number | null;
  vigencia_desde: string;
  vigencia_hasta: string | null;
  valor_unitario: string;
  unidades_honorarios: string | null;
  unidades_ayudante: string | null;
  unidades_gastos: string | null;
  activo: boolean;
  /** Solo para el boletín del médico: `false` lo oculta en /panel/boletin-valores. */
  visible: boolean;
  /** `true`: la obra social pactó un precio fijo por nivel (1 unidad × el precio del nivel). */
  precio_por_nivel: boolean;
  observacion: string | null;
  created_at: string;
};

/** Informe de "Completar nomenclador NN" (con `dry_run` es la vista previa). */
export type CompletarBaseNNResult = {
  obra_social_nro: number;
  dry_run: boolean;
  vigencia_desde: string;
  galenos_creados: { codigo: string; nombre: string }[];
  galenos_existentes: {
    codigo: string;
    nombre: string;
    valor_unitario: string;
    vigencia_desde: string;
  }[];
  total_candidatos: number;
  nn_creados: number;
  nn_existentes: number;
  habilitaciones_sembradas: number;
  errores: { codigo: string; motivo: string }[];
};

/** Herramienta "Agregar código a obras sociales" (POST /api/valores_nm/alta_ne_cero). */
export type AltaNECeroOS = {
  obra_social_nro: number;
  nombre: string;
  estado: "creada" | "sin_cambios" | "omitida" | "error";
  /** ID_COLEGIO_ESPE; null = la variante sin especialidad. */
  creadas: (number | null)[];
  existentes: (number | null)[];
  motivo: string | null;
  /** Ya tiene el código en NN con precio: el NE en $0 le ganaría al cotizar. */
  nn_con_precio: boolean;
};

export type AltaNECeroResult = {
  codigo: string;
  descripcion: string | null;
  sin_restriccion: boolean;
  plantilla: { id_colegio: number; nombre: string }[];
  vigencia_desde: string;
  dry_run: boolean;
  total_creadas: number;
  obras_sociales: AltaNECeroOS[];
};

/** Precarga de un NN: galeno según el rango del código + unidades del Nomenclador Nacional. */
export type ComponentesNNSugeridos = {
  disponible: boolean;
  motivo: string | null;
  /** Sólo "por nomenclador": nivel del código, nomenclador y modo del galeno. */
  nivel?: number | null;
  nomenclador_nivelado_id?: number | null;
  precio_por_nivel?: boolean | null;
  componentes: {
    concepto: "Honorarios" | "Ayudante" | "Gastos";
    galeno_id: number;
    galeno_nombre: string;
    cantidad: string;
    orden: number;
  }[];
};

export type GalenoVisibilidadResult = {
  obra_social_nro: number;
  codigo: string;
  visible: boolean;
  filas_actualizadas: number;
};

export type GalenoCreatePayload = {
  obra_social_nro: number;
  nombre: string;
  nivel?: number | null;
  vigencia_desde: string;
  valor_unitario: number;
  unidades_honorarios?: number | null;
  unidades_ayudante?: number | null;
  unidades_gastos?: number | null;
  observacion?: string | null;
};

type GalenoNivelItem = {
  nivel: number;
  valor_unitario: number;
  unidades_honorarios?: number | null;
  unidades_ayudante?: number | null;
  unidades_gastos?: number | null;
};

export type GalenoCreateNivelesPayload = {
  obra_social_nro: number;
  nombre: string;
  vigencia_desde: string;
  observacion?: string | null;
  niveles: GalenoNivelItem[];
};

export type GalenoUpdatePayload = {
  observacion?: string | null;
};

// ─── Importación masiva desde planilla ────────────────────────────────────────

export type GalenoActualizarPrecioPayload = {
  nuevo_valor_unitario: number;
  vigencia_desde: string;
};

/** POST /api/galenos/actualizar_precios_lote — todo o nada. */
export type GalenosPrecioLotePayload = {
  obra_social_nro: number;
  vigencia_desde: string;
  /** Un valor unitario por código, para todos sus niveles vigentes. */
  items: { codigo: string; nuevo_valor_unitario: number }[];
};

export type GalenosPrecioLoteResult = {
  galenos: number;
  /** Galenos x niveles rotados. */
  filas: number;
  valores_recalculados: number;
};

/** Cuerpo del 422 cuando algún galeno no se puede actualizar (no se aplicó nada). */
export type GalenosPrecioLoteError = {
  detail: string;
  errores?: { codigo: string; nombre: string; motivo: string }[];
};

export type GalenoActualizarUnidadesPayload = {
  vigencia_desde: string;
  unidades_honorarios?: number | null;
  unidades_ayudante?: number | null;
  unidades_gastos?: number | null;
};

export type GalenoActualizarUnidadesResult = {
  galeno: GalenoOut;
  componentes_actualizados: number;
};

export type GalenosImportarPayload = {
  obra_social_nro_origen: number;
  obra_social_nro_destino: number;
  vigencia_desde: string;
  /** Limita la importación a estos códigos (omitir = todos). */
  codigos?: string[];
  /** Reemplaza galenos sin nivel del destino por los niveles del origen. */
  convertir_a_nivelado?: boolean;
  /** Copia solo el valor del galeno y conserva las unidades del destino. */
  solo_valor?: boolean;
};

export type GalenosImportarResult = {
  total_origen: number;
  creados: number;
  rotados: number;
  sin_cambios: number;
  convertidos?: number;
  errores: { codigo: string; nivel: number | null; motivo: string }[];
};

// ─── Plantillas de Galenos (solo lectura) ──────────────────────────────────────

type GalenoPlantillaNivelOut = {
  /** null = galeno sin niveles */
  nivel: number | null;
  /** Siempre "0.00" — informativo; el precio real lo carga el operador al instanciar. */
  valor_unitario: string;
  unidades_honorarios: string | null;
  unidades_ayudante: string | null;
  unidades_gastos: string | null;
};

export type GalenoPlantillaOut = {
  /** Identificador del conjunto, ej. "cirugia_adulto_de_7_niveles". */
  grupo: string;
  /** Slug real que tendrá el galeno en nm_galenos al instanciarse. */
  codigo: string;
  /** Nombre a mostrar / a mandar en el POST de creación. */
  nombre: string;
  niveles: GalenoPlantillaNivelOut[];
};
