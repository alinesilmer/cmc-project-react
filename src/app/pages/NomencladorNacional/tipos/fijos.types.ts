import type { ObraSocialFamiliaItem } from "./historial.types";

// ─── Importar valores fijos NE desde Excel ───────────────────────────────────

export type EstadoFilaFija =
  | "error" | "duplicado" | "sin_catalogo" | "suspendido" | "sin_alta"
  | "sin_quien_factura" | "vigente_posterior" | "misma_vigencia" | "rotar" | "nuevo";

export type AccionFija =
  | "omitir" | "cargar" | "rotar" | "sobrescribir" | "reemplazar"
  | "alta_y_cargar" | "reactivar_y_cargar" | "crear_y_cargar";

export type ImportarFijosFilaIn = {
  fila: number;
  codigo: string | null;
  descripcion: string | null;
  /** Importes crudos de la planilla; HONORARIOS admite además "PRESUPUESTO". Vacío = 0. */
  honorarios: string | number | null;
  gastos: string | number | null;
  ayudante: string | number | null;
};

export type ImportarFijosPayload = {
  obra_social_nro: number;
  vigencia_desde: string;
  encabezado: (string | null)[];
  filas: ImportarFijosFilaIn[];
};

type DecisionFijaIn = {
  fila: number;
  estado_visto: EstadoFilaFija;
  accion: AccionFija;
  especialidades?: number[] | null;
  sin_restriccion?: boolean | null;
  categoria?: string | null;
};

export type ImportarFijosAplicarPayload = ImportarFijosPayload & {
  decisiones: DecisionFijaIn[];
  replicar_en: number[];
};

type VarianteActualOut = {
  especialidad_id_colegio: number | null;
  especialidad: string | null;
  precio_actual: string | null;
  vigencia_desde: string | null;
  vigencia_hasta: string | null;
  variacion_pct: number | null;
  posteriores: number;
};

type ReplicaFilaOut = {
  obra_social_nro: number;
  estado: EstadoFilaFija;
  accion: AccionFija | null;
  motivo: string | null;
};

export type FilaPreviaOut = {
  fila: number;
  codigo: string;
  codigo_excel: string | null;
  descripcion_excel: string | null;
  descripcion_os: string | null;
  nomenclador_id: number | null;
  categoria: string | null;
  /** Importes que se cargan; null si la fila no se pudo interpretar (o es por presupuesto). */
  honorarios: string | null;
  gastos: string | null;
  ayudante: string | null;
  total: string | null;
  por_presupuesto: boolean;
  estado: EstadoFilaFija;
  estado_base: EstadoFilaFija | null;
  motivo: string | null;
  acciones: AccionFija[];
  accion_sugerida: AccionFija | null;
  requiere_quien_factura: boolean;
  especialidades: number[];
  sin_restriccion: boolean;
  variantes: VarianteActualOut[];
  sin_cambio: boolean;
  avisos: string[];
  replicas: ReplicaFilaOut[];
};

export type ImportarFijosPreviewOut = {
  obra_social_nro: number;
  vigencia_desde: string;
  familia: ObraSocialFamiliaItem[];
  total: number;
  por_estado: Partial<Record<EstadoFilaFija, number>>;
  filas: FilaPreviaOut[];
};

type ReplicaOSOut = {
  obra_social_nro: number;
  nombre: string;
  estado: "ok" | "error";
  motivo: string | null;
  precios_creados: number;
  filas_cargadas: number;
  altas: number;
  omitidas: { fila: number; codigo: string; motivo: string }[];
};

export type ImportarFijosAplicarOut = {
  obra_social_nro: number;
  vigencia_desde: string;
  precios_creados: number;
  filas_cargadas: number;
  filas_rotadas: number;
  altas: number;
  codigos_creados: number;
  vigencias_borradas: number;
  omitidas: number;
  replicas: ReplicaOSOut[];
};
