// PDF de un lote de ajustes (Formato A): con factura y sin factura. Débitos y créditos de una obra social en un período.
import type { jsPDF } from "jspdf";
import { PdfFormatoA, conSigno, fechaCorta, importe, type Fila } from "@/app/shared/lib/documentos/pdfFormatoA";
import { estadoLabel } from "../LoteDetalle/utiles";
import { mesLabel, type Ajuste, type LoteAjuste } from "../types";

/** «2026-09-03» → «03/09/2026»; si viene de otra forma, tal cual. */
export const fechaPrestacion = (f: string | null) => {
  const m = f ? /^(\d{4})-(\d{2})-(\d{2})/.exec(f) : null;
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (f ?? "—");
};

const esDebito = (a: Ajuste) => a.tipo === "d";

/** Cuenta de débitos y créditos del lote: lo que muestra la tabla es lo que suma el neto. */
export function totalesDe(ajustes: Ajuste[]) {
  let deb = 0, cre = 0, nd = 0, nc = 0;
  for (const a of ajustes) {
    if (esDebito(a)) { deb += Number(a.total); nd += 1; } else { cre += Number(a.total); nc += 1; }
  }
  return { deb, cre, nd, nc, neto: cre - deb };
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
      importe(a.honorarios),
      importe(a.gastos),
      conSigno(esDebito(a) ? -Number(a.total) : Number(a.total)),
    ];
  });

  const pdf = await PdfFormatoA.crear();
  pdf.cabecera({
    titulo: "Lote de ajustes",
    subtitulo: "Débitos y créditos de una obra social en un período",
    logo,
    meta: [{ t: "Lote ", b: `Nº ${lote.id}` }, { t: periodo }, { t: `Emitido el ${fechaCorta()}` }],
  });
  pdf.datos([["Obra social", obraSocialDe(lote), 2], ["Período", periodo], ["Estado", estadoLabel(lote.estado)]]);
  pdf.seccion("Ajustes", cantidad(ajustes.length));
  pdf.tabla(
    [
      { titulo: "Tipo", ancho: 11 },
      { titulo: "Socio" },
      { titulo: "Código", ancho: 10 },
      { titulo: "Fecha", ancho: 12 },
      { titulo: "Honorarios", ancho: 13, der: true },
      { titulo: "Gastos", ancho: 11, der: true },
      { titulo: "Total", ancho: 13, der: true },
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
    importe(a.honorarios),
    importe(a.gastos),
    conSigno(esDebito(a) ? -Number(a.total) : Number(a.total)),
    a.observacion || "—",
  ]);

  const pdf = await PdfFormatoA.crear();
  pdf.cabecera({
    titulo: "Lote de ajustes sin factura",
    subtitulo: "Débitos y créditos que no pertenecen a una factura",
    logo,
    meta: [{ t: "Lote sin factura ", b: `Nº ${lote.id}` }, { t: periodo }, { t: `Emitido el ${fechaCorta()}` }],
  });
  pdf.datos([["Obra social", obraSocialDe(lote), 2], ["Período", periodo], ["Estado", estadoLabel(lote.estado)]]);
  pdf.seccion("Ajustes", cantidad(ajustes.length));
  pdf.tabla(
    [
      { titulo: "Tipo", ancho: 11 },
      { titulo: "Médico (ID)", ancho: 14 },
      { titulo: "Honorarios", ancho: 15, der: true },
      { titulo: "Gastos", ancho: 12, der: true },
      { titulo: "Total", ancho: 15, der: true },
      { titulo: "Observación" },
    ],
    filas,
  );
  cierre(pdf, t);
  return pdf.cerrar(`Lote sin factura ${lote.id} · ${lote.obra_social_nombre ?? lote.obra_social_id}`);
}
