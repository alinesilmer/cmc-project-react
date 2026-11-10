// Resumen de pago (Formato A): una sola tabla con facturas, adelantos, lotes y refacturaciones,
// más compensaciones y deducciones, y el total a pagar. `armarResumen` calcula los datos y los usan el PDF y el Excel.
import type { jsPDF } from "jspdf";
import { PdfFormatoA, conSigno, fechaCorta, importe, type Fila } from "@/app/shared/lib/documentos/pdfFormatoA";
import { etiquetaConcepto } from "@/app/shared/lib/conceptos";
import { facturaRefact, mesLabel, nroFacturaMarcado } from "../types";

// ── Lo que devuelve la vista previa del pago ──

export type LiquidacionItem = {
  liquidacion_id: number;
  obra_social_id: number;
  obra_social_nombre: string;
  nro_factura: string | null;
  factura_version?: number | null;
  mes_periodo: number;
  anio_periodo: number;
  /** Porcentaje de lo facturado que se paga (100 = todo). */
  porcentaje_pago?: string | number | null;
  total_bruto: string;
  total_honorarios: string;
  total_gastos: string;
  total_debitos: string;
  total_creditos: string;
  total_reconocido: string;
  total_neto: string;
};

export type LiquidacionTotales = {
  total_bruto: string;
  total_honorarios: string;
  total_gastos: string;
  total_debitos: string;
  total_creditos: string;
  total_reconocido: string;
  total_neto: string;
};

export type DeduccionItem = {
  descuento_id: number;
  // Número del concepto para el Colegio (no el id de la tabla).
  nro_colegio?: number | null;
  descuento_nombre: string;
  cantidad_socios: number;
  total_monto: string;
};

export type DeduccionTotales = { total_monto: string };

export type LoteItem = {
  lote_id: number;
  tipo: string;
  obra_social_id: number;
  obra_social_nombre: string;
  mes_periodo: number;
  anio_periodo: number;
  estado: "A" | "C" | "L" | "AP";
  /** Factura a la que está atado el lote, si la tiene (en una refacturación, la que se corrige). */
  nro_factura?: string | null;
  /** Refacturaciones: la factura NUEVA (tipo y número), si ya se cargó. */
  refact_tipo_factura?: string | null;
  refact_nro_factura?: string | null;
  /** Lo que el lote suma o resta en honorarios y en gastos (créditos +, débitos −). */
  total_honorarios?: string;
  total_gastos?: string;
  total_debitos: string;
  total_creditos: string;
};

export type LoteTotales = { total_debitos: string; total_creditos: string };

export type AdelantoItem = {
  adelanto_id: number;
  estado: string;
  obra_social_id: number;
  obra_social_nombre: string;
  nro_factura: string | null;
  mes_periodo: number;
  anio_periodo: number;
  porcentaje_pago?: string | number | null;
  prestaciones: number;
  medicos: number;
  total_honorarios: string;
  total_gastos: string;
  total_bruto: string;
};

export type CompensacionItem = {
  compensacion_id: number;
  estado: string;
  medico_id: number;
  medico_nombre: string;
  leyenda: string;
  importe: string;
};

export type VistaPrevia = {
  pago_id: number;
  mes: number;
  anio: number;
  descripcion: string;
  estado: string;
  /** Socios que intervienen en el pago. */
  cantidad_socios?: number;
  liquidaciones: { items: LiquidacionItem[]; totales: LiquidacionTotales };
  deducciones: { items: DeduccionItem[]; totales: DeduccionTotales };
  lotes: { items: LoteItem[]; totales: LoteTotales };
  adelantos?: { items: AdelantoItem[]; totales: { total_bruto: string } };
  compensaciones?: { items: CompensacionItem[]; totales: { a_favor: string; en_contra: string; neto: string } };
  // Las mismas cifras del encabezado del pago.
  resumen?: {
    total_bruto: string;
    total_debitos_os: string;
    total_arrastres: string;
    total_arrastres_cobrado: string;
    total_creditos: string;
    total_compensaciones: string;
    total_deduccion: string;
    total_neto: string;
    total_negativo_proximo_mes: string;
    total_a_pagar: string;
  };
};

