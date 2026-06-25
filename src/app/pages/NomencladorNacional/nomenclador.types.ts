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
  observacion?: string | null;
};

export type GalenoCreateNivelesPayload = {
  obra_social_nro: number;
  nombre: string;
  vigencia_desde: string;
  niveles: { nivel: number; valor_unitario: number }[];
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

// ─── Valores ──────────────────────────────────────────────────────────────────

export type ValorComponenteOut = {
  id: number;
  valor_id: number;
  concepto: string;
  galeno_id: number | null;
  cantidad: string;
  valor_unitario: string | null;
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
  nivel: number | null;
  complejidad: string | null;
  especialidad_id_colegio: number | null;
  por_presupuesto: 0 | 1;
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
  descripcion?: string | null;
  nivel?: number | null;
  complejidad?: string | null;
  especialidad_id_colegio?: number | null;
  por_presupuesto?: 0 | 1;
  vigencia_desde: string;
  observacion?: string | null;
  componentes: ComponentePayload[];
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
  concepto: string;
  tipo: string;
  valor_unitario: string;
  cantidad: string;
  subtotal: string;
  opcional: boolean;
};

export type TablaValorItem = {
  nomenclador_id: number;
  codigo: string;
  descripcion: string;
  nivel: number | null;
  precio_total: string;
  por_presupuesto: 0 | 1;
  vigencia_desde: string;
  vigencia_hasta: string | null;
  componentes: TablaValorComponente[];
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
