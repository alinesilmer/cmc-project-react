import {
  AZUL, CREMA, MARGEN, TW,
  fitText, loadPdfLibs, margenTabla, pintarFranja, pintarPies, redondearTabla, rotulo, tableStyles,
} from "@/app/pages/AfiliadosPorObraSocialPage/pdfBuilder";
import { CMC_LOGO_SRC, CMC_NAME, fetchAsDataUrl } from "@/app/pages/AfiliadosPorObraSocialPage/institution";
import { fmtFechaVisible } from "@/app/pages/AfiliadosPorObraSocialPage/helpers";
import { encabezadoDe, textoDeCelda, totalFacturado } from "./exportar";
import type { ColumnaExport, DocumentoReporte } from "./exportar";

// PDF de un reporte, con el mismo dibujo que el padrón de prestadores: portada azul a página llena y, después.

/** Columnas angostas para los números, anchas para los textos largos. */
function anchosDe<T>(columnas: ColumnaExport<T>[], filas: T[]): number[] {
  const muestra = filas.slice(0, 200);
  const pesos = columnas.map((c) => {
    const largo = Math.max(c.header.length, ...muestra.map((f) => textoDeCelda(c, f).length));
    return Math.min(46, Math.max(8, largo));
  });
  const suma = pesos.reduce((a, b) => a + b, 0);
  return pesos.map((p) => (p / suma) * TW);
}

type Portada = { titulo: string; periodo: string; obraSocial: string; registros: number; facturado: string | null; fecha: string };

function pintarPortada(doc: any, p: Portada) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  doc.setFillColor(...AZUL);
  doc.rect(0, 0, w, h, "F");

  rotulo(doc, CMC_NAME, MARGEN, 14, "left");
  rotulo(doc, fitText(doc, p.obraSocial.toUpperCase(), w / 2), w - MARGEN, 14, "right");

  doc.setTextColor(...CREMA);
  doc.setFont("times", "normal"); doc.setFontSize(58);
  doc.text("Reporte de", MARGEN, h / 2 - 2);
  doc.text(fitText(doc, p.titulo.toLowerCase(), w - 2 * MARGEN), MARGEN, h / 2 + 20);
  doc.setFontSize(24);
  doc.text(p.periodo, MARGEN, h / 2 + 36);

  rotulo(doc, "Registros", MARGEN, h - 17, "left", true);
  rotulo(doc, p.registros.toLocaleString("es-AR"), MARGEN, h - 12.5, "left");
  if (p.facturado) {
    rotulo(doc, "Facturado", MARGEN + 50, h - 17, "left", true);
    rotulo(doc, p.facturado, MARGEN + 50, h - 12.5, "left");
  }
  rotulo(doc, "Fecha", w - MARGEN, h - 17, "right", true);
  rotulo(doc, p.fecha.replace(/\//g, "\\"), w - MARGEN, h - 12.5, "right");
}

export async function construirPdfReporte<T>(reporte: DocumentoReporte<T>): Promise<Blob> {
  const [{ JsPDF, autoTable }, logo] = await Promise.all([loadPdfLibs(), fetchAsDataUrl(CMC_LOGO_SRC)]);

  const { titulo, periodo, obraSocial, columnas, filas } = reporte;
  const fecha = fmtFechaVisible(new Date());
  const alcance = `${periodo}  ·  ${obraSocial}`;
  const detalle = `${filas.length.toLocaleString("es-AR")} ${filas.length === 1 ? "registro" : "registros"}  ·  ${fecha}`;
  const anchos = anchosDe(columnas, filas);

  const doc = new JsPDF({ orientation: "landscape", compress: true });

  autoTable(doc, {
    head: [columnas.map((c) => c.header)],
    body: filas.map((f) => columnas.map((c) => textoDeCelda(c, f))),
    startY: margenTabla.top,
    margin: margenTabla,
    tableWidth: TW,
    willDrawPage: () => pintarFranja(doc, logo, alcance, encabezadoDe(reporte), detalle),
    didDrawPage: (data: { cursor?: { y: number } | null }) =>
      redondearTabla(doc, margenTabla.top, data.cursor?.y ?? margenTabla.top),
    // Los números van a la derecha, para que las cifras se lean en columna.
    columnStyles: Object.fromEntries(
      columnas.map((c, i) => [i, { cellWidth: anchos[i], halign: c.tipo ? "right" : "left" }]),
    ),
    didParseCell: (celda: { section: string; column: { index: number }; cell: { styles: { halign: string } } }) => {
      // `columnStyles` sólo alinea el cuerpo: el encabezado se alinea acá.
      if (celda.section === "head" && columnas[celda.column.index]?.tipo) celda.cell.styles.halign = "right";
    },
    ...tableStyles(columnas.length),
  });

  // La portada va adelante; el listado empieza en la hoja 2.
  doc.insertPage(1);
  doc.setPage(1);
  pintarPortada(doc, {
    titulo, periodo, obraSocial, fecha,
    registros: filas.length,
    facturado: reporte.sinTotal ? null : totalFacturado(columnas, filas),
  });
  pintarPies(doc, 2);

  return doc.output("blob") as Blob;
}
