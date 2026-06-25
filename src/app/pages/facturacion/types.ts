export type TipoCalculo = "A" | "M";
export type EstadoPrestacion = "A" | "C" | "X" | "L";
export type Tipo = "Consulta" | "Practica" | "Honorarios individuales" | "Sanatorio";

export type Money = string;

export type MedicoOption      = { cod: string; nombre: string; matricula?: string; categoria?: string };
export type ObraSocialOption  = { id: number; nro_obra_social: number; nombre: string };
export type NomencladorOption = { codigo: string; descripcion: string };

export interface AfiliadoRead {
  id: number; dni: string; nombre: string; usuario?: string; created_at?: string;
}

export interface PrestacionItem {
  cod_medico: string;
  dni_paciente?: string | null;
  fecha_practica?: string | null;
  cod_clinica?: number | null;
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
export interface GuardadoResponse  { ids: number[]; importe_total: Money; }

export interface PeriodoActivoResponse {
  cod_obra: string; periodo: string;
  periodo_label: string;
}

export interface PrecioResponse {
  honorarios: Money; gastos: Money; ayudante: Money;
  descripcion: string; fuente: string;
  complejidad?: string | null; nivel?: number | null;
  snapshot?: Array<Record<string, unknown>> | null;
  admitido: boolean; motivo?: string | null;
  por_presupuesto: boolean;
}

export interface PrestacionRead {
  id: number; periodo: string; cod_medico: string;
  nro_orden?: string | null;
  cod_obra_social?: string | null; cod_nomenclador?: string | null;
  tipo?: Tipo | null;
  grupo_equipo_id?: number | null;
  sesion?: number | null; cantidad?: number | null;
  honorarios?: Money | null; gastos?: Money | null; ayudante?: Money | null;
  importe_total?: Money | null;
  estado?: EstadoPrestacion | null;
  fecha_practica?: string | null;
  dni_paciente?: string | null; nombre_paciente?: string | null;
}

export type PrestacionUpdate = Partial<PrestacionItem>;

export interface MoverPeriodoPayload {
  cod_obra: string; periodo_origen: string;
  nro_ordenes: string[]; direccion: "siguiente" | "anterior";
}
export interface MoverPeriodoResponse { ids_movidos: number[]; periodo_destino: string; }

export interface CierrePreviewResponse {
  cod_obra: string; periodo: string; cantidad: number; importe_total: Money; cerrado: boolean;
}
export interface CierreResponse {
  id_factura: number; cod_obra: string; periodo: string; cantidad: number; importe_total: Money;
}

export interface ListarPrestacionesParams {
  cod_obra?: string; periodo?: string; cod_medico?: string; cod_nomenclador?: string;
  nro_orden?: string; estado?: EstadoPrestacion; tipo?: Tipo;
  grupo_equipo_id?: number;
  dni_paciente?: string; nombre_paciente?: string;
  fecha_desde?: string; fecha_hasta?: string;
  q?: string; limit?: number; offset?: number;
}

export const detailMessage = (detail: unknown): string =>
  typeof detail === "string" ? detail : (detail as any)?.mensaje ?? "Error";
