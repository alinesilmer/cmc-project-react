// PDF de un lote de ajustes (Formato A): con factura y sin factura. Débitos y créditos de una obra social en un período.
import type { jsPDF } from "jspdf";
import { PdfFormatoA, conSigno, fechaCorta, importe, type Fila } from "@/app/shared/lib/documentos/pdfFormatoA";
import { estadoLabel } from "../LoteDetalle/utiles";
import { fechaDMA, mesLabel, verPorcentajeItem, type Ajuste, type LoteAjuste } from "../types";

/** «2026-09-03» → «03/09/2026»; si viene de otra forma, tal cual. */
export const fechaPrestacion = (f: string | null) => {
  const m = f ? /^(\d{4})-(\d{2})-(\d{2})/.exec(f) : null;
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (f ?? "—");
};

const esDebito = (a: Ajuste) => a.tipo === "d";

/** Datos del lote que van arriba del PDF y del Excel (aparte de la obra social, el período y el estado). El % de pago es de cada ítem, no del lote. */
export function datosExtraDelLote(lote: LoteAjuste): [string, string][] {
  return [["Creado", fechaDMA(lote.created_at)]];
}

/** Cuenta de débitos y créditos del lote: lo que muestra la tabla es lo que suma el neto. */
export function totalesDe(ajustes: Ajuste[]) {
  let deb = 0, cre = 0, nd = 0, nc = 0;
  for (const a of ajustes) {
    if (esDebito(a)) { deb += Number(a.total); nd += 1; } else { cre += Number(a.total); nc += 1; }
  }
  // Al centavo: sumar importes con decimales deja ruido de punto flotante (81536.65000000001).
  const centavos = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  return { deb: centavos(deb), cre: centavos(cre), nd, nc, neto: centavos(cre - deb) };
}

function cierre(pdf: PdfFormatoA, t: ReturnType<typeof totalesDe>) {
  pdf.totales(
    [
      [`Débitos (${t.nd})`, conSigno(-t.deb)],
      [`Créditos (${t.nc})`, conSigno(t.cre)],
    ],
    ["NETO DEL LOTE", `${t.neto < 0 ? "-" : ""}$ ${importe(Math.abs(t.neto))}`],
  );
}

const cantidad = (n: number) => `${n} ${n === 1 ? "ajuste" : "ajustes"}`;

export const obraSocialDe = (lote: LoteAjuste) => `${lote.obra_social_id} ${lote.obra_social_nombre ?? ""}`.trim();

export async function generarLotePdf(lote: LoteAjuste, logo: string | null): Promise<jsPDF> {
  const ajustes = lote.ajustes ?? [];
  const periodo = `${mesLabel(lote.mes_periodo)} ${lote.anio_periodo}`;
  const t = totalesDe(ajustes);

  const filas: Fila[] = ajustes.map((a) => {
    const socio = a.nombre_prestador ? `${a.nro_socio ?? ""} ${a.nombre_prestador}`.trim() : `Médico ${a.medico_id}`;
    const detalle = [
      a.nro_consulta ? `Orden ${a.nro_consulta}` : null,
      a.id_atencion != null ? `Prest. ${a.id_atencion}` : null,
      a.observacion || null,
    ].filter(Boolean).join(" · ");
    return [
      esDebito(a) ? "Débito" : "Crédito",
      { t: socio, sub: detalle || undefined },
      a.codigo_prestacion ?? "—",
      fechaPrestacion(a.fecha_prestacion),
      fechaDMA(a.created_at),
      verPorcentajeItem(a.porcentaje_pago),
      importe(a.honorarios),
      importe(a.gastos),
      conSigno(esDebito(a) ? -Number(a.total) : Number(a.total)),
    ];
  });

  // Apaisado: con el % y la fecha de carga son nueve columnas.
  const pdf = await PdfFormatoA.crear({ horizontal: true });
  pdf.cabecera({
    titulo: "Lote de ajustes",
    subtitulo: "Débitos y créditos de una obra social en un período",
    logo,
    meta: [{ t: "Lote ", b: `Nº ${lote.id}` }, { t: periodo }, { t: `Emitido el ${fechaCorta()}` }],
  });
  pdf.datos([["Obra social", obraSocialDe(lote), 2], ["Período", periodo], ["Estado", estadoLabel(lote.estado)], ...datosExtraDelLote(lote)]);
  pdf.seccion("Ajustes", cantidad(ajustes.length));
  pdf.tabla(
    [
      { titulo: "Tipo", ancho: 8 },
      { titulo: "Socio" },
      { titulo: "Código", ancho: 8 },
      { titulo: "Fecha prest.", ancho: 9 },
      { titulo: "Cargado", ancho: 9 },
      { titulo: "% pago", ancho: 7, der: true },
      { titulo: "Honorarios", ancho: 11, der: true },
      { titulo: "Gastos", ancho: 9, der: true },
      { titulo: "Total", ancho: 11, der: true },
    ],
    filas,
  );
  cierre(pdf, t);
  return pdf.cerrar(`Lote ${lote.id} · ${lote.obra_social_nombre ?? lote.obra_social_id}`);
}

export async function generarLoteSinFacturaPdf(lote: LoteAjuste, logo: string | null): Promise<jsPDF> {
  const ajustes = lote.ajustes ?? [];
  const periodo = `${mesLabel(lote.mes_periodo)} ${lote.anio_periodo}`;
  const t = totalesDe(ajustes);

  const filas: Fila[] = ajustes.map((a) => [
    esDebito(a) ? "Débito" : "Crédito",
    String(a.medico_id),
    verPorcentajeItem(a.porcentaje_pago),
    importe(a.honorarios),
    importe(a.gastos),
    conSigno(esDebito(a) ? -Number(a.total) : Number(a.total)),
    fechaDMA(a.created_at),
    a.observacion || "—",
  ]);

  const pdf = await PdfFormatoA.crear();
  pdf.cabecera({
    titulo: "Lote de ajustes sin factura",
    subtitulo: "Débitos y créditos que no pertenecen a una factura",
    logo,
    meta: [{ t: "Lote sin factura ", b: `Nº ${lote.id}` }, { t: periodo }, { t: `Emitido el ${fechaCorta()}` }],
  });
  pdf.datos([["Obra social", obraSocialDe(lote), 2], ["Período", periodo], ["Estado", estadoLabel(lote.estado)], ...datosExtraDelLote(lote)]);
  pdf.seccion("Ajustes", cantidad(ajustes.length));
  pdf.tabla(
    [
      { titulo: "Tipo", ancho: 10 },
      { titulo: "Médico (ID)", ancho: 12 },
      { titulo: "% pago", ancho: 8, der: true },
      { titulo: "Honorarios", ancho: 14, der: true },
      { titulo: "Gastos", ancho: 11, der: true },
      { titulo: "Total", ancho: 14, der: true },
      { titulo: "Cargado", ancho: 11 },
      { titulo: "Observación" },
    ],
    filas,
  );
  cierre(pdf, t);
  return pdf.cerrar(`Lote sin factura ${lote.id} · ${lote.obra_social_nombre ?? lote.obra_social_id}`);
}
