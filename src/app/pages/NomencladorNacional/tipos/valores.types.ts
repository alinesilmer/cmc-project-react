import type { ValorEstado } from "./codigos.types";

// ─── Valores ──────────────────────────────────────────────────────────────────

export type Origen = "NE" | "NN";

export const ORIGEN_LABELS: Record<Origen, string> = {
  NE: "Nomenclador Específico",
  NN: "Nomenclador Nacional",
};

type ValorComponenteOut = {
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
  /** Override de esta OS — casi siempre `null`. Para MOSTRAR usar `descripcion_efectiva`. */
  descripcion: string | null;
  /** La que hay que mostrar: `descripcion` si la OS puso una, si no la del catálogo. */
  descripcion_efectiva: string;
  origen: Origen;
  nivel: number | null;
  complejidad: string | null;
  /** La que vale en esta OS: la del valor > la del alta en la OS > la del catálogo. */
  categoria_efectiva?: string | null;
  especialidad_id_colegio: number | null;
  por_presupuesto: boolean;
  /** Máximo de ayudantes admitidos para este código+OS. */
  cantidad_ayudantes: number | null;
  /** Importe que el afiliado paga de su bolsillo; se descuenta del total a facturar. */
  coseguro: string;
  /** Nomenclador con el que se factura (`null` = valor fijo o manual) y su nombre. */
  nomenclador_nivelado_id?: number | null;
  nomenclador_nivelado?: string | null;
  /** Dato del PAR (obra_social_nro, código), no de esta variante puntual: el código lo puede facturar cualquier especialidad en esta OS. */
  sin_restriccion_especialidad: boolean;
  /** Especialidades habilitadas HOY para (obra_social_nro, código) — también dato del par, igual en todas las variantes activas. */
  especialidades: number[];
  modalidad: "galeno" | "fijo" | "por_presupuesto";
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
  /** Obligatoria: cómo nombra ESTA obra social al código. */
  descripcion: string;
  nivel?: number | null;
  complejidad?: string | null;
  especialidad_id_colegio?: number | null;
  /** NE sin especialidad: dato del par (OS + código). `true` habilita una fila sin especialidad. */
  sin_restriccion_especialidad?: boolean;
  por_presupuesto?: boolean;
  cantidad_ayudantes?: number | null;
  coseguro?: number;
  /** Nomenclador con el que se factura; los componentes vienen de `getComponentesNomenclador`. */
  nomenclador_nivelado_id?: number | null;
  vigencia_desde: string;
  observacion?: string | null;
  componentes: ComponentePayload[];
};

/** Alta de una variante NE para varias especialidades a la vez (mismo precio, misma vigencia): reemplaza el rol que tenía cargar un NNE. */
export type ValorCreateMultiPayload = {
  obra_social_nro: number;
  nomenclador_id: number;
  origen: "NE";
  /** Obligatoria — ver ValorCreatePayload.descripcion. */
  descripcion: string;
  nivel?: number | null;
  complejidad?: string | null;
  especialidades_id_colegio: number[];
  por_presupuesto?: boolean;
  cantidad_ayudantes?: number | null;
  coseguro?: number;
  nomenclador_nivelado_id?: number | null;
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
  coseguro?: number;
  observacion?: string | null;
  /** El valor que se cierra puede ser por_presupuesto (sin ecuación propia): el back no lo hereda del anterior. */
  por_presupuesto?: boolean;
  /** Propaga la misma vigencia+componentes a las demás variantes NE del par (OS + código), cada una conservando su propia especialidad. */
  aplicar_a_variantes?: boolean;
  /** Cómo se factura el valor nuevo. Sin `definir_nomenclador` se conserva el del valor que
   * se cierra; con él, `nomenclador_nivelado_id` lo fija (`null` = valor fijo o manual). */
  definir_nomenclador?: boolean;
  nomenclador_nivelado_id?: number | null;
};

/** Edición del "núcleo" de un código en una obra social: vale PARA TODAS sus especialidades. */
export type ValorNucleoPayload = {
  descripcion?: string | null;
  nivel?: number | null;
  complejidad?: string | null;
  cantidad_ayudantes?: number | null;
  observacion?: string | null;
  /** Si viene, rota vigencia + valores + coseguro de TODAS las variantes NE activas. */
  ecuacion?: ValorActualizarPayload | null;
  /** true deja UNA sola fila "sin especialidad" (cierra las demás). */
  sin_restriccion_especialidad: boolean;
  /** Especialidades deseadas (si no es sin restricción): agrega las nuevas clonando la primera variante y cierra las que se sacaron. */
  especialidades: number[];
  /** Qué núcleo se edita cuando el código tiene NE y NN: las variantes NE o la fila NN. */
  origen?: "NE" | "NN";
  tocar_especialidades?: boolean;
};

// ─── Actualización masiva por porcentaje ───────────────────────────────────────

/** Aumento/baja porcentual lineal sobre los valores de modalidad FIJA de una OS en un `origen` dado. */
export type ActualizarPorcentajePayload = {
  obra_social_nro: number;
  origen: Origen;
  porcentaje: number;
  vigencia_desde: string;
  filtro_codigos?: string[] | null;
  filtro_rango?: { desde: string; hasta: string } | null;
  /** Aumentar los valores de precio fijo del origen/alcance. */
  incluir_valores_fijos?: boolean;
  /** Códigos de galeno de la OS a aumentar (todos sus niveles vigentes). */
  galeno_codigos?: string[] | null;
  /** true = vista previa: calcula sin guardar. */
  dry_run?: boolean;
};

export type RevertirActualizacionPayload = {
  obra_social_nro: number;
  vigencia_revertir: string;
  dry_run?: boolean;
};

export type AumentoDetalleItem = {
  tipo: "valor" | "galeno";
  codigo: string;
  descripcion: string | null;
  especialidad_id_colegio: number | null;
  nivel: number | null;
  vigencia_actual: string | null;
  /** Decimal serializado como string. */
  actual: string;
  nuevo: string | null;
  estado: "actualiza" | "omitido" | "error";
  motivo: string | null;
};

export type AumentoPorcentualResult = {
  actualizados: number;
  galenos_actualizados: number;
  omitidos: number;
  errores: { motivo: string; [key: string]: unknown }[];
  detalle: AumentoDetalleItem[];
  dry_run: boolean;
};

// ─── Tabla Valores (Reportes) ─────────────────────────────────────────────────

/** Vía de realización de la práctica. "T" = tradicional (default), "L" = laparoscópica. */
export type ViaPractica = "T" | "L";

type TablaValorComponente = {
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
  /** "NE" (variante por especialidad) o "NN" — cuál variante ganó. */
  origen: Origen;
  /** Especialidad de la variante ganadora. Solo != null cuando ganó una NE. */
  especialidad_id_colegio: number | null;
  descripcion: string | null;
  nivel: number | null;
  por_presupuesto: boolean;
  /** El código lo puede facturar cualquier especialidad en esta OS (dato de la variante ganadora — `Valor.sin_restriccion_especialidad`). */
  sin_restriccion_especialidad: boolean;
  precio_total: string;
  vigencia_desde: string;
  vigencia_hasta: string | null;
  componentes: TablaValorComponente[];
  /** Vía realmente aplicada en esta fila. */
  via_aplicada: ViaPractica;
};

// ─── Importar CSV ─────────────────────────────────────────────────────────────

export type ImportarCSVResult = {
  procesados: number;
  errores: { fila: number | string; codigo?: string; motivo: string }[];
};
