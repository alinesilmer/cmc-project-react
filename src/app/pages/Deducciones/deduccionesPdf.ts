// PDF del listado de deducciones (Formato A): sólo el detalle, con el filtro en la cabecera.
import type { jsPDF } from "jspdf";
import { PdfFormatoA, fechaCorta, importe, type Fila } from "@/app/shared/lib/documentos/pdfFormatoA";

export type FilaDeduccionPdf = {
  medico: string;
  nroSocio?: number | null;
  concepto: string;
  /** Sólo si es una cuota («Cuota 4/10»). */
  cuota?: string;
  /** Cuándo se generó la deducción. */
  fecha: string;
  /** Período que se paga o descuenta. */
  periodo: string;
  /** Fecha exacta del descuento, debajo del período, si ya se aplicó. */
  descontadaEl?: string;
  monto: number;
};

export async function generarDeduccionesPdf(filas: FilaDeduccionPdf[], filtro: string, logo: string | null): Promise<jsPDF> {
  const pdf = await PdfFormatoA.crear();
  pdf.cabecera({
    titulo: "Deducciones",
    logo,
    meta: [{ t: "", b: `Filtro: ${filtro}` }, { t: `Emitido el ${fechaCorta()}` }],
  });

  const cuerpo: Fila[] = filas.map((f) => [
    { t: f.medico, sub: f.nroSocio != null ? `Socio ${f.nroSocio}` : undefined },
    { t: f.concepto, sub: f.cuota },
    f.fecha,
    { t: f.periodo, sub: f.descontadaEl },
    importe(f.monto),
  ]);
  if (filas.length > 0) {
    cuerpo.push({ total: true, celdas: [{ t: "Total", cols: 4 }, importe(filas.reduce((s, f) => s + f.monto, 0))] });
  }

  pdf.seccion("Detalle");
  pdf.tabla(
    [
      { titulo: "Médico", ancho: 28 },
      { titulo: "Concepto", ancho: 28 },
      { titulo: "Fecha", ancho: 13 },
      { titulo: "Período", ancho: 17 },
      { titulo: "Monto", ancho: 14, der: true },
    ],
    cuerpo,
  );
  return pdf.cerrar("Deducciones");
}
