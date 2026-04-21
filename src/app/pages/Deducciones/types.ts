export type DeduccionEstado =
  | "pendiente"
  | "vencida"
  | "en_pago"
  | "aplicado"
  | "eliminado";

export type DeduccionOrigen = "manual" | "automatico";

export type DeduccionHistorialItem = {
  id: number;
  origen: DeduccionOrigen;
  paga_por_caja: boolean;
  estado: DeduccionEstado;
  medico_id: number;
  medico_nombre: string;
  descuento_id: number | null;
  descuento_nombre: string;
  monto: number;
  saldo_pendiente: number;
  mes_periodo: number | null;
  anio_periodo: number | null;
  cuota_nro: number;
  cuotas_total: number | null;
  generado_en_pago_id: number | null;
  created_at: string;
};

export type DeduccionHistorialResponse = {
  total: number;
  page: number;
  size: number;
  items: DeduccionHistorialItem[];
  monto_total: number;
};

export type TopDeudorItem = {
  medico_id: number;
  medico_nombre: string;
  nro_socio: number;
  saldo_total: string;
};

export type DeduccionCreatePayload = {
  medico_id: number;
  descuento_id: number;
  monto_total: number;
  mes_inicio: number;
  anio_inicio: number;
  pagador_medico_id?: number | null;
  cuotas: Array<{ paga_por_caja: boolean }>;
};

export type DeduccionRead = {
  id: number;
  medico_id: number;
  descuento_id: number | null;
  descuento_nombre: string;
  origen: DeduccionOrigen;
  estado: string;
  paga_por_caja: boolean;
  monto_total: number | null;
  monto_cuota: number | null;
  calculado_total: number;
  monto_aplicado: number;
  cuotas_total: number | null;
  cuota_nro: number;
  cuotificado: boolean | null;
  mes_aplicar: number | null;
  anio_aplicar: number | null;
  pagador_medico_id: number | null;
  generado_en_pago_id: number | null;
  created_at: string | null;
};

export type DescuentoOption = {
  id: number;
  nombre: string;
  nro_colegio?: string;
};

export type MedicoOption = {
  id: number;
  nro_socio: number | null;
  nombre: string;
};

export type Pago = {
  id: number;
  anio: number;
  mes: number;
  estado: "A" | "C";
};

export const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export const monthLabel = (month: number | null, year: number | null): string => {
  if (!month || !year) return "—";
  return `${String(month).padStart(2, "0")}/${year}`;
};

export const formatMoney = (value: string | number | null | undefined): string =>
  Number(value ?? 0).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
