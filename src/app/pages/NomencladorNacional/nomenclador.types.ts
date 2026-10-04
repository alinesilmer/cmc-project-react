export type Complejidad = "baja" | "media" | "alta";
export type ValorEstado = "activo" | "cerrado";

/**
 * Catálogo del Colegio — puro: código + clasificación + vínculo opcional al
 * Nomenclador Nacional. Descripción, especialidades y "sin restricción" dejaron
 * de vivir acá: son datos POR OBRA SOCIAL, se cargan desde el modal de Valores
 * (`ValorOut.especialidades` / `ValorUpdatePayload`, ver más abajo).
 */
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
  complejidad?: string;
  /**
   * Solo cambia algo para el rol médico (acota a sus códigos habilitados en esa
   * OS). El catálogo en sí ya no distingue por obra social.
   */
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

/** "Dar de alta en obras sociales" desde la Ficha del código: alta sin precio
 * donde falta; donde ya estaba, suma las especialidades de la plantilla. */
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
};

export type CodigosPorOSResult = {
  obra_social_nro: number;
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
  cantidad_ayudantes: number | null;
  observacion: string | null;
  sin_restriccion_especialidad: boolean;
  especialidades: number[];
  /** Cerrar (vigentes hasta ayer) los precios que quedarían sin especialidad. */
  cerrar_precios: boolean;
}>;

/** 409 al editar el alta: quitar especialidades (o "sin restricción") deja precios
 * activos sin con qué cotizar. La pantalla pregunta y reintenta con `cerrar_precios`. */
export type PreciosDependientes = {
  tipo: "precios_dependientes";
  mensaje: string;
  /** Hasta cuándo quedan vigentes si se cierran (ayer), ISO. */
  cierre: string;
  precios: { id: number; especialidad: string; vigencia_desde: string }[];
};

