import { formatoImporte } from "@/app/shared/lib/formatos";
// Tipos compartidos del módulo Pagos / Liquidación

export type Pago = {
  id: number;
  anio: number;
  mes: number;
  descripcion: string | null;
  estado: "A" | "C" | "P";
  cierre_timestamp: string | null;
  total_bruto: string;
  total_debitos: string;
  total_creditos: string;
  total_neto: string;
  total_deduccion: string;
  // La parte de total_bruto que viene de adelantos.
  total_adelantos?: string;
  // Compensaciones del pago, con signo (+ a favor de socios, − en contra). Ya están en total_neto, no en total_bruto.
  total_compensaciones?: string;
  // `total_debitos` incluye el saldo arrastrado de los médicos (como el sistema anterior): acá van por separado.
  total_debitos_os?: string;
  total_arrastres?: string;
  // Del saldo arrastrado, lo que de verdad se cobra en este pago (el resto vuelve al mes siguiente).
  total_arrastres_cobrado?: string;
  // Lo que los médicos que deben más de lo que produjeron dejan para el pago siguiente (con el pago cerrado).
  total_negativo_proximo_mes?: string;
  // Lo que se les paga a todos los médicos (suma de sus netos): es el único «total a pagar» de todas las solapas.
  total_a_pagar?: string;
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
  // Las paga un adelanto: la factura entra sin ellas.
  reservadas?: number;
  importe_reservado?: string;
  adelantos_reservantes?: number[];
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
  if (r.reservadas) {
    const adelantos = (r.adelantos_reservantes ?? []).map((a) => `#${a}`).join(", ");
    partes.push(`${r.reservadas} reservadas en adelantos${adelantos ? ` (${adelantos})` : ""}, las paga el adelanto`);
  }
  return partes.join("; ");
};

export type Liquidacion = {
  id: number;
  pago_id: number;
  obra_social_id: number;
  // Sólo en el listado de facturas del pago.
  obra_social_nombre?: string | null;
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
  // Porcentaje de lo facturado que se paga (100 = todo; IOSCOR 98 / 98,4). Los importes ya vienen multiplicados.
  porcentaje_pago?: string | number;
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
  // Sólo ítems de lotes sin factura: % del ítem que se paga. null = sin porcentaje cargado (importados del legacy).
  porcentaje_pago?: string | number | null;
  // Cuándo se cargó el ajuste (ISO).
  created_at?: string | null;
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
  // Prestaciones de la factura reservadas en adelantos: no entran a este pago.
  RESERVADAS?: number;
  IMPORTE_RESERVADO?: number;
};

export type TipoFacturaRefact = "A" | "B" | "C";

/** «B 00032-00000172», o null si la refacturación todavía no tiene su factura cargada. */
export const facturaRefact = (l: { refact_tipo_factura?: string | null; refact_nro_factura?: string | null }): string | null =>
  l.refact_nro_factura ? `${l.refact_tipo_factura ? `${l.refact_tipo_factura} ` : ""}${l.refact_nro_factura}` : null;

export type LoteAjuste = {
  id: number;
  obra_social_id: number;
  obra_social_nombre?: string | null;
  factura_id?: number | null;
  nro_factura?: string | null;
  factura_version?: number | null;
  // Refacturaciones: la factura NUEVA que genera el Colegio (nro_factura de arriba es la de la original que se corrige).
  refact_tipo_factura?: TipoFacturaRefact | null;
  refact_nro_factura?: string | null;
  /** Ruta de la API (pide token): se abre con `abrirAdjunto()`. */
  refact_documento_url?: string | null;
  refact_documento_nombre?: string | null;
  // La factura del lote está en el pago al que va (o está) el lote. null = no aplica.
  factura_en_pago?: boolean | null;
  // La factura ya fue pagada (está en un pago cerrado o pagado). Un lote con factura sólo pasa al pago si
  // factura_en_pago o factura_pagada. null = lote sin factura.
  factura_pagada?: boolean | null;
  mes_periodo: number;
  anio_periodo: number;
  tipo: "normal" | "refacturacion" | "sin_factura";
  snap_origen_id: number | null;
  estado: "A" | "C" | "L" | "AP";
  pago_id: number | null;
  total_debitos: string;
  total_creditos: string;
  // Cuándo se creó el lote (ISO).
  created_at?: string | null;
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
export const fmt = (n: number | string | null | undefined) =>
  formatoImporte.format(Number(n ?? 0));

/** «27/08/2026» desde una fecha ISO (con o sin hora); «—» si no hay. Toma la fecha tal cual viene, sin pasar por zona horaria. */
export const fechaDMA = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};

/** % de pago de un ítem (ajuste) de un lote: arranca siempre en 100 y es propio del ítem, no se toma de la factura. */
export const PORCENTAJE_ITEM_DEFECTO = "100";
/** «98,4» o «98.4» -> 98.4; NaN si no es un número. */
export const aNumeroPorcentaje = (t: string | number) => Number(String(t).trim().replace(",", "."));
export const porcentajeItemValido = (t: string | number) => {
  const n = aNumeroPorcentaje(t);
  return Number.isFinite(n) && n >= 0.01 && n <= 200;
};
export const verPorcentajeItem = (v: string | number | null | undefined) =>
  `${Number(v ?? 100).toLocaleString("es-AR", { maximumFractionDigits: 2 })} %`;

export type LoteListItem = {
  id: number;
  tipo: "normal" | "refacturacion" | "sin_factura";
  estado: "A" | "C" | "L" | "AP";
  mes_periodo: number;
  anio_periodo: number;
  pago_id: number | null;
  obra_social_id: number;
  obra_social_nombre: string;
  nro_factura: string | null;
  total_debitos: string;
  total_creditos: string;
  // Cuándo se creó el lote (ISO).
  created_at?: string | null;
};

export type RefacturacionListItem = {
  id: number;
  tipo: "normal" | "refacturacion";
  estado: "A" | "C" | "L" | "AP";
  mes_periodo: number;
  anio_periodo: number;
  pago_id: number | null;
  obra_social_id: number;
  obra_social_nombre: string;
  nro_factura: string | null;
  refact_tipo_factura?: TipoFacturaRefact | null;
  refact_nro_factura?: string | null;
  refact_documento_url?: string | null;
  refact_documento_nombre?: string | null;
  snap_origen_id: number | null;
  total_debitos: string;
  total_creditos: string;
};

export type MedicoResult = {
  id: number;
  nro_socio: number | null;
  nombre: string;
  matricula_prov?: number | null;
};
