export type Complejidad = "baja" | "media" | "alta";
export type ValorEstado = "activo" | "cerrado";

export type NomencladorOut = {
  id: number;
  codigo: string;
  proviene_de_id: number | null;
  descripcion: string;
  categoria: string | null;
  complejidad: Complejidad | null;
  sin_restriccion_especialidad: boolean;
  unidades_honorarios: string | null;
  unidades_ayudante: string | null;
  unidades_gastos: string | null;
  activo: boolean;
  observacion: string | null;
  created_at: string;
  updated_at: string;
};

export type NomencladorListParams = {
  q?: string;
  categoria?: string;
  complejidad?: string;
  activo?: boolean;
  page?: number;
  size?: number;
};

export type NomencladorCreatePayload = {
  codigo: string;
  descripcion: string;
  proviene_de_id?: number | null;
  categoria?: string | null;
  complejidad?: Complejidad | null;
  sin_restriccion_especialidad?: boolean;
  unidades_honorarios?: number | null;
  unidades_ayudante?: number | null;
  unidades_gastos?: number | null;
  observacion?: string | null;
};

export type NomencladorUpdatePayload = Partial<NomencladorCreatePayload & { activo?: boolean }>;

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
  observacion: string | null;
  created_at: string;
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

export type GalenoNivelItem = {
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

export type GalenoActualizarPrecioPayload = {
  nuevo_valor_unitario: number;
  vigencia_desde: string;
};

export type GalenoActualizarPrecioMasivoPayload =
  | { obra_social_nro: number; codigo: string; vigencia_desde: string; porcentaje: number }
  | { obra_social_nro: number; codigo: string; vigencia_desde: string; items: { nivel: number; nuevo_valor_unitario: number }[] };

export type ActualizacionMasivaResult = {
  actualizados: number;
  errores: { motivo: string; [key: string]: unknown }[];
  omitidos: number;
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

// ─── Valores ──────────────────────────────────────────────────────────────────

export type Origen = "NE" | "NNE" | "NN";

export const ORIGEN_LABELS: Record<Origen, string> = {
  NE: "Nomenclador Específico",
  NNE: "Nomenclador Negociado",
  NN: "Nomenclador Nacional",
};

export type ValorComponenteOut = {
  id: number;
  valor_id: number;
  concepto: string;
  tipo: "calculable" | "fijo";
  galeno_id: number | null;
  galeno_codigo: string | null;
  galeno_nivel: number | null;
  cantidad: string;
  valor_unitario: string | null;
  precio_unitario: string | null;
  subtotal: string;
  opcional: boolean;
  orden: number;
  activo: boolean;
  observacion: string | null;
};

export type ValorOut = {
  id: number;
  obra_social_nro: number;
  nomenclador_id: number;
  codigo: string;
  descripcion: string | null;
  origen: Origen;
  nivel: number | null;
  complejidad: string | null;
  especialidad_id_colegio: number | null;
  por_presupuesto: boolean;
  modalidad: "galeno" | "fijo";
  vigencia_desde: string;
  vigencia_hasta: string | null;
  estado: ValorEstado;
  observacion: string | null;
  componentes: ValorComponenteOut[];
  created_at: string;
};

export type ComponentePayload = {
  concepto: string;
  galeno_id?: number | null;
  cantidad?: string | number;
  valor_unitario?: number | null;
  opcional?: boolean;
  orden?: number;
  observacion?: string | null;
};

export type ValorCreatePayload = {
  obra_social_nro: number;
  nomenclador_id: number;
  origen: Origen;
  descripcion?: string | null;
  nivel?: number | null;
  complejidad?: string | null;
  especialidad_id_colegio?: number | null;
  por_presupuesto?: boolean;
  vigencia_desde: string;
  observacion?: string | null;
  componentes: ComponentePayload[];
};

export type ValorUpdatePayload = {
  descripcion?: string | null;
  nivel?: number | null;
  complejidad?: string | null;
  observacion?: string | null;
};

export type ValorActualizarPayload = {
  vigencia_desde: string;
  componentes: ComponentePayload[];
  descripcion?: string | null;
  nivel?: number | null;
  complejidad?: string | null;
  observacion?: string | null;
};

// ─── Tabla Valores (Reportes) ─────────────────────────────────────────────────

export type TablaValorComponente = {
  componente_id: number;
  concepto: "Honorarios" | "Ayudante" | "Gastos";
  tipo: "calculable" | "fijo";
  galeno_id: number | null;
  galeno_codigo: string | null;
  galeno_nivel: number | null;
  cantidad: string;
  valor_unitario: string;
  subtotal: string;
};

export type TablaValorItem = {
  nomenclador_id: number;
  codigo: string;
  /** "NE" (variante por especialidad), "NNE" o "NN" — cuál variante ganó. */
  origen: "NE" | "NNE" | "NN";
  /** Especialidad de la variante ganadora. Solo != null cuando ganó una NE. */
  especialidad_id_colegio: number | null;
  descripcion: string | null;
  nivel: number | null;
  por_presupuesto: boolean;
  precio_total: string;
  vigencia_desde: string;
  vigencia_hasta: string | null;
  componentes: TablaValorComponente[];
};

// ─── Importar CSV ─────────────────────────────────────────────────────────────

export type ImportarCSVResult = {
  procesados: number;
  errores: { fila: number | string; codigo?: string; motivo: string }[];
};

// ─── Nomenclador Especialidades ───────────────────────────────────────────────

export type NomencladorEspecialidadOut = {
  id: number;
  nomenclador_id: number;
  especialidad_id_colegio: number;
  activo: boolean;
  observacion: string | null;
  created_at: string;
};
