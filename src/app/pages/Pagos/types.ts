// Tipos compartidos del módulo Pagos / Liquidación

export type Pago = {
  id: number;
  anio: number;
  mes: number;
  descripcion: string | null;
  estado: "A" | "C" | "P";
  cierre_timestamp: string | null;
  // 1 = las deducciones cambiaron y la vista previa quedó vieja.
  deducciones_dirty?: boolean | number;
  total_bruto: string;
  total_debitos: string;
  total_creditos: string;
  total_neto: string;
  total_deduccion: string;
};

// Qué pasó con las prestaciones de una factura al agregarla al pago.
export type ResumenCarga = {
  total: number;
  cargadas: number;
  ya_liquidadas: number;
  importe_cero: number;
  sin_medico: number[];
  sin_medico_cantidad?: number;
  funcion_desconocida: number;
};

// Lo que quedó afuera (o con un supuesto), en una frase. Vacío si entró todo.
export const avisoDeCarga = (r: ResumenCarga): string => {
  const partes: string[] = [];
  if (r.sin_medico?.length) {
    const socios = r.sin_medico.slice(0, 8).join(", ") + (r.sin_medico.length > 8 ? "…" : "");
    partes.push(`${r.sin_medico_cantidad ?? r.sin_medico.length} sin médico en el padrón (socios ${socios})`);
  }
  if (r.importe_cero) partes.push(`${r.importe_cero} con importe en 0`);
  if (r.funcion_desconocida) partes.push(`${r.funcion_desconocida} con función desconocida, cargadas como médico`);
  if (r.ya_liquidadas) partes.push(`${r.ya_liquidadas} ya liquidadas en otro pago`);
  return partes.join("; ");
};

export type Liquidacion = {
  id: number;
  pago_id: number;
  obra_social_id: number;
  mes_periodo: number;
  anio_periodo: number;
  nro_factura: string;
  factura_id?: number | null;
  factura_version?: number | null;
  // Sólo en la respuesta de agregar la factura al pago.
  resumen_carga?: ResumenCarga | null;
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

// Fila de GET /api/lotes/snaps/buscar_atenciones (PrestacionCMCSearchRow).
// `id` es id_detalle_prestaciones: lo que queda guardado en Ajuste.id_atencion.
export type AtencionSearchRow = {
  // Débitos menos créditos ya cargados sobre esta prestación, en cualquier lote.
  ya_debitado?: number | string;
  id: number;
  cod_med: string;
  medico_nombre: string | null;
  nom_ape_p: string | null;
  cod_nom: string | null;
  tpo_funcion: string | null;
  fecha_practica: string | null;
  nro_orden: string | null;
  honorarios: string | null;
  gastos: string | null;
  ayudante: string | null;
  importe_total: string | null;
  periodo: string;
  cod_obr: string;
};

// Fila de GET /api/periodos/disponibles_lotes_ajustes: una factura cerrada (original o complementaria).
export type FacturaDisp = {
  FACTURA_ID: number;
  ANIO: number;
  MES: number;
  NRO_FACTURA: string;
  TIPO_FACTURA: string;
  VERSION: number;
  ESTADO: string;
  PERIODO: string;
};

export const etiquetaFactura = (f: Pick<FacturaDisp, "NRO_FACTURA" | "VERSION">) =>
  `${f.NRO_FACTURA} · ${f.VERSION > 1 ? `complementaria ${f.VERSION - 1}` : "original"}`;

// En listados y recibos sólo se marca la complementaria: sin marca es la factura normal.
export const nroFacturaMarcado = (nro?: string | null, version?: number | null) => {
  if (!nro) return "—";
  return version && version > 1 ? `${nro} · complementaria ${version - 1}` : nro;
};

// Fila de GET /api/periodos/facturas_para_pago: una factura con prestaciones cerradas por pagar.
export type FacturaPagoDisp = FacturaDisp & {
  CANTIDAD: number;
  IMPORTE: number;
};

export type LoteAjuste = {
  id: number;
  obra_social_id: number;
  obra_social_nombre?: string | null;
  factura_id?: number | null;
  nro_factura?: string | null;
  factura_version?: number | null;
  // false = la factura del lote todavía no está en el pago. Sólo informativo.
  factura_en_pago?: boolean | null;
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

export type Concepto = {
  id: number;
  nombre: string;
  nro_colegio: number;
  precio: number;
  porcentaje: number;
};

export type ObraSocial = {
  nro_obra_social?: number;
  nombre?: string;
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
export const mesLabel = (m: number) => MESES[(m - 1) % 12] ?? String(m);

// Sin `style: "currency"` a propósito: los ~100+ call-sites de `fmt()` en este módulo ya anteponen "$"/"-$"/"+$" a mano — agregar el símbolo acá lo duplicaría.
const currency = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
export const fmt = (n: number | string | null | undefined) =>
  currency.format(Number(n ?? 0));