export type AltaCodigoItem = {
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

export type AltaCodigoResultado = {
  obra_social_nro: number;
  nomenclador_id: number;
  codigo: string;
  estado: "creado" | "reactivado" | "ya_existia" | "error";
  motivo: string | null;
  sin_quien_factura: boolean;
};

export type FichaObraSocialItem = {
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
export type PropagarEspecialidadesItem = {
  obra_social_nro: number;
  nombre: string;
  estado: "actualizada" | "sin_cambios" | "salteada" | "error";
  motivo: string | null;
  agrega: number[];
  quita: number[];
  conserva_por_precio: number[];
};
export type PropagarEspecialidadesResult = {
  dry_run: boolean;
  modo: PropagarModo;
  resultados: PropagarEspecialidadesItem[];
};

export type RevalorizarItem = {
  id: number;
  periodo: string;
  cod_med: string;
  fecha_practica: string | null;
  conceptos: string;
  estado: "revalorizada" | "sin_precio" | "error";
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
  items: RevalorizarItem[];
};

/** Etiqueta de cada estado del código en una O.S. (mismo texto en todas las pantallas). */
export const ESTADO_CODIGO_OS_LABEL: Record<EstadoCodigoOS, string> = {
  sin_alta: "Sin alta",
  sin_precio: "Sin precio",
  con_precio: "Con precio",
  suspendido: "Suspendido",
};

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

/** Precarga de un NN: galeno según el rango del código + unidades del Nomenclador Nacional. */
export type ComponentesNNSugeridos = {
  disponible: boolean;
  motivo: string | null;
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

export type Origen = "NE" | "NN";

export const ORIGEN_LABELS: Record<Origen, string> = {
  NE: "Nomenclador Específico",
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
  /** Override de esta OS — casi siempre `null`. Para MOSTRAR usar `descripcion_efectiva`. */
  descripcion: string | null;
  /** La que hay que mostrar: `descripcion` si la OS puso una, si no la del catálogo. */
  descripcion_efectiva: string;
  origen: Origen;
  nivel: number | null;
  complejidad: string | null;
  especialidad_id_colegio: number | null;
  por_presupuesto: boolean;
  /** Máximo de ayudantes admitidos para este código+OS. `null` = no lleva ayudantes —
   * es lo que decide si "Agregar ayudante" aparece en Carga de Facturación. */
  cantidad_ayudantes: number | null;
  /** Importe que el afiliado paga de su bolsillo; se descuenta del total a facturar. */
  coseguro: string;
  /** Dato del PAR (obra_social_nro, código), no de esta variante puntual: el código
   * lo puede facturar cualquier especialidad en esta OS. Se edita en "Metadatos". */
  sin_restriccion_especialidad: boolean;
  /** Especialidades habilitadas HOY para (obra_social_nro, código) — también dato
   * del par, igual en todas las variantes activas. Se reemplaza por completo con
   * `ValorUpdatePayload.especialidades`. */
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
  /** Obligatoria: cómo nombra ESTA obra social al código. Ya no hereda en silencio
   * del catálogo del Colegio. */
  descripcion: string;
  nivel?: number | null;
  complejidad?: string | null;
  especialidad_id_colegio?: number | null;
  /** NE sin especialidad: dato del par (OS + código). `true` habilita una fila sin especialidad. */
  sin_restriccion_especialidad?: boolean;
  por_presupuesto?: boolean;
  cantidad_ayudantes?: number | null;
  coseguro?: number;
  vigencia_desde: string;
  observacion?: string | null;
  componentes: ComponentePayload[];
};

/** Alta de una variante NE para varias especialidades a la vez (mismo precio, misma
 * vigencia): reemplaza el rol que tenía cargar un NNE. Ver POST /valores_nm/multi. */
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
  vigencia_desde: string;
  observacion?: string | null;
  componentes: ComponentePayload[];
};

export type ValorUpdatePayload = {
  /** Dato del par: se propaga a todas las variantes activas de (obra_social_nro,
   * código) — incluida la NN. */
  descripcion?: string | null;
  sin_restriccion_especialidad?: boolean;
  /** Reemplaza POR COMPLETO la habilitación del par (no se suma). `[]` = vaciar
   * (rechazado con 409 si alguna especialidad todavía tiene un NE activo). Omitir
   * = no tocar. Único lugar del sistema donde se editan especialidades. */
  especialidades?: number[];
  nivel?: number | null;
  complejidad?: string | null;
  cantidad_ayudantes?: number | null;
  observacion?: string | null;
};

export type ValorActualizarPayload = {
  vigencia_desde: string;
  componentes: ComponentePayload[];
  descripcion?: string | null;
  nivel?: number | null;
  complejidad?: string | null;
  coseguro?: number;
  observacion?: string | null;
  /** El valor que se cierra puede ser por_presupuesto (sin ecuación propia): el back
   * no lo hereda del anterior, hay que mandarlo explícito o el nuevo valor queda con
   * por_presupuesto=false y pierde esa condición. */
  por_presupuesto?: boolean;
  /** Propaga la misma vigencia+componentes a las demás variantes NE del par
   * (OS + código), cada una conservando su propia especialidad. No aplica a NN. */
  aplicar_a_variantes?: boolean;
};

/** Edición del "núcleo" de un código en una obra social: vale PARA TODAS sus
 * especialidades. Una sola transacción en el back (PUT /valores_nm/par/{os}/{nomenclador}). */
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
  /** Especialidades deseadas (si no es sin restricción): agrega las nuevas clonando
   * la primera variante y cierra las que se sacaron. */
  especialidades: number[];
  /** Qué núcleo se edita cuando el código tiene NE y NN: las variantes NE o la fila NN. */
  origen?: "NE" | "NN";
  /** false = no tocar quién factura ni crear/cerrar variantes (el lápiz del código
   * sólo rota precios). Default del back: true. */
  tocar_especialidades?: boolean;
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
  /** "NE" (variante por especialidad) o "NN" — cuál variante ganó. */
  origen: Origen;
  /** Especialidad de la variante ganadora. Solo != null cuando ganó una NE. */
  especialidad_id_colegio: number | null;
  descripcion: string | null;
  nivel: number | null;
  por_presupuesto: boolean;
  /** El código lo puede facturar cualquier especialidad en esta OS (dato de la
   * variante ganadora — `Valor.sin_restriccion_especialidad`). */
  sin_restriccion_especialidad: boolean;
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

// ─── Códigos por especialidad (consulta de solo lectura, por obra social) ────
//
// Las especialidades pasaron a ser un dato por obra social (`nm_valor_
// especialidad`) — se editan enteramente desde el modal de Valores
// (`ValorUpdatePayload.especialidades`). Esto es solo lectura: GET
// /api/nomenclador/especialidades ahora exige `obra_social_nro`.

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
  /** Nombre de quien lo subió. `null` si no se pudo resolver. */
  subido_por_nombre: string | null;
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
export interface ObraSocialActualizada {
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

export type ReplicaEstado = "replicado" | "creado" | "omitido" | "error";

export type ReplicaResultadoItem = {
  obra_social_nro: number;
  nombre: string;
  estado: ReplicaEstado;
  motivo: string | null;
};

export type ReplicarFamiliaResult = { resultados: ReplicaResultadoItem[] };

export type ReplicaAltaPayload = {
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

// ─── Nomencladores nivelados (Cirugía adulto 7/10, Cirugía infantil, FASGO, Urología…) ──

export type NomencladorNiveladoOut = {
  id: number;
  slug: string;
  nombre: string;
  galeno_grupo: string;
  galeno_codigo: string | null;
  galeno_nombre: string | null;
  niveles: number;
  total_codigos: number;
  /** nivel → cantidad de códigos (las claves llegan como texto en el JSON). */
  por_nivel: Record<string, number>;
  con_unidades: number;
};

export type NiveladoCodigoOut = {
  nomenclador_id: number;
  codigo: string;
  descripcion: string | null;
  activo: boolean;
  nivel: number | null;
  /** "N unidades" fijas en vez de nivel (Honorarios = N × galeno de nivel 1). */
  unidades: string | null;
  observacion: string | null;
};

export type NiveladoCodigosOut = {
  items: NiveladoCodigoOut[];
  total: number;
  page: number;
  size: number;
};

/** Nivel o unidades fijas: exactamente uno. */
export type NiveladoCodigoIn = {
  nivel: number | null;
  unidades: number | null;
  observacion?: string | null;
};

export type EstadoAplicarNivelado =
  | "crear" | "creado" | "ya_tiene_precio" | "sin_quien_factura" | "suspendido" | "omitido";

export type AplicarNiveladoFila = {
  nomenclador_id: number;
  codigo: string;
  descripcion: string | null;
  nivel: number | null;
  unidades: string | null;
  estado: EstadoAplicarNivelado;
  precios: number;
  precio: string | null;
  motivo: string | null;
};

export type AplicarNiveladoOut = {
  dry_run: boolean;
  obra_social_nro: number;
  nomenclador: string;
  galeno_nombre: string;
  resumen: {
    total: number;
    crear: number;
    ya_tiene_precio: number;
    sin_quien_factura: number;
    suspendido: number;
    omitido: number;
    precios: number;
    altas: number;
  };
  filas: AplicarNiveladoFila[];
};
