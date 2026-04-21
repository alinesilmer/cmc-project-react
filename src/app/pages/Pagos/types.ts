// Tipos compartidos del módulo Pagos / Liquidación

export type Pago = {
  id: number;
  anio: number;
  mes: number;
  descripcion: string | null;
  estado: "A" | "C";
  cierre_timestamp: string | null;
  total_bruto: string;
  total_debitos: string;
  total_creditos: string;
  total_neto: string;
  total_deduccion: string;
};

export type Liquidacion = {
  id: number;
  pago_id: number;
  obra_social_id: number;
  mes_periodo: number;
  anio_periodo: number;
  nro_factura: string;
  total_bruto: string;
  total_honorarios: number;
  total_gastos: number;
  total_debitos: string;
  total_creditos: string;
  total_neto: string;
};

export type Ajuste = {
  id: number;
  lote_id: number;
  tipo: string;
  medico_id: number;
  obra_social_id: number;
  honorarios: string;
  gastos: string;
  total: string;
  observacion: string | null;
  id_atencion: number | null;
  origen: string;
  nombre_afiliado: string | null;
  nombre_prestador: string | null;
  nro_socio: number | null;
  nro_consulta: string | null;
  valor_cirujia: string | null;
  codigo_prestacion: string | null;
  fecha_prestacion: string | null;
};

export type AtencionSearchRow = {
  id: number;
  nro_socio: number;
  nombre_prestador: string;
  nombre_afiliado: string;
  nro_consulta: string;
  codigo_prestacion: string;
  fecha_prestacion: string;
  valor_cirujia: number;
  mes_periodo: number;
  anio_periodo: number;
  nro_obra_social: number;
};

export type LoteAjuste = {
  id: number;
  obra_social_id: number;
  mes_periodo: number;
  anio_periodo: number;
  tipo: "normal" | "refacturacion" | "sin_factura";
  snap_origen_id: number | null;
  estado: "A" | "C" | "L" | "AP";
  pago_id: number | null;
  total_debitos: string;
  total_creditos: string;
  ajustes: Ajuste[];
};

export type Descuento = {
  id: number;
  nombre: string;
  nro_colegio: number;
  precio: number;
  porcentaje: number;
};

export type ObraSocial = {
  NRO_OBRA_SOCIAL?: number;
  NRO_OBRASOCIAL?: number;
  NOMBRE?: string;       // some endpoints
  OBRA_SOCIAL?: string;  // most endpoints
};

/** Período disponible devuelto por /api/periodos/disponibles */
export type PeriodoDisp = {
  ANIO: number;
  MES: number;
  NRO_FACT_1: string;
  NRO_FACT_2: string;
  CERRADO: string;
};

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
export const mesLabel = (m: number) => MESES[(m - 1) % 12] ?? String(m);

export const currency = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0 });
export const fmt = (n: number | string | null | undefined) =>
  currency.format(Number(n ?? 0));

export const osId = (os: ObraSocial): number =>
  (os.NRO_OBRA_SOCIAL ?? os.NRO_OBRASOCIAL ?? 0) as number;

export const osNombre = (os: ObraSocial): string =>
  os.OBRA_SOCIAL ?? os.NOMBRE ?? "";
