import { formatMoney } from "@/app/shared/lib/utiles";
import { monthLabel } from "@/app/shared/lib/utiles";

export type CobranzaPorConceptoItem = {
  descuento_id: number;
  nro_colegio: number;
  nombre: string;
  medicos_con_deuda: number;
  cuotas_impagas: number;
  saldo: string;
  saldo_caja: string;
  periodo_mas_antiguo: string | null; // "MM/AAAA"
};

type CobranzaMedicoDeudorItem = {
  medico_id: number;
  nro_socio: number;
  medico_nombre: string;
  cuotas_impagas: number;
  periodo_mas_antiguo: string | null; // "MM/AAAA"
  meses_atraso: number;
  saldo: string;
  paga_por_caja: boolean;
  pagador_medico_id: number | null;
  pagador_nombre: string | null;
};

export type CobranzaMedicosPage = {
  descuento_id: number;
  descuento_nombre: string;
  total: number;
  page: number;
  size: number;
  items: CobranzaMedicoDeudorItem[];
};

type CobranzaCuotaItem = {
  deduccion_id: number;
  descuento_id: number;
  descuento_nombre: string;
  nro_colegio: number;
  mes_aplicar: number | null;
  anio_aplicar: number | null;
  calculado_total: string;
  monto_aplicado: string;
  saldo: string;
  paga_por_caja: boolean;
  estado: string;
};

export type CobranzaMedicoDetalle = {
  medico_id: number;
  nro_socio: number;
  medico_nombre: string;
  saldo_total: string;
  cuotas: CobranzaCuotaItem[];
};

type CobranzaSocioDeudorItem = {
  medico_id: number;
  nro_socio: number;
  medico_nombre: string;
  conceptos_con_deuda: number;
  cuotas_impagas: number;
  periodo_mas_antiguo: string | null; // "MM/AAAA"
  meses_atraso: number;
  saldo: string;
  saldo_caja: string;
};

export type CobranzaSociosPage = {
  total: number;
  page: number;
  size: number;
  items: CobranzaSocioDeudorItem[];
};

export type CobranzaExportRow = {
  medico_id: number;
  nro_socio: number;
  medico_nombre: string;
  descuento_id: number;
  nro_colegio: number;
  descuento_nombre: string;
  mes_aplicar: number | null;
  anio_aplicar: number | null;
  calculado_total: string;
  monto_aplicado: string;
  saldo: string;
  paga_por_caja: boolean;
  estado: string;
};
export { formatMoney };

export { monthLabel };

