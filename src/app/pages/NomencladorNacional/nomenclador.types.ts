export type Complejidad = "baja" | "media" | "alta";
export type ValorEstado = "activo" | "cerrado";

export type NomencladorOut = {
  id: number;
  codigo: string;
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

// ─── Importación masiva desde planilla ────────────────────────────────────────

/**
 * Nivel dentro de un lote. Igual que `GalenoNivelItem` pero con `nivel`
 * anulable: un galeno plano se manda como un único nivel con `nivel: null`
 * (así lo modela `nm_galenos`, donde nivel NULL = sin niveles).
 */
export type GalenoLoteNivel = Omit<GalenoNivelItem, "nivel"> & {
  nivel: number | null;
};

export type GalenoLoteItem = {
  nombre: string;
  niveles: GalenoLoteNivel[];
};

export type GalenoImportarLotePayload = {
  obra_social_nro: number;
  vigencia_desde: string;
  galenos: GalenoLoteItem[];
  observacion?: string | null;
  /** `omitir` saltea los que ya están vigentes; `rotar` los reemplaza. */
  si_existe?: "omitir" | "rotar";
};

export type GalenoLoteResultItem = {
  nombre: string;
  codigo: string;
  estado: "creado" | "rotado" | "omitido" | "error";
  niveles: number;
  detalle?: string | null;
};

export type GalenoImportarLoteResult = {
  total: number;
  creados: number;
  rotados: number;
  omitidos: number;
  errores: number;
  items: GalenoLoteResultItem[];
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

// ─── Plantillas de Galenos (solo lectura) ──────────────────────────────────────

export type GalenoPlantillaNivelOut = {
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

// ─── Actualización masiva por porcentaje ───────────────────────────────────────

/**
 * Aumento/baja porcentual lineal sobre los valores de modalidad FIJA de una OS
 * en un `origen` dado. `filtro_codigos` limita a esos códigos; `filtro_rango`
 * limita a un rango [desde, hasta] (comparación por string, como el backend).
 * Sin ninguno de los dos, aplica a todos. Los valores calculables por galeno
 * quedan como `omitidos` (se actualizan subiendo el galeno).
 */
export type ActualizarPorcentajePayload = {
  obra_social_nro: number;
  origen: Origen;
  porcentaje: number;
  vigencia_desde: string;
  filtro_codigos?: string[] | null;
  filtro_rango?: { desde: string; hasta: string } | null;
};

export type RevertirActualizacionPayload = {
  obra_social_nro: number;
  vigencia_revertir: string;
};

// ─── Tabla Valores (Reportes) ─────────────────────────────────────────────────

/** Vía de realización de la práctica. "T" = tradicional (default), "L" = laparoscópica. */
export type ViaPractica = "T" | "L";

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
  /** Vía realmente aplicada en esta fila. Si se pidió "L" y el código no la admite,
   *  el listado no rechaza: cae a su precio tradicional y esto queda en "T". */
  via_aplicada: ViaPractica;
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

// Fila enriquecida (un par código↔especialidad con el nombre ya resuelto),
// devuelta por GET /api/nomenclador/especialidades.
export type NomencladorEspecialidadResumenOut = {
  id: number;
  nomenclador_id: number;
  codigo: string;
  descripcion: string;
  especialidad_id_colegio: number;
  /** null si el ID_COLEGIO_ESPE no tiene match en el catálogo (dato huérfano). */
  especialidad: string | null;
  activo: boolean;
  observacion: string | null;
  created_at: string;
};

export type NomencladorEspecialidadResumenParams = {
  q?: string;
  especialidad_id_colegio?: number;
  activo?: boolean;
  page?: number;
  size?: number;
};

/**
 * Documento respaldatorio de una vigencia de valores de una obra social: la
 * nota, el Excel o el CSV con el que llegaron los precios de esa actualización.
 * Fila de `nm_valores_documentos`, agrupada por (obra social, vigencia_desde).
 */
export type ValorDocumentoOut = {
  id: number;
  obra_social_nro: number;
  /** La misma fecha que agrupa los valores de la actualización (`YYYY-MM-DD`). */
  vigencia_desde: string;
  nombre_original: string;
  content_type: string;
  size: number;
  descripcion: string | null;
  /** Ruta `/api/archivos/…`: pide token, se abre con `abrirAdjunto()`. */
  url: string;
  created_at: string;
};