export const ESTADO_PAGO: Record<string, string> = { A: "Abierto", C: "Cerrado", P: "Pagado" };

export type FilaFactura = {
  os: string;
  orden: number; // factura, adelanto, lote, lote sin factura, refacturación
  periodo: string;
  /** El mismo período en números («04/2026»), para el PDF. */
  periodoNum: string;
  /** Porcentaje de pago de la fila. null: no aplica (los lotes, que lo tienen por ítem; un adelanto cuya factura no está liquidada en este pago). */
  porcentaje: number | null;
  h: number;
  g: number;
  concepto: string;
  id: string;
  /** Los lotes llevan signo: «-» si restan y «+» si suman. */
  conSigno: boolean;
};

/** «98,4 %»; «—» si la fila no tiene porcentaje (no aplica). */
export const verPorcentaje = (p: number | null): string =>
  p == null || !Number.isFinite(p) ? "—" : `${p.toLocaleString("es-AR", { maximumFractionDigits: 2 })} %`;

const aPorcentaje = (v: string | number | null | undefined): number | null => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** El período que más se repite entre las facturas (el que se está liquidando). */
function periodoLiquidado(items: LiquidacionItem[]): { mes: number; anio: number } | null {
  const cuenta = new Map<string, { mes: number; anio: number; n: number }>();
  for (const l of items) {
    const k = `${l.anio_periodo}-${l.mes_periodo}`;
    const c = cuenta.get(k) ?? { mes: l.mes_periodo, anio: l.anio_periodo, n: 0 };
    c.n += 1;
    cuenta.set(k, c);
  }
  const todos = [...cuenta.values()].sort((a, b) => b.n - a.n || b.anio - a.anio || b.mes - a.mes);
  return todos[0] ?? null;
}

export type ResumenArmado = {
  /** «10/2026». */
  nroPago: string;
  /** «Octubre 2026». */
  periodoPago: string;
  liquidado: { mes: number; anio: number } | null;
  filas: FilaFactura[];
  sumaH: number;
  sumaG: number;
  cantidadObrasSociales: number;
  compensaciones: CompensacionItem[];
  compensacionesNeto: number;
  deducciones: { concepto: string; socios: number; total: number }[];
  deduccionesTotal: number;
  /** Honorarios y gastos de la tabla, con débitos y créditos (el número de la API si lo trae). */
  brutosYDebitos: number;
  compensacionesTotal: number;
  deduccionesAplicadas: number;
  arrastreCobrado: number;
  total: number;
};

