import { fmtFechaVisible } from "@/app/shared/lib/fechas";
import { pagina } from "@/app/shared/lib/utiles";
import { CMC_LOGO_SRC, CMC_NAME, fetchAsDataUrl } from "./institucion";
import {
  AMARILLO, AZUL, CREMA, HEADER_H, MARGEN, TW,
  fitText, loadPdfLibs, margenTabla, pintarFranja, pintarPies, redondearTabla, rotulo, tableStyles,
} from "./pdfColegio";

/** Sello «Padrón vigente»: un recuadro doble apenas girado, dibujado con líneas. */
function sello(doc: any, cx: number, cy: number) {
  const ang = (5 * Math.PI) / 180;
  const girar = (dx: number, dy: number): [number, number] => [
    cx + dx * Math.cos(ang) + dy * Math.sin(ang),
    cy - dx * Math.sin(ang) + dy * Math.cos(ang),
  ];
  const marco = (medioAncho: number, medioAlto: number, grosor: number) => {
    const p = [
      girar(-medioAncho, -medioAlto), girar(medioAncho, -medioAlto),
      girar(medioAncho, medioAlto), girar(-medioAncho, medioAlto),
    ];
    doc.setLineWidth(grosor);
    p.forEach((a, i) => { const b = p[(i + 1) % 4]; doc.line(a[0], a[1], b[0], b[1]); });
  };
  doc.setDrawColor(...AMARILLO);
  marco(24, 7, 0.45);
  marco(25.2, 8.2, 0.2);

  doc.setTextColor(...AMARILLO);
  doc.setFont("helvetica", "bold"); doc.setFontSize(9);
  const [tx, ty] = girar(0, -0.6);
  doc.text("PADRÓN VIGENTE", tx, ty, { align: "center", angle: 5, charSpace: 0.5 });
  doc.setFont("helvetica", "normal"); doc.setFontSize(6);
  const [sx, sy] = girar(0, 3.6);
  doc.text("DOCUMENTO OFICIAL", sx, sy, { align: "center", angle: 5, charSpace: 0.3 });
}

type Portada = {
  osName: string;
  total: number;
  fecha: string;
};

/** Fondo y marco de la portada: azul a página llena, esquinas, título y sello. */
export function pintarPortada(doc: any, { osName, total, fecha }: Portada) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  doc.setFillColor(...AZUL);
  doc.rect(0, 0, w, h, "F");

  rotulo(doc, CMC_NAME, MARGEN, 14, "left");
  rotulo(doc, fitText(doc, osName.toUpperCase(), w / 2), w - MARGEN, 14, "right");

  doc.setTextColor(...CREMA);
  doc.setFont("times", "normal"); doc.setFontSize(58);
  doc.text("Padrón de", MARGEN, h / 2 - 2);
  doc.text("prestadores", MARGEN, h / 2 + 20);

  sello(doc, MARGEN + 26, h - 40);

  rotulo(doc, "Prestadores", MARGEN, h - 17, "left", true);
  rotulo(doc, String(total), MARGEN, h - 12.5, "left");
  rotulo(doc, "Fecha", w - MARGEN, h - 17, "right", true);
  rotulo(doc, fecha.replace(/\//g, "\\"), w - MARGEN, h - 12.5, "right");
}

// El índice ocupa la mitad derecha de la portada, en dos columnas de renglones separados por un filete.
const INDICE = { x: 124, arriba: 34, abajo: 30, renglon: 8.2, separacion: 10 };

/** Dibuja los renglones de una hoja de índice, con su enlace a la página. */
function renderTocEntries(
  doc: any,
  entries: { label: string; tocPage: number }[],
  maxPerCol: number,
) {
  const w = doc.internal.pageSize.getWidth();
  // Si entran todas en una columna, esa columna ocupa todo el ancho.
  const unaColumna = entries.length <= maxPerCol;
  const anchoCol = unaColumna ? w - MARGEN - INDICE.x : (w - MARGEN - INDICE.x - INDICE.separacion) / 2;

  doc.setDrawColor(...CREMA); doc.setLineWidth(0.15);

  entries.forEach((entry, localIdx) => {
    const col = localIdx >= maxPerCol ? 1 : 0;
    const row = col ? localIdx - maxPerCol : localIdx;
    const x = INDICE.x + col * (anchoCol + INDICE.separacion);
    const fin = x + anchoCol;
    const y = INDICE.arriba + row * INDICE.renglon;

    // El filete de arriba del primer renglón de cada columna.
    if (row === 0) doc.line(x, y - 5.2, fin, y - 5.2);

    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...CREMA);
    doc.text(fitText(doc, entry.label.toUpperCase(), anchoCol - 14), x, y, { charSpace: 0.2 });
    doc.text(pagina(entry.tocPage), fin, y, { align: "right" });
    doc.line(x, y + 3, fin, y + 3);

    doc.link(x, y - 5, anchoCol, INDICE.renglon, { pageNumber: entry.tocPage });
    try { (doc as any).outline?.add(null, entry.label, { pageNumber: entry.tocPage }); } catch { /* skip */ }
  });
}

