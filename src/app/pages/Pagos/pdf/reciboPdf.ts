// PDF del recibo de liquidación de un médico (Formato A). El contenido sale del `detalle_json` que guardó la API.
import type { jsPDF } from "jspdf";
import { PdfFormatoA, conSigno, fechaCorta, importe, type Fila } from "@/app/shared/lib/documentos/pdfFormatoA";
import { compararPorNroConcepto, nombreConcepto } from "@/app/shared/lib/conceptos";
import { mesLabel } from "../types";

// ── Lo que trae el detalle del recibo ──

export type InfoMedico = { id: number; nro_socio: number; matricula: number; nombre: string };

export type AjusteItem = {
  ajuste_id?: number;
  lote_id: number;
  honorarios: number;
  gastos: number;
  total: number;
  observacion?: string | null;
  /** % de pago del ítem (los importes ya vienen multiplicados por él). Recibos anteriores no lo traen. */
  porcentaje_pago?: number | null;
};

/** Texto chico bajo cada débito/crédito: la observación y, si el ítem se pagó a menos (o más) del 100 %, el porcentaje. */
const subAjuste = (aj: AjusteItem): string | undefined => {
  const pct = aj.porcentaje_pago != null && aj.porcentaje_pago !== 100
    ? `al ${aj.porcentaje_pago.toLocaleString("es-AR", { maximumFractionDigits: 2 })} %`
    : null;
  return [aj.observacion || null, pct].filter(Boolean).join(" · ") || undefined;
};

export type LiquidacionDetalle = {
  obra_social: string;
  periodo: string;
  total_honorarios: number;
  total_gastos: number;
  total_bruto: number;
  debitos: { total: number; detalle: AjusteItem[] };
  creditos: { total: number; detalle: AjusteItem[] };
};

export type DeduccionItem = {
  nro_deduccion: number;
  nombre_deduccion: string;
  periodo_a_aplicar: string | null;
  /** Lo cobrado en este pago. */
  total: number;
  /** Lo que se debía de ese concepto y lo que queda después de este cobro (recibos nuevos). */
  adeudado?: number;
  saldo?: number;
  // Cuando el médico paga la deducción de otro socio (por ejemplo, la cuota de su esposa).
  por_cuenta_de?: { nro_socio: number | null; nombre: string | null };
};

export type AdelantoRecibo = {
  adelanto_id: number;
  obra_social: string;
  nro_factura: string | null;
  factura_version: number | null;
  periodo: string;
  prestaciones: number;
  total_honorarios: number;
  total_gastos: number;
  total: number;
};

export type CompensacionRecibo = { compensacion_id: number; leyenda: string; importe: number };

// Débito o crédito de un lote cuya factura no está en el pago (lote sin factura, por ejemplo).
export type OtroAjusteRecibo = AjusteItem & { obra_social: string; periodo: string; tipo: "debito" | "credito" };

export type Detalle = {
  liquidaciones: Record<string, LiquidacionDetalle>;
  adelantos?: { total: number; detalle: AdelantoRecibo[] };
  compensaciones?: { total: number; detalle: CompensacionRecibo[] };
  // Deuda de liquidaciones anteriores: se resta del reconocido como un débito (ya está en «débitos»).
  arrastres?: { total: number; detalle: { deduccion_id: number; periodo: string; total: number }[] };
  deducciones: { total: number; detalle: DeduccionItem[] };
  otros_ajustes?: { total_debitos: number; total_creditos: number; detalle: OtroAjusteRecibo[] };
};

// Totales que calculó la API al generar el recibo: son los que valen.
export type ResumenRecibo = {
  honorarios: number;
  gastos: number;
  bruto: number;
  debitos: number;
  arrastres?: number; // saldo arrastrado: ya está sumado en `debitos`
  creditos: number;
  compensaciones?: number;
  reconocido: number;
  deducciones: number;
  neto_a_pagar: number;
};

export type DetalleJson = { info_medico?: InfoMedico; resumen?: ResumenRecibo; detalle?: Detalle };

export type ReciboParaPdf = {
  medico_id: number;
  total_neto: string | number;
  emision_timestamp: string | null;
  /** Estado del recibo: la fecha de emisión sólo vale si ya está emitido (o pagado). */
  estado?: string;
  detalle_json?: DetalleJson;
};