/** Todo lo que muestran el PDF y el Excel del resumen, calculado una sola vez. */
export function armarResumen(data: VistaPrevia, totalAPagar: number): ResumenArmado {
  const { liquidaciones, deducciones } = data;
  const adelantos = data.adelantos ?? { items: [], totales: { total_bruto: "0" } };
  const compensaciones = data.compensaciones ?? { items: [], totales: { a_favor: "0", en_contra: "0", neto: "0" } };
  const etiquetaOS = (id: number, nombre: string) => `${id} ${nombre}`;
  const periodo = (mes: number, anio: number) => `${mesLabel(mes)} ${anio}`;
  const periodoNum = (mes: number, anio: number) => `${String(mes).padStart(2, "0")}/${anio}`;

  const filas: FilaFactura[] = [];
  for (const l of liquidaciones.items) {
    filas.push({
      os: etiquetaOS(l.obra_social_id, l.obra_social_nombre), orden: 0, periodo: periodo(l.mes_periodo, l.anio_periodo),
      periodoNum: periodoNum(l.mes_periodo, l.anio_periodo), porcentaje: aPorcentaje(l.porcentaje_pago) ?? 100,
      h: Number(l.total_honorarios), g: Number(l.total_gastos), concepto: "Factura",
      id: nroFacturaMarcado(l.nro_factura, l.factura_version), conSigno: false,
    });
  }
  for (const a of adelantos.items) {
    filas.push({
      os: etiquetaOS(a.obra_social_id, a.obra_social_nombre), orden: 1, periodo: periodo(a.mes_periodo, a.anio_periodo),
      periodoNum: periodoNum(a.mes_periodo, a.anio_periodo), porcentaje: aPorcentaje(a.porcentaje_pago),
      h: Number(a.total_honorarios), g: Number(a.total_gastos), concepto: "Adelanto",
      id: nroFacturaMarcado(a.nro_factura, null), conSigno: false,
    });
  }
  // Sólo los lotes que cuentan en el total del pago (liquidados o ya aplicados).
  for (const lote of data.lotes.items.filter((l) => l.estado === "L" || l.estado === "AP")) {
    const sinFactura = lote.tipo === "sin_factura";
    const refac = lote.tipo === "refacturacion";
    // Si la API es anterior y no trae el desglose, el neto del lote va todo en honorarios.
    const neto = Number(lote.total_creditos) - Number(lote.total_debitos);
    const desglosado = lote.total_honorarios != null && lote.total_gastos != null;
    filas.push({
      os: etiquetaOS(lote.obra_social_id, lote.obra_social_nombre),
      orden: sinFactura ? 3 : refac ? 4 : 2,
      // El lote sin factura también tiene período (el de la factura que adelanta o ajusta): se muestra igual que el resto.
      periodo: periodo(lote.mes_periodo, lote.anio_periodo),
      periodoNum: periodoNum(lote.mes_periodo, lote.anio_periodo),
      // El porcentaje es de cada ítem, no del lote: la fila del lote no lo muestra.
      porcentaje: null,
      h: desglosado ? Number(lote.total_honorarios) : neto,
      g: desglosado ? Number(lote.total_gastos) : 0,
      concepto: sinFactura ? "Lote s/fact" : refac ? "Refacturación" : "Lote",
      // La refacturación se identifica por su factura nueva; sin cargar, por el nº de lote (no por la factura que corrige).
      id: refac ? (facturaRefact(lote) ?? `Lote ${lote.lote_id}`) : String(lote.lote_id),
      conSigno: true,
    });
  }
  filas.sort((a, b) => a.os.localeCompare(b.os, "es", { numeric: true }) || a.orden - b.orden);

  // Los totales se redondean al centavo: sumar importes con decimales deja ruido de punto flotante (484774568.03999996).
  const centavos = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const sumaH = centavos(filas.reduce((s, f) => s + f.h, 0));
  const sumaG = centavos(filas.reduce((s, f) => s + f.g, 0));

  // Totales: los de la API, para que coincidan con el encabezado del pago.
  const r = data.resumen;
  return {
    nroPago: `${String(data.mes).padStart(2, "0")}/${data.anio}`,
    periodoPago: periodo(data.mes, data.anio),
    liquidado: periodoLiquidado(liquidaciones.items),
    filas,
    sumaH,
    sumaG,
    cantidadObrasSociales: new Set(filas.map((f) => f.os)).size,
    compensaciones: compensaciones.items,
    compensacionesNeto: centavos(Number(compensaciones.totales.neto)),
    deducciones: deducciones.items.map((d) => ({
      concepto: etiquetaConcepto(d.nro_colegio, d.descuento_nombre),
      socios: d.cantidad_socios,
      total: Number(d.total_monto),
    })),
    deduccionesTotal: centavos(Number(deducciones.totales.total_monto)),
    brutosYDebitos: centavos(r ? Number(r.total_bruto) - Number(r.total_debitos_os) + Number(r.total_creditos) : sumaH + sumaG),
    compensacionesTotal: centavos(r ? Number(r.total_compensaciones) : Number(compensaciones.totales.neto)),
    deduccionesAplicadas: centavos(r ? Number(r.total_deduccion) : Number(deducciones.totales.total_monto)),
    arrastreCobrado: centavos(r ? Number(r.total_arrastres_cobrado) : 0),
    total: centavos(totalAPagar),
  };
}

