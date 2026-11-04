import { CMC_LOGO_SRC, fetchAsDataUrl } from "@/app/shared/lib/documentos/institucion";
import { PdfFormatoA, importe } from "@/app/shared/lib/documentos/pdfFormatoA";
import { MESES } from "../types";
import { formatCuit, type FilaRetencion, type ListadoRetenciones } from "./utiles";

// Comprobante de retención de Ganancias (Formato A): el papel que el Colegio le da a cada socio para que
// descuente lo retenido de su declaración. Lo mismo que imprimía el sistema anterior (datos del
// agente, del retenido, monto imponible, retención y mes de la declaración jurada), uno por hoja.

/** Número del comprobante: su lugar en el listado del mes (orden alfabético), igual que antes. */
export function numerarComprobantes(listado: ListadoRetenciones): Map<number, number> {
  const out = new Map<number, number>();
  listado.filas.filter((f) => f.retenido > 0).forEach((f, i) => out.set(f.medico_id, i + 1));
  return out;
}

function fechaLarga(d: Date): string {
  return `${d.getDate()} de ${MESES[d.getMonth()].toLowerCase()} de ${d.getFullYear()}`;
}

const nroComprobante = (n: number) => `Nº ${String(n).padStart(4, "0")}`;

function pintarComprobante(pdf: PdfFormatoA, logo: string | null, listado: ListadoRetenciones, f: FilaRetencion, nro: number) {
  const ag = listado.agente;
  const domicilio = [ag.domicilio, ag.localidad].filter(Boolean).join(" · ");

  pdf.cabecera({
    titulo: "Comprobante de retención",
    subtitulo: "Impuesto a las Ganancias",
    logo,
    meta: [
      ag.nro_agente_retencion ? { t: "Agente de retención ", b: `Nº ${ag.nro_agente_retencion}` } : { t: "Agente de retención" },
      ...(ag.cuit ? [{ t: `CUIT ${formatCuit(ag.cuit)}` }] : []),
      ...(domicilio ? [{ t: domicilio }] : []),
    ],
  });

  pdf.dato("Comprobante", nroComprobante(nro));
  pdf.dato("Apellido y nombre", f.nombre);
  pdf.dato("Nº de inscripción en el Impuesto a las Ganancias (CUIT)", formatCuit(f.cuit));
  if (f.nro_socio) pdf.dato("Nº de socio", String(f.nro_socio));

  pdf.importesDobles(
    ["Monto imponible (honorarios y gastos)", `$ ${importe(f.base)}`],
    ["Retención", `$ ${importe(f.retenido)}`],
  );
  pdf.texto([
    `Ingreso a efectuar según declaración jurada del mes de ${MESES[listado.mes - 1].toLowerCase()} de ${listado.anio}.`,
    `${ag.localidad || "Corrientes"}, ${fechaLarga(new Date())}.`,
  ]);
  pdf.firmas(["Aclaración y firma", "Sello del agente de retención"]);
}

/** Un PDF con el comprobante de cada socio de `filas` (los que tienen algo retenido). */
export async function construirComprobantes(listado: ListadoRetenciones, filas: FilaRetencion[]): Promise<Blob> {
  const [pdf, logo] = await Promise.all([PdfFormatoA.crear(), fetchAsDataUrl(CMC_LOGO_SRC)]);
  const numeros = numerarComprobantes(listado);
  const numerosPorHoja: number[] = [];
  filas
    .filter((f) => f.retenido > 0)
    .forEach((f, i) => {
      if (i > 0) pdf.hojaNueva();
      const nro = numeros.get(f.medico_id) ?? i + 1;
      numerosPorHoja.push(nro);
      pintarComprobante(pdf, logo, listado, f, nro);
    });
  // Cada comprobante es una hoja suelta: el pie lleva su número y «Página 1 de 1».
  const doc = pdf.cerrar((hoja) => `Comprobante de retención ${nroComprobante(numerosPorHoja[hoja - 1] ?? hoja)}`, {
    pagina: () => "Página 1 de 1",
  });
  return doc.output("blob") as Blob;
}
