// PDF del listado mensual de retenciones de Ganancias (Formato A). Sin portada: el período y el agente van en la cabecera.
import type { jsPDF } from "jspdf";
import { PdfFormatoA, fechaCorta, importe, periodoLargo, type Fila } from "@/app/shared/lib/documentos/pdfFormatoA";
import { formatCuit, tipoSujetoLabel, type ListadoRetenciones } from "./utiles";

export async function generarRetencionesPdf(data: ListadoRetenciones, logo: string | null): Promise<jsPDF> {
  const periodo = periodoLargo(data.mes, data.anio);
  const nroAgente = data.agente.nro_agente_retencion;
  const t = data.totales;

  const pdf = await PdfFormatoA.crear();
  pdf.cabecera({
    titulo: "Retenciones de Ganancias",
    subtitulo: "Listado mensual de retenciones por socio",
    logo,
    meta: [
      { t: "", b: periodo },
      nroAgente ? { t: "Agente de retención ", b: `Nº ${nroAgente}` } : { t: "Impuesto a las Ganancias" },
      { t: `Emitido el ${fechaCorta()}` },
    ],
  });
  pdf.datos([
    ["Período", periodo],
    ["Socios", String(data.filas.length)],
    ["Con retención", String(data.filas.filter((f) => f.retenido > 0).length)],
    ["Total retenido", `$ ${importe(t.retenido)}`],
  ]);

  const filas: Fila[] = data.filas.map((f) => [
    {
      t: f.nombre,
      sub: [f.nro_socio, formatCuit(f.cuit), f.medico_id ? tipoSujetoLabel(f.tipo_sujeto) : ""].filter((x) => x).join(" · ") || undefined,
    },
    importe(f.honorarios),
    importe(f.gastos),
    importe(f.base),
    importe(f.calculado),
    importe(f.retenido),
  ]);
  if (data.filas.length > 0) {
    filas.push({ total: true, celdas: ["Total", importe(t.honorarios), importe(t.gastos), importe(t.base), importe(t.calculado), importe(t.retenido)] });
  }

  pdf.seccion("Detalle");
  pdf.tabla(
    [
      { titulo: "Socio", ancho: 33 },
      { titulo: "Honorarios", ancho: 14, der: true },
      { titulo: "Gastos", ancho: 12, der: true },
      { titulo: "Monto imponible", ancho: 15, der: true },
      { titulo: "Calculada", ancho: 13, der: true },
      { titulo: "Retenido", ancho: 13, der: true },
    ],
    filas,
  );
  return pdf.cerrar(`Retenciones de Ganancias · ${periodo.toLowerCase()}`);
}
