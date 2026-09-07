export type TipoCalculo = "A" | "M";
/** Vía de realización de la práctica. "T" = tradicional (default), "L" = laparoscópica. */
export type ViaPractica = "T" | "L";
export type EstadoPrestacion = "A" | "C" | "X" | "L";
export type Tipo = "Consulta" | "Practica" | "Honorarios individuales" | "Sanatorio";

export type Money = string;

export interface MedicoEspecialidad {
  id: number;
  nombre: string;
  n_resolucion?: string | null;
  fecha_resolucion?: string | null;
  adjunto_id?: number | null;
  adjunto_url?: string | null;
}

export type MedicoOption = {
  cod: string; nombre: string; matricula?: number | string; categoria?: string;
  condicion_impositiva?: string | null;
  especialidades?: MedicoEspecialidad[];
  /** true cuando el payee elegido es una clínica (organización) en vez de un médico.
   *  Lo marca el front al mezclar los buscadores de médicos y clínicas. */
  es_organizacion?: boolean;
  localidad?: string | null;
};
export type ObraSocialOption  = { id: number; nro_obra_social: number; nombre: string };
export type NomencladorOption = {
  codigo: string;
  descripcion: string;
  categoria?: string | null;
  complejidad?: string | null;
};
export type ClinicaOption = {
  cod: number;
  nombre: string;
  documento?: string | null;
  cuit?: string | null;
  localidad?: string | null;
};

export interface AfiliadoRead {
  id: number; dni: string; nombre: string; usuario?: string; created_at?: string;
}

export interface PrestacionItem {
  cod_medico: string;
  /** Solo si `cod_medico` es una clínica: NRO_SOCIO del médico que ejecutó (no cobra,
   *  fija el precio por su especialidad). NULL cuando el payee ya es un médico. */
  cod_medico_ejecutor?: string | null;
  dni_paciente?: string | null;
  fecha_practica?: string | null;
  cod_clinica?: number | null;
  autorizacion?: string | null;
  cod_nomenclador: string;
  cantidad?: number;
  sesion?: number;
  tipo_calculo?: TipoCalculo;
  /** Solo tiene efecto en tipo_calculo "A" (ajusta la cotización); en "M" es informativo. */
  via?: ViaPractica | null;
  honorarios?: number | Money | null;
  gastos?: number | Money | null;
  ayudante?: number | Money | null;
  porcentaje?: number;
  grupo_equipo_id?: number | null;
}

export interface PrestacionesCreate {
  obra_social: string;
  /** YYYYMM opcional: permite saltar el automático (último cerrado + 1) cuando ese
   *  período no tuvo movimiento. Debe ser >= al automático o el backend responde 422. */
  periodo?: string | null;
  prestaciones: PrestacionItem[];
}
/** Carga en un complemento: se referencia por `factura_id`, no por obra_social/periodo. */
export interface PrestacionesComplementariaCreate { factura_id: number; prestaciones: PrestacionItem[]; }
export interface GuardadoResponse  {
  ids: number[]; importe_total: Money;
  /** Período donde efectivamente se guardó — confirma el automático o el editado a mano. */
  periodo?: string;
}

export interface PeriodoActivoResponse {
  cod_obra: string; periodo: string;
  periodo_label: string;
  /** Presentes desde el cambio de complementos; defaults 1/false en el caso normal. */
  version?: number;
  es_complemento?: boolean;
}

export interface PrecioResponse {
  honorarios: Money; gastos: Money; ayudante: Money;
  descripcion: string; fuente: string;
  complejidad?: string | null; nivel?: number | null;
  snapshot?: Array<Record<string, unknown>> | null;
  admitido: boolean; motivo?: string | null;
  por_presupuesto: boolean;
  /** Máximo de ayudantes admitidos para ese código+OS. null/0 = no admite ayudantes. */
  cantidad_ayudantes?: number | null;
  via: ViaPractica;
  /** Solo se completa si via="L" y el galeno cotizado es de 7 niveles. */
  nivel_cotizado?: number | null;
}

