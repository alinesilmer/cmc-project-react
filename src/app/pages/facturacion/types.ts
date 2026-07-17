export type TipoCalculo = "A" | "M";
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
  dni_paciente?: string | null;
  fecha_practica?: string | null;
  cod_clinica?: number | null;
  autorizacion?: string | null;
  cod_nomenclador: string;
  cantidad?: number;
  sesion?: number;
  tipo_calculo?: TipoCalculo;
  honorarios?: number | Money | null;
  gastos?: number | Money | null;
  ayudante?: number | Money | null;
  porcentaje?: number;
  grupo_equipo_id?: number | null;
}

export interface PrestacionesCreate { obra_social: string; prestaciones: PrestacionItem[]; }
/** Carga en un complemento: se referencia por `factura_id`, no por obra_social/periodo. */
export interface PrestacionesComplementariaCreate { factura_id: number; prestaciones: PrestacionItem[]; }
export interface GuardadoResponse  { ids: number[]; importe_total: Money; }

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
}

export interface PrestacionRead {
  id: number; periodo: string; cod_medico: string;
  /** @deprecated Ahora es igual a `id`. Viene por compatibilidad; usar `id` como identificador. */
  nro_orden?: string | null;
  cod_obra_social?: string | null; cod_nomenclador?: string | null;
  tipo?: Tipo | null;
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
  porcentaje?: number | null;
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
  cod_obra?: string; periodo?: string; cod_medico?: string; cod_nomenclador?: string;
  estado?: EstadoPrestacion; tipo?: Tipo;
  grupo_equipo_id?: number;
  dni_paciente?: string; nombre_paciente?: string;
  fecha_desde?: string; fecha_hasta?: string;
  q?: string; limit?: number; offset?: number;
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
  nro_afiliado: string | null;
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

export const detailMessage = (detail: unknown): string =>
  typeof detail === "string" ? detail : (detail as any)?.mensaje ?? "Error";

/** "Original" para la v1; los complementos se numeran desde 1 (v2 = "Complemento 1"). */
export const versionLabel = (version: number): string =>
  version <= 1 ? "Original" : `Complemento ${version - 1}`;