const ACLARACION = [
  "SOLICITAMOS LA EMISION DE FACTURA Y/O RECIBO TIPO 'A','B' Y/O 'C', SEGUN CUAL SEA SU CONDICION TRIBUTARIA, POR LOS HONORARIOS PERCIBIDOS Y ENTREGARLA EN EL SECTOR DE LIQUIDACION Y PAGOS DEL COLEGIO MEDICO DE CORRIENTES.-",
  "( OBLIGACION SEGUN RG NRO. 1415/03 ).-",
];

/** «11/2026» → «Noviembre 2026». */
const periodoLargo = (p: string | null | undefined) => {
  const m = /^(\d{1,2})\/(\d{4})$/.exec(p ?? "");
  return m ? `${mesLabel(Number(m[1]))} ${m[2]}` : (p ?? "—");
};

type TotalesOS = { nombre: string; periodo: string | null; h: number; g: number; b: number; d: number; c: number };

/** «11/2026» → 202611, para ordenar los períodos de una misma obra social; sin período va al final. */
const claveFecha = (p: string | null) => {
  const m = /^(\d{1,2})\/(\d{4})$/.exec(p ?? "");
  return m ? Number(m[2]) * 100 + Number(m[1]) : 999999;
};

export async function generarReciboPdf(
  recibo: ReciboParaPdf,
  pago: { id: number; mes: number; anio: number },
  logo: string | null,
): Promise<jsPDF> {
  const dj = recibo.detalle_json;
  const info = dj?.info_medico;
  const detalle = dj?.detalle;
  const neto = Number(recibo.total_neto);

  const pdf = await PdfFormatoA.crear();
  // La fecha del recibo es la de su emisión (cuando se marca el pago como pagado), no la de cuando se generó o recalculó.
  const emitido = recibo.estado === "emitido" || recibo.estado === "pagado";
  const socio = [info?.nro_socio, info?.nombre ?? `Médico #${recibo.medico_id}`, info?.matricula]
    .filter((x) => x != null && x !== "")
    .join(" - ");

  pdf.cabecera({
    titulo: "Recibo de liquidación",
    logo,
    meta: [
      { t: "Liquidación ", b: `Nº ${pago.id}` },
      { t: emitido && recibo.emision_timestamp ? `Emitido el ${fechaCorta(recibo.emision_timestamp)}` : "Recibo sin emitir" },
    ],
    fila: { izquierda: socio, derecha: `Pago de ${mesLabel(pago.mes).toLowerCase()} ${pago.anio}` },
  });

  if (detalle) {
    // ── Detalle por obra social y período de sus facturas: sin números de factura ──
    const porOS = new Map<string, TotalesOS>();
    const os = (nombre: string, periodo: string | null | undefined) => {
      const k = `${nombre || "—"}|${periodo ?? ""}`;
      if (!porOS.has(k)) porOS.set(k, { nombre: nombre || "—", periodo: periodo || null, h: 0, g: 0, b: 0, d: 0, c: 0 });
      return porOS.get(k)!;
    };
    for (const liq of Object.values(detalle.liquidaciones)) {
      const t = os(liq.obra_social, liq.periodo);
      t.h += liq.total_honorarios; t.g += liq.total_gastos; t.b += liq.total_bruto;
      t.d += liq.debitos.total; t.c += liq.creditos.total;
    }
    for (const a of detalle.adelantos?.detalle ?? []) {
      const t = os(a.obra_social, a.periodo);
      t.h += a.total_honorarios; t.g += a.total_gastos; t.b += a.total;
    }
    for (const aj of detalle.otros_ajustes?.detalle ?? []) {
      const t = os(aj.obra_social, aj.periodo);
      if (aj.tipo === "debito") t.d += aj.total; else t.c += aj.total;
    }
    if (porOS.size > 0) {
      const filas: Fila[] = [...porOS.values()]
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es") || claveFecha(a.periodo) - claveFecha(b.periodo))
        .map((t) => [t.nombre, t.periodo ?? "—", importe(t.h), importe(t.g), importe(t.b), t.d ? conSigno(-t.d) : "", t.c ? conSigno(t.c) : ""]);
      const suma = [...porOS.values()].reduce(
        (s, t) => ({ h: s.h + t.h, g: s.g + t.g, b: s.b + t.b, d: s.d + t.d, c: s.c + t.c }),
        { h: 0, g: 0, b: 0, d: 0, c: 0 },
      );
      filas.push({
        total: true,
        celdas: [{ t: "Total", cols: 2 }, importe(suma.h), importe(suma.g), importe(suma.b), suma.d ? conSigno(-suma.d) : "", suma.c ? conSigno(suma.c) : ""],
      });
      pdf.seccion("Detalle por obra social");
      pdf.tabla(
        [
          { titulo: "Obra social", ancho: 31 },
          { titulo: "Período", ancho: 10 },
          { titulo: "Honorarios", der: true },
          { titulo: "Gastos", der: true },
          { titulo: "Bruto", der: true },
          { titulo: "Débitos", der: true },
          { titulo: "Créditos", der: true },
        ],
        filas,
      );
    }

    // ── Detalle débitos/créditos: sólo eso, sin número de lote ──
    const debitos: Fila[] = [];
    const creditos: Fila[] = [];
    for (const liq of Object.values(detalle.liquidaciones)) {
      for (const aj of liq.debitos.detalle) debitos.push(["Débito", { t: liq.obra_social, sub: subAjuste(aj) }, conSigno(-aj.total)]);
      for (const aj of liq.creditos.detalle) creditos.push(["Crédito", { t: liq.obra_social, sub: subAjuste(aj) }, conSigno(aj.total)]);
    }
    for (const aj of detalle.otros_ajustes?.detalle ?? []) {
      const fila: Fila = [
        aj.tipo === "debito" ? "Débito" : "Crédito",
        { t: aj.obra_social, sub: subAjuste(aj) },
        conSigno(aj.tipo === "debito" ? -aj.total : aj.total),
      ];
      (aj.tipo === "debito" ? debitos : creditos).push(fila);
    }
    // El saldo arrastrado se resta como un débito más: sin esta fila el neto no se explica.
    for (const a of detalle.arrastres?.detalle ?? []) {
      debitos.push(["Débito", { t: "Saldo arrastrado", sub: a.periodo ? `Período de origen ${periodoLargo(a.periodo)}` : undefined }, conSigno(-a.total)]);
    }
    if (debitos.length + creditos.length > 0) {
      pdf.seccion("Detalle débitos/créditos");
      pdf.tabla([{ titulo: "Tipo", ancho: 20 }, { titulo: "Detalle" }, { titulo: "Importe", ancho: 17, der: true }], [...debitos, ...creditos]);
    }

    // ── Compensaciones: tabla aparte, sólo si el socio tiene ──
    const compensaciones = detalle.compensaciones?.detalle ?? [];
    if (compensaciones.length > 0) {
      pdf.seccion("Compensaciones");
      pdf.tabla(
        [{ titulo: "Detalle" }, { titulo: "Importe", ancho: 17, der: true }],
        compensaciones.map((c) => [c.leyenda, conSigno(c.importe)]),
      );
    }

    // ── Deducciones: a todo el ancho, ordenadas por número de concepto, que no se muestra ──
    const deds = [...detalle.deducciones.detalle].sort((a, b) => compararPorNroConcepto(a.nro_deduccion, b.nro_deduccion));
    if (deds.length > 0) {
      const conDatos = deds.every((d) => d.adeudado != null && d.saldo != null);
      const filas: Fila[] = deds.map((d) => [
        {
          t: nombreConcepto(d.nro_deduccion, d.nombre_deduccion),
          sub: d.por_cuenta_de ? `Por pago del socio Nº ${d.por_cuenta_de.nro_socio ?? "—"}` : undefined,
        },
        periodoLargo(d.periodo_a_aplicar),
        d.adeudado != null ? importe(d.adeudado) : "—",
        conSigno(-d.total),
        d.saldo != null ? importe(d.saldo) : "—",
      ]);
      filas.push({
        total: true,
        celdas: [
          { t: "Total", cols: 2 },
          conDatos ? importe(deds.reduce((s, d) => s + (d.adeudado ?? 0), 0)) : "—",
          conSigno(-deds.reduce((s, d) => s + d.total, 0)),
          conDatos ? importe(deds.reduce((s, d) => s + (d.saldo ?? 0), 0)) : "—",
        ],
      });
      pdf.seccion("Deducciones");
      pdf.tabla(
        [
          { titulo: "Concepto", ancho: 34 },
          { titulo: "Período", ancho: 16 },
          { titulo: "Imp. adeudado", ancho: 18, der: true },
          { titulo: "Cobrado", ancho: 16, der: true },
          { titulo: "Saldo", ancho: 16, der: true },
        ],
        filas,
      );
    }
  }

  pdf.destacado(`NETO A PAGAR $ ${importe(neto)}`);
  pdf.nota(ACLARACION);
  return pdf.cerrar(`Recibo de liquidación · socio ${info?.nro_socio ?? recibo.medico_id}`);
}