export interface PrestacionRead {
  id: number; periodo: string; cod_medico: string;
  /** NRO_SOCIO del médico ejecutor (solo si el payee es una clínica); precarga el campo. */
  cod_medico_ejecutor?: string | null;
  /** @deprecated Ahora es igual a `id`. Viene por compatibilidad; usar `id` como identificador. */
  nro_orden?: string | null;
  cod_obra_social?: string | null; cod_nomenclador?: string | null;
  tipo?: Tipo | null;
  /** "Medico" | "Ayudante" | "Gastos", derivado de qué monto está en >0. Siempre viene
   *  poblado (tanto en el listado como en el detalle) — no confundir con el campo
   *  homónimo, más completo, de `PrestacionFacturaDetalle`. */
  tipo_prestador?: TipoPrestador | null;
  grupo_equipo_id?: number | null;
  sesion?: number | null; cantidad?: number | null;
  honorarios?: Money | null; gastos?: Money | null; ayudante?: Money | null;
  importe_total?: Money | null;
  estado?: EstadoPrestacion | null;
  origen_carga?: "medico" | "colegio" | null;
  fecha_practica?: string | null;
  dni_paciente?: string | null; nombre_paciente?: string | null;
  revisado?: boolean;
  autorizacion?: string | null;
  cod_clinica?: number | null;
  tipo_calculo?: TipoCalculo | null;
  via?: ViaPractica | null;
  porcentaje?: number | null;
  /** Fecha/hora de CARGA (no de práctica) — columna `created`. Es el criterio de orden
   *  de los listados, no el ID: las importaciones masivas de CMC intercalan rangos. */
  created_at?: string | null;
  /** NRO_SOCIO de quien cargó la prestación. */
  usuario?: string | null;
  /** Otros integrantes del equipo quirúrgico (típicamente los ayudantes). Solo lo trae
   *  la cabeza (id == grupo_equipo_id); los anidados vienen con `grupo` en null. */
  grupo?: PrestacionRead[] | null;
}

export type PrestacionUpdate = Partial<PrestacionItem>;

export interface MoverPeriodoPayload {
  cod_obra: string; periodo_origen: string;
  ids: number[]; direccion: "siguiente" | "anterior";
}
export interface MoverPeriodoResponse { ids_movidos: number[]; periodo_destino: string; }

export interface CierrePreviewResponse {
  cod_obra: string; periodo: string; cantidad: number; importe_total: Money; cerrado: boolean;
}

export interface CierrePayload {
  cod_obra: string;
  periodo: string;
  tipo_factura?: string;
  nro_factura?: string;
  archivo?: File | null;
}

export interface CierreResponse {
  id_factura: number; cod_obra: string; periodo: string; cantidad: number; importe_total: Money;
  documento_url?: string | null;
}

export interface ListarPrestacionesParams {
  /** ID exacto (PK). Primer campo del buscador de la pantalla de consulta. */
  id?: number;
  cod_obra?: string; periodo?: string; cod_medico?: string; cod_nomenclador?: string;
  estado?: EstadoPrestacion; tipo?: Tipo;
  grupo_equipo_id?: number;
  dni_paciente?: string; nombre_paciente?: string;
  fecha_desde?: string; fecha_hasta?: string;
  /** Sólo prestaciones cuya cabecera de facturación sigue abierta. Mira
   *  `facturacion.estado` en vez del `estado` copiado en la prestación, que una carga
   *  masiva por fuera de la API puede dejar desincronizado. */
  solo_facturas_abiertas?: boolean;
  q?: string;
  /** Busca el texto en `nro_orden` O en `autorizacion`. Segundo campo del buscador de
   *  la pantalla de consulta; se combina con AND con el resto de los filtros. */
  orden_o_autorizacion?: string;
  limit?: number; offset?: number;
}

export interface FacturaRead {
  id_prestaciones: number;
  id_cliente: number;
  /** 1 = factura original del período; 2+ = complementos, en orden de apertura. Solo lectura. */
  version: number;
  tipo_factura: string | null;
  nro_factura: string | null;
  tipo_factura_2: string | null;
  nro_factura_2: string | null;
  tipo_factura_3: string | null;
  nro_factura_3: string | null;
  periodo: string;
  periodo_label: string;
  cod_obr: string;
  fecha: string | null;
  fecha_envio: string | null;
  fecha_recep: string | null;
  importe: number | null;
  afip: string | null;
  usuario: string | null;
  estado: string | null;
  /** En un complemento nace en "C": la fase médico está cerrada, es carga exclusiva del Colegio. */
  estado_doctor?: string | null;
  created: string | null;
  documento_url?: string | null;
}

export interface ComplementoCreate {
  cod_obra: string;
  periodo: string;
}

export interface ListarFacturasParams {
  cod_obra?: string;
  periodo?: string;
  usuario?: string;
  estado?: string;
  /** true = solo complementos (v2+); false = solo originales (v1); omitido = todas. */
  solo_complementos?: boolean;
  q?: string;
  limit?: number;
  offset?: number;
}

export type TipoPrestador = "Medico" | "Ayudante" | "Gastos";

export interface PrestacionFacturaDetalle {
  id: number;
  periodo: string;
  autorizacion: string | null;
  fecha_practica: string | null;
  codigo: string | null;
  /** Opcional: no confirmado que el backend lo mande todavía en este endpoint. */
  via?: ViaPractica | null;
  nro_afiliado: string | null;
  nombre_paciente?: string | null;
  cantidad: number | null;
  sesion: number | null;
  porcentaje: number | null;
  honorarios: Money | null;
  gastos: Money | null;
  tipo_prestador: TipoPrestador | null;
  subtotal: Money | null;
  tipo: Tipo | null;
  revisado: boolean;
  estado: EstadoPrestacion | null;
  /** Vínculo ayudante/gastos → prestación cabeza de equipo (grupo_equipo_id ==
   * su propio id). null si no tiene equipo quirúrgico asociado. */
  grupo_equipo_id?: number | null;
  id_especialidad?: number | null;
  especialidad_nombre?: string | null;
}

