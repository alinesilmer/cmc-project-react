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

export type AccionCodigoResultado = {
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

export type GalenoActualizarPrecioMasivoPayload =
  | { obra_social_nro: number; codigo: string; vigencia_desde: string; porcentaje: number }
  | { obra_social_nro: number; codigo: string; vigencia_desde: string; items: { nivel: number; nuevo_valor_unitario: number }[] };

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
export type HistorialVersionOut = {
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

// ─── Nomencladores nivelados (Cirugía adulto 7/10, Cirugía infantil, FASGO, Urología…) ──

export type NomencladorNiveladoOut = {
  id: number;
  slug: string;
  nombre: string;
  galeno_grupo: string;
  galeno_codigo: string | null;
  galeno_nombre: string | null;
  galeno_gastos_codigo: string | null;
  /** `nacional`: el Nomenclador Nacional (sin escala por nivel; no se aplica a una OS). */
  tipo: "nivelado" | "nacional";
  niveles: number;
  /** ID_COLEGIO_ESPE a las que se aplica el nomenclador; vacío = todas las del código. */
  especialidades: number[];
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
  | "crear" | "creado" | "reemplazar" | "reemplazado" | "sin_quien_factura" | "fuera_de_especialidad"
  | "suspendido" | "omitido";

type AplicarNiveladoFila = {
  nomenclador_id: number;
  codigo: string;
  descripcion: string | null;
  nivel: number | null;
  unidades: string | null;
  estado: EstadoAplicarNivelado;
  precios: number;
  precio: string | null;
  motivo: string | null;
  /** Vigencias NE desde la fecha cargada en adelante que se borran de la base. */
  vigencias_borradas: number;
};

/** Unidades de un nivel PARA ESTA obra social (pisan la escala del nomenclador). */
export type AplicarNiveladoAjuste = {
  nivel: number;
  unidades_honorarios?: number | null;
  unidades_ayudante?: number | null;
};

/** Cómo se crea el galeno de la OS si no lo tiene o cambia de nomenclador (7 ↔ 10 niveles). */
export type AplicarNiveladoGaleno = {
  /** `false`: calculado (unidades × `valor_unitario`). `true`: precio fijo por nivel. */
  precio_por_nivel: boolean;
  valor_unitario?: number | null;
  precios_por_nivel?: Record<number, number> | null;
  ajustes?: AplicarNiveladoAjuste[];
};

export type AplicarNiveladoPayload = {
  obra_social_nro: number;
  vigencia_desde: string;
  dry_run: boolean;
  galeno?: AplicarNiveladoGaleno | null;
};

/** La OS usa otro nomenclador con el mismo galeno: al aplicar se eliminan sus valores y se
 * crean los del nuevo. */
export type AplicarNiveladoCambio = {
  desde_slug: string;
  desde_nombre: string;
  niveles_desde: number;
  valores_eliminados: number;
  codigos_sin_reemplazo: number;
  valores_a_crear: number;
};

export type NiveladoGalenoNivel = {
  nivel: number;
  valor_unitario: string;
  unidades_honorarios: string;
  unidades_ayudante: string;
  ajustado: boolean;
};

export type NiveladoEstadoOsOut = {
  obra_social_nro: number;
  obra_social: string;
  niveles_nomenclador: number;
  /** ok: tiene el galeno · falta: no lo tiene · otros_niveles: lo tiene con otra cantidad de niveles. */
  galeno_estado: "ok" | "falta" | "otros_niveles";
  niveles_os: number | null;
  precio_por_nivel: boolean | null;
  niveles: NiveladoGalenoNivel[];
  cambio: AplicarNiveladoCambio | null;
};

export type NiveladoEscalaNivel = {
  nivel: number;
  unidades_honorarios: string | number;
  /** `null`: el 25 % de las de honorarios. */
  unidades_ayudante: string | number | null;
};

export type NiveladoEscalaOut = {
  slug: string;
  nombre: string;
  galeno_codigo: string | null;
  galeno_gastos_codigo: string | null;
  niveles: NiveladoEscalaNivel[];
  obras_sociales: number;
};

export type RecalcularNiveladoResult = {
  dry_run: boolean;
  obras_sociales: number;
  valores: number;
  detalle: { obra_social_nro: number; valores: number; crear: number; reemplazar: number }[];
  errores: { obra_social_nro: number; motivo: string }[];
};

export type NomencladorDeCodigoOut = {
  id: number;
  slug: string;
  nombre: string;
  tipo: "nivelado" | "nacional";
  niveles: number;
  nivel_del_codigo: number | null;
  unidades_del_codigo: string | null;
};

export type GalenoResumenOut = {
  codigo: string;
  nomencladores: string[];
  modo: "calculado" | "por_nivel";
  niveles: NiveladoGalenoNivel[];
};

export type AplicarNiveladoOut = {
  dry_run: boolean;
  obra_social_nro: number;
  nomenclador: string;
  galeno_nombre: string;
  galeno_creado: boolean;
  cambio: AplicarNiveladoCambio | null;
  resumen: {
    total: number;
    crear: number;
    /** Ya tenían precio NE: se les carga la vigencia igual. */
    reemplazar: number;
    vigencias_borradas: number;
    sin_quien_factura: number;
    /** Ninguna de sus especialidades en la O.S. es del nomenclador: no se les carga precio. */
    fuera_de_especialidad: number;
    suspendido: number;
    omitido: number;
    precios: number;
    altas: number;
  };
  filas: AplicarNiveladoFila[];
};

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

export type DecisionFijaIn = {
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

export type VarianteActualOut = {
  especialidad_id_colegio: number | null;
  especialidad: string | null;
  precio_actual: string | null;
  vigencia_desde: string | null;
  vigencia_hasta: string | null;
  variacion_pct: number | null;
  posteriores: number;
};

export type ReplicaFilaOut = {
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

export type ReplicaOSOut = {
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