export async function generarResumenPdf(
  data: VistaPrevia,
  totalAPagar: number,
  logo: string | null,
): Promise<jsPDF> {
  const res = armarResumen(data, totalAPagar);

  // ── Una sola tabla ──
  const tabla: Fila[] = res.filas.map((f) => [
    f.os, f.periodoNum, verPorcentaje(f.porcentaje), f.conSigno ? conSigno(f.h) : importe(f.h), f.conSigno ? conSigno(f.g) : importe(f.g), f.concepto, f.id,
  ]);
  if (res.filas.length > 0) tabla.push({ total: true, celdas: [{ t: "Total", cols: 3 }, importe(res.sumaH), importe(res.sumaG), "", ""] });

  // ── Cabecera ──
  const pdf = await PdfFormatoA.crear();
  pdf.cabecera({
    titulo: "Resumen de pago",
    badge: ESTADO_PAGO[data.estado] ?? data.estado,
    logo,
    meta: [
      { t: "Pago ", b: `Nº ${res.nroPago}` },
      { t: res.periodoPago },
      { t: `Emitido el ${fechaCorta()}` },
    ],
  });

  pdf.seccion("Facturas, adelantos, lotes y refacturaciones");
  pdf.tabla(
    [
      { titulo: "Obra social", ancho: 28 },
      { titulo: "Período", ancho: 10 },
      { titulo: "%", ancho: 8, der: true },
      { titulo: "Honorarios", ancho: 16, der: true },
      { titulo: "Gastos", ancho: 13, der: true },
      { titulo: "Concepto", ancho: 12 },
      { titulo: "ID", ancho: 13 },
    ],
    tabla,
  );

  if (res.compensaciones.length > 0) {
    pdf.seccion("Compensaciones");
    pdf.tabla(
      [{ titulo: "Nº", ancho: 9 }, { titulo: "Socio", ancho: 27 }, { titulo: "Leyenda del recibo" }, { titulo: "Importe", ancho: 17, der: true }],
      [
        ...res.compensaciones.map((c): Fila => [`#${c.compensacion_id}`, c.medico_nombre, c.leyenda, conSigno(c.importe)]),
        { total: true, celdas: [{ t: "Total", cols: 3 }, conSigno(res.compensacionesNeto)] },
      ],
    );
  }

  // Las deducciones van siempre en una hoja aparte.
  pdf.hojaNueva();
  pdf.seccion("Deducciones por concepto");
  pdf.tabla(
    [{ titulo: "Concepto" }, { titulo: "Socios", ancho: 14, der: true }, { titulo: "Total aplicado", ancho: 24, der: true }],
    [
      ...res.deducciones.map((d): Fila => [d.concepto, String(d.socios), conSigno(-d.total)]),
      ...(res.deducciones.length > 0
        ? [{ total: true, celdas: [{ t: "Total", cols: 2 }, conSigno(-res.deduccionesTotal)] } as Fila]
        : []),
    ],
  );

  const filasTotal: [string, string][] = [
    ["Brutos y débitos", importe(res.brutosYDebitos)],
    ["Compensaciones", conSigno(res.compensacionesTotal)],
    ["Deducciones", conSigno(-res.deduccionesAplicadas)],
  ];
  if (res.arrastreCobrado !== 0) filasTotal.push(["Saldo arrastrado", conSigno(-res.arrastreCobrado)]);
  pdf.totales(filasTotal, ["TOTAL", `$ ${importe(res.total)}`]);

  return pdf.cerrar(`Resumen de pago ${res.nroPago}`);
}