export interface PrestadorFacturaGrupo {
  cod_medico: string;
  nombre: string | null;
  matricula: number | null;
  cantidad_prestaciones: number;
  total_cantidad: number;
  total_honorarios: Money;
  total_gastos: Money;
  total_subtotal: Money;
  prestaciones: PrestacionFacturaDetalle[];
}

export interface FacturaDetalleResponse {
  id_factura: number;
  version: number;
  periodo: string;
  periodo_label: string;
  cod_obra: string;
  estado: string | null;
  estado_doctor: string | null;
  total_prestaciones: number;
  total_importe: Money;
  prestadores: PrestadorFacturaGrupo[];
}

// ── Ficha completa de una prestación (pantalla de consulta, solo lectura) ────
// A diferencia de `PrestacionRead` (recortado, pensado para el formulario de
// edición), acá viene la fila TAL CUAL está en la base, sin recortes, más los
// códigos resueltos a nombre. Los nombres de campo replican los del backend
// (`PrestacionCrudaOut` en app/modules/facturacion/schemas.py), no los de
// `PrestacionRead` — por eso `cod_med` y no `cod_medico`, etc.
export interface PrestacionCruda {
  id_detalle_prestaciones: number;
  periodo: string;
  periodo_label?: string | null;
  created?: string | null;
  usuario?: string | null;
  origen_carga?: "medico" | "colegio" | null;
  estado?: string | null;
  revisado: boolean;
  version: number;
  cod_med?: string | null;
  cod_med_ejecutor?: string | null;
  cod_clinica?: number | null;
  cod_obr?: string | null;
  cod_nom?: string | null;
  nomenclador_id?: number | null;
  nro_orden?: string | null;
  autorizacion?: string | null;
  grupo_equipo_id?: number | null;
  id_especialidad?: number | null;
  dni_p?: string | null;
  nom_ape_p?: string | null;
  diag?: string | null;
  fecha_practica?: string | null;
  tipo?: Tipo | null;
  tipo_orden?: string | null;
  categoria?: string | null;
  via?: ViaPractica | null;
  sesion?: number | null;
  cantidad?: number | null;
  porc?: number | null;
  manual?: TipoCalculo | null;
  tipo_prestador?: TipoPrestador | null;
  honorarios?: Money | null;
  gastos?: Money | null;
  ayudante?: Money | null;
  importe_total?: Money | null;
  coseguro: Money;
  calculo_snapshot?: unknown;
  validacion_estado?: string | null;
  validacion_detalle?: string | null;
  validacion_respuesta?: unknown;
  validacion_anulada: boolean;
  orden_path?: string | null;
  orden_url?: string | null;
  // legacy CMC — casi siempre vacíos en filas cargadas por este módulo
  tpo_funcion?: string | null;
  tpo_serv?: string | null;
  cod_med_indica?: string | null;
  codigo_oms?: string | null;
  nro_vias?: number | null;
  fin_semana?: string | null;
  nocturno?: string | null;
  feriado?: string | null;
  urgencia?: string | null;
}

export interface SocioRef {
  nro_socio: number;
  nombre?: string | null;
  matricula_prov?: number | null;
  categoria?: string | null;
  es_organizacion: boolean;
}

export interface ObraSocialRef {
  nro_obrasocial: number;
  nombre?: string | null;
}

export interface NomencladorRef {
  id: number;
  codigo: string;
  descripcion?: string | null;
  categoria?: string | null;
  complejidad?: string | null;
  obra_social_nro?: number | null;
  /** true = no había vínculo persistido (`nomenclador_id`); se resolvió por código. */
  resuelto_por_codigo: boolean;
}

export interface AfiliadoRef {
  id: number;
  dni: string;
  nombre: string;
}

export interface AuditoriaEvento {
  id: number;
  timestamp: string;
  method: string;
  status_code: number;
  nro_socio?: number | null;
  nombre?: string | null;
  role?: string | null;
  ip?: string | null;
  request_body?: string | null;
}

export interface PrestacionFicha {
  prestacion: PrestacionCruda;
  medico?: SocioRef | null;
  clinica?: SocioRef | null;
  cargado_por?: SocioRef | null;
  obra_social?: ObraSocialRef | null;
  nomenclador?: NomencladorRef | null;
  paciente?: AfiliadoRef | null;
  factura?: FacturaRead | null;
  equipo: PrestacionRead[];
  auditoria: AuditoriaEvento[];
}

export const detailMessage = (detail: unknown): string =>
  typeof detail === "string" ? detail : (detail as any)?.mensaje ?? "Error";

/** "Original" para la v1; los complementos se numeran desde 1 (v2 = "Complemento 1"). */
export const versionLabel = (version: number): string =>
  version <= 1 ? "Original" : `Complemento ${version - 1}`;