type PdfPorGrupos = {
  /** Lo que va arriba a la derecha de cada hoja (la obra social, por ejemplo). */
  encabezado: string;
  /** Prestadores distintos, para la portada. */
  total: number;
  head: string[];
  /** Sin esto autoTable reparte el ancho solo. */
  columnStyles?: Record<number, object>;
  /** Ya ordenados: cada uno es una sección con su entrada en el índice. */
  grupos: { titulo: string; filas: string[][] }[];
  signal?: AbortSignal;
};

/** Portada con índice enlazado y una sección por grupo; lo comparten Padrones y Socios. */
export async function pdfPorGrupos({ encabezado, total, head, columnStyles, grupos, signal }: PdfPorGrupos): Promise<Blob> {
  const [{ JsPDF, autoTable }, logo] = await Promise.all([
    loadPdfLibs(),
    fetchAsDataUrl(CMC_LOGO_SRC),
  ]);
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const date = fmtFechaVisible(new Date());
  const osName = encabezado;

  const doc = new JsPDF({ orientation: "landscape", compress: true });
  const sections: { label: string; page: number }[] = [];

  // ── Render content sections ────────────────────────────────────────────────
  grupos.forEach((grupo, idx) => {
    if (idx > 0) doc.addPage();
    const startPage: number = (doc as any).internal.getNumberOfPages();
    const espLabel = grupo.titulo;
    sections.push({ label: espLabel, page: startPage });
    const n = grupo.filas.length;
    const detalle = `${n} ${n === 1 ? "prestador" : "prestadores"}  ·  ${date}`;

    autoTable(doc, {
      head: [head],
      body: grupo.filas,
      startY: HEADER_H + 5,
      margin: margenTabla,
      tableWidth: TW,
      willDrawPage: () => pintarFranja(doc, logo, osName, espLabel, detalle),
      didDrawPage: (data: { cursor?: { y: number } | null }) =>
        redondearTabla(doc, margenTabla.top, data.cursor?.y ?? margenTabla.top),
      ...(columnStyles ? { columnStyles } : {}),
      ...tableStyles(head.length),
    });
  });

  // ── Calculate TOC pagination ───────────────────────────────────────────────
  const ph = doc.internal.pageSize.getHeight();
  const maxPerCol = Math.max(1, Math.floor((ph - INDICE.arriba - INDICE.abajo) / INDICE.renglon));
  const maxPerPage = maxPerCol * 2;
  const numTocPages = Math.max(1, Math.ceil(sections.length / maxPerPage));

  // Insert blank pages at the front (inserted in reverse so page order is correct)
  for (let i = 0; i < numTocPages; i++) {
    (doc as any).insertPage(1);
  }
  // After insertions: TOC pages are 1..numTocPages, content pages shifted by numTocPages

  // ── Render each TOC page ───────────────────────────────────────────────────
  for (let tocPageIdx = 0; tocPageIdx < numTocPages; tocPageIdx++) {
    doc.setPage(tocPageIdx + 1);
    pintarPortada(doc, { osName, total, fecha: date });

    const sliceStart = tocPageIdx * maxPerPage;
    const sliceEnd   = Math.min(sliceStart + maxPerPage, sections.length);
    const pageEntries = sections.slice(sliceStart, sliceEnd).map((s) => ({
      label:   s.label,
      tocPage: s.page + numTocPages,  // content pages shifted by numTocPages
    }));

    renderTocEntries(doc, pageEntries, maxPerCol);
  }

  pintarPies(doc, numTocPages + 1);

  return doc.output("blob") as Blob;
}
