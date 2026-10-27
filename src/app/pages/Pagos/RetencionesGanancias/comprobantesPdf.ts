import { AZUL, loadPdfLibs, type Rgb } from "@/app/shared/lib/documentos/pdfColegio";
import { CMC_LOGO_SRC, CMC_NAME, fetchAsDataUrl, getImageFormat } from "@/app/shared/lib/documentos/institucion";
import { MESES, fmt } from "../types";
import { formatCuit, type FilaRetencion, type ListadoRetenciones } from "./utiles";

// Comprobante de retención de Ganancias: el papel que el Colegio le da a cada socio para que
// descuente lo retenido de su declaración. Lo mismo que imprimía el sistema anterior (datos del
// agente, del retenido, monto imponible, retención y mes de la declaración jurada), uno por hoja.

const TINTA: Rgb = [15, 23, 42];
const GRIS: Rgb = [100, 116, 139];
const FILETE: Rgb = [203, 213, 225];

/** Número del comprobante: su lugar en el listado del mes (orden alfabético), igual que antes. */
export function numerarComprobantes(listado: ListadoRetenciones): Map<number, number> {
  const out = new Map<number, number>();
  listado.filas.filter((f) => f.retenido > 0).forEach((f, i) => out.set(f.medico_id, i + 1));
  return out;
}

function fechaLarga(d: Date): string {
  return `${d.getDate()} de ${MESES[d.getMonth()].toLowerCase()} de ${d.getFullYear()}`;
}

function pintarComprobante(doc: any, logo: string | null, listado: ListadoRetenciones, f: FilaRetencion, nro: number) {
  const w = doc.internal.pageSize.getWidth();
  const M = 20;
  const ag = listado.agente;
  let y = 18;

  // ── El agente ─────────────────────────────────────────────────────────────
  let x = M;
  if (logo) {
    try {
      doc.addImage(logo, getImageFormat(logo), M, y - 4, 12, 18);
      x = M + 17;
    } catch { /* sin logo igual se lee */ }
  }
  doc.setTextColor(...AZUL);
  doc.setFont("times", "normal"); doc.setFontSize(18);
  doc.text(ag.razon_social || CMC_NAME, x, y + 3);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...GRIS);
  const domicilio = [ag.domicilio, ag.localidad].filter(Boolean).join(" · ");
  if (domicilio) doc.text(domicilio, x, y + 9);
  if (ag.cuit) doc.text(`CUIT ${formatCuit(ag.cuit)}`, x, y + 14);

  y += 24;
  doc.setDrawColor(...AZUL); doc.setLineWidth(0.3);
  doc.line(M, y, w - M, y);

  // ── Título ────────────────────────────────────────────────────────────────
  y += 10;
  doc.setTextColor(...TINTA);
  doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.text("COMPROBANTE DE RETENCIÓN", M, y);
  doc.setFontSize(11);
  doc.text(`Nº ${String(nro).padStart(4, "0")}`, w - M, y, { align: "right" });
  y += 6;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(...GRIS);
  doc.text("IMPUESTO A LAS GANANCIAS", M, y);
  doc.text(
    ag.nro_agente_retencion ? `Agente de retención Nº ${ag.nro_agente_retencion}` : "Agente de retención",
    w - M, y, { align: "right" },
  );

  // ── El retenido ───────────────────────────────────────────────────────────
  y += 12;
  const dato = (rotulo: string, valor: string) => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...GRIS);
    doc.text(rotulo.toUpperCase(), M, y);
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...TINTA);
    doc.text(valor || "—", M, y + 5.5);
    y += 13;
  };
  dato("Apellido y nombre", f.nombre);
  dato("Nº de inscripción en el Impuesto a las Ganancias (CUIT)", formatCuit(f.cuit));
  if (f.nro_socio) dato("Nº de socio", String(f.nro_socio));

  // ── Importes ──────────────────────────────────────────────────────────────
  y += 2;
  const colW = (w - 2 * M) / 2;
  doc.setDrawColor(...FILETE); doc.setLineWidth(0.25);
  doc.roundedRect(M, y, w - 2 * M, 24, 2, 2, "S");
  doc.line(M + colW, y, M + colW, y + 24);
  const importe = (rot: string, valor: number, cx: number) => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...GRIS);
    doc.text(rot, cx, y + 8, { align: "center" });
    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(...TINTA);
    doc.text(`$ ${fmt(valor)}`, cx, y + 17, { align: "center" });
  };
  importe("MONTO IMPONIBLE (HONORARIOS Y GASTOS)", f.base, M + colW / 2);
  importe("RETENCIÓN", f.retenido, M + colW + colW / 2);

  y += 34;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...TINTA);
  doc.text(
    `Ingreso a efectuar según declaración jurada del mes de ${MESES[listado.mes - 1].toLowerCase()} de ${listado.anio}.`,
    M, y,
  );
  y += 8;
  doc.text(`${ag.localidad || "Corrientes"}, ${fechaLarga(new Date())}.`, M, y);

  // ── Firma ─────────────────────────────────────────────────────────────────
  y += 34;
  doc.setDrawColor(...GRIS); doc.setLineWidth(0.2);
  const firmaW = 62;
  doc.line(M, y, M + firmaW, y);
  doc.line(w - M - firmaW, y, w - M, y);
  doc.setFontSize(8.5); doc.setTextColor(...GRIS);
  doc.text("Aclaración y firma", M + firmaW / 2, y + 5, { align: "center" });
  doc.text("Sello del agente de retención", w - M - firmaW / 2, y + 5, { align: "center" });
}

/** Un PDF con el comprobante de cada socio de `filas` (los que tienen algo retenido). */
export async function construirComprobantes(listado: ListadoRetenciones, filas: FilaRetencion[]): Promise<Blob> {
  const [{ JsPDF }, logo] = await Promise.all([loadPdfLibs(), fetchAsDataUrl(CMC_LOGO_SRC)]);
  const numeros = numerarComprobantes(listado);
  const doc = new JsPDF({ orientation: "portrait", format: "a4", compress: true });
  filas
    .filter((f) => f.retenido > 0)
    .forEach((f, i) => {
      if (i > 0) doc.addPage();
      pintarComprobante(doc, logo, listado, f, numeros.get(f.medico_id) ?? i + 1);
    });
  return doc.output("blob") as Blob;
}
