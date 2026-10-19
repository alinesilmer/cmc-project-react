import type { ExportField, ExportRow, ObraSocial } from "./types";
import {
  fmtFechaVisible, safeStr, normalize, buildOsCode,
  pickNombre, pickEspecialidadesList,
} from "./helpers";
import {
  CMC_NAME, CMC_PHONE, CMC_EMAIL, CMC_LOGO_SRC,
  fetchAsDataUrl, getImageFormat,
} from "./institution";
import { pickCellValue as pickCell } from "@/app/pages/AfiliadosPorObraSocialPage/utiles";
import { pagina } from "@/app/shared/lib/utiles";

export async function loadPdfLibs(): Promise<{ JsPDF: any; autoTable: any }> {
  const [jspdfMod, autotableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const JsPDF = jspdfMod?.jsPDF ?? jspdfMod?.default ?? jspdfMod;
  const autoTable = autotableMod?.default ?? autotableMod;
  return { JsPDF, autoTable };
}

export type Rgb = [number, number, number];

// Los colores del Colegio, los mismos de la portada.
export const AZUL: Rgb = [23, 63, 112];
export const CREMA: Rgb = [245, 239, 224];
const AMARILLO: Rgb = [247, 233, 170];
/** Cabecera de la tabla: un azul más profundo que el fondo. */
const AZUL_OSCURO: Rgb = [12, 42, 82];
// Las hojas con tabla son blancas: el azul a página llena queda sólo para la portada y el índice, que son una o dos hojas.
const BLANCO: Rgb = [255, 255, 255];
const BANDA: Rgb = [241, 245, 249];
const TINTA: Rgb = [15, 23, 42];
const GRIS: Rgb = [100, 116, 139];
const FILETE: Rgb = [203, 213, 225];

/** Radio de las esquinas de la tabla, en mm. */
const RADIO = 3;

export const TW = 269;
export const MARGEN = 14;
const HEADER_H = 30;

/** Ancho mínimo legible: por debajo, el encabezado se parte en tres renglones. */
const MIN_COL_MM = 11;

/** Reparte los 269 mm útiles entre las columnas elegidas, en proporción a su peso. */
function anchosDe(cols: ExportField[]): number[] {
  if (cols.length === 0) return [];

  const pesoTotal = cols.reduce((acc, c) => acc + c.weight, 0) || 1;
  let anchos = cols.map((c) => (c.weight / pesoTotal) * TW);

  // Con muchas columnas las angostas quedan ilegibles: se les garantiza un piso y el faltante se descuenta de las anchas.
  const pisoEntra = cols.length * MIN_COL_MM < TW;
  const bajoMinimo = pisoEntra
    ? anchos.reduce((acc, w) => acc + Math.max(0, MIN_COL_MM - w), 0)
    : 0;
  if (bajoMinimo > 0) {
    // `holgura > bajoMinimo` está garantizado cuando el piso entra: holgura − faltante = Σ(w − MIN) = TW − n·MIN > 0.
    const holgura = anchos.reduce((acc, w) => acc + Math.max(0, w - MIN_COL_MM), 0);
    const factor = bajoMinimo / holgura;
    anchos = anchos.map((w) =>
      w < MIN_COL_MM ? MIN_COL_MM : w - (w - MIN_COL_MM) * factor
    );
  }

  // El redondeo de arriba puede dejar unas décimas de más o de menos; el sobrante va a la columna más ancha, donde no se nota.
  const suma = anchos.reduce((a, b) => a + b, 0);
  const resto = TW - suma;
  if (Math.abs(resto) > 0.01) {
    let iMax = 0;
    anchos.forEach((w, i) => { if (w > anchos[iMax]) iMax = i; });
    anchos[iMax] += resto;
  }
  return anchos;
}
/** Con muchas columnas hay que achicar la letra o el texto se parte demasiado. */
export function tableStyles(n: number) {
  const fontSize = n >= 12 ? 6 : n >= 10 ? 6.5 : n >= 8 ? 7 : 7.5;
  return {
    // Sin grilla: filas blancas y gris claro alternadas.
    theme: "plain" as const,
    styles: {
      font: "helvetica",
      fontSize,
      textColor: TINTA,
      fillColor: BLANCO,
      cellPadding: { top: 3, bottom: 3, left: 2.5, right: 2.5 },
      valign: "middle" as const,
      overflow: "linebreak" as const,
    },
    headStyles: {
      fillColor: AZUL_OSCURO,
      textColor: CREMA,
      fontStyle: "bold" as const,
      fontSize,
      cellPadding: { top: 4, bottom: 4, left: 2.5, right: 2.5 },
    },
    alternateRowStyles: { fillColor: BANDA },
  };
}

/** Anchos + alineación por columna, en el formato que espera autoTable. */
function columnStylesDe(cols: ExportField[]) {
  const anchos = anchosDe(cols);
  const estilos: Record<number, { cellWidth: number; halign: "left" | "center" }> = {};
  cols.forEach((c, i) => {
    estilos[i] = { cellWidth: anchos[i], halign: c.align };
  });
  return estilos;
}
/** Rótulo chico en mayúscula; `alto` = renglón de arriba, más tenue. */
export function rotulo(
  doc: any, texto: string, x: number, y: number,
  align: "left" | "right", tenue = false, color: Rgb = CREMA,
) {
  doc.setFont("helvetica", tenue ? "normal" : "bold");
  doc.setFontSize(tenue ? 6.5 : 7.5);
  doc.setTextColor(...color);
  doc.text(texto.toUpperCase(), x, y, { align, charSpace: 0.25 });
}

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
function pintarPortada(doc: any, { osName, total, fecha }: Portada) {
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

/** Encabezado de cada hoja de listado, sobre blanco: los mismos rótulos y el título en Times de la portada, pero en azul. */
export function pintarFranja(doc: any, logo: string | null, osName: string, titulo: string, detalle: string) {
  const w = doc.internal.pageSize.getWidth();

  let x = MARGEN;
  if (logo) {
    try {
      // El logo es de 2:3; se respeta la proporción.
      doc.addImage(logo, getImageFormat(logo), MARGEN, 6, 12, 18);
      x = MARGEN + 17;
    } catch { /* sin logo el encabezado se ve igual de bien */ }
  }

  rotulo(doc, CMC_NAME, x, 11, "left", false, AZUL);
  rotulo(doc, fitText(doc, osName.toUpperCase(), w / 2), w - MARGEN, 11, "right", false, AZUL);

  doc.setTextColor(...AZUL);
  doc.setFont("times", "normal"); doc.setFontSize(22);
  doc.text(fitText(doc, titulo, w - x - 80), x, 24);
  rotulo(doc, detalle, w - MARGEN, 24, "right", true, GRIS);

  // Un filete separa el encabezado de la tabla, como los renglones del índice.
  doc.setDrawColor(...AZUL); doc.setLineWidth(0.25);
  doc.line(MARGEN, HEADER_H, w - MARGEN, HEADER_H);
}

/** Redondea las esquinas de la tabla. autoTable sólo dibuja rectángulos, así que se tapa cada esquina con una cuña blanca. */
export function redondearTabla(doc: any, y0: number, y1: number) {
  const x0 = MARGEN;
  const x1 = MARGEN + TW;
  const r = RADIO;
  // Distancia de los puntos de control de una curva que imita un cuarto de círculo.
  const k = r * 0.5523;

  doc.setFillColor(...BLANCO);
  // [esquina x, esquina y, sentido horizontal, sentido vertical]
  const esquinas: [number, number, number, number][] = [
    [x0, y0, 1, 1], [x1, y0, -1, 1], [x1, y1, -1, -1], [x0, y1, 1, -1],
  ];
  for (const [x, y, sx, sy] of esquinas) {
    // Desde el borde vertical: va a la esquina, corre por el borde horizontal y vuelve por el arco.
    doc.lines(
      [
        [0, -r * sy],
        [r * sx, 0],
        [-k * sx, 0, -r * sx, (r - k) * sy, -r * sx, r * sy],
      ],
      x, y + r * sy, [1, 1], "F", true,
    );
  }

  doc.setDrawColor(...FILETE); doc.setLineWidth(0.2);
  doc.roundedRect(x0, y0, TW, y1 - y0, r, r, "S");
}

/** Pie de las hojas de listado: contacto a la izquierda, "\02 de \14" a la derecha. */
export function pintarPies(doc: any, desde: number) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const total: number = doc.internal.getNumberOfPages();

  for (let n = desde; n <= total; n++) {
    doc.setPage(n);
    doc.setDrawColor(...AZUL); doc.setLineWidth(0.2);
    doc.line(MARGEN, h - 11, w - MARGEN, h - 11);

    doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(...GRIS);
    doc.text(`${CMC_NAME}  ·  ${CMC_PHONE}  ·  ${CMC_EMAIL}`, MARGEN, h - 6.5);

    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...AZUL);
    doc.text(`${pagina(n)}  de  ${pagina(total)}`, w - MARGEN, h - 6.5, { align: "right" });
  }
}

/** Truncate text so it fits within maxW mm at the current font size. */
export function fitText(doc: any, text: string, maxW: number): string {
  if (doc.getTextWidth(text) <= maxW) return text;
  let t = text;
  while (t.length > 1 && doc.getTextWidth(t + "…") > maxW) t = t.slice(0, -1);
  return t + "…";
}

export const margenTabla = { left: MARGEN, right: MARGEN, top: HEADER_H + 5, bottom: 16 };

// ── Simple flat PDF ──────────────────────────────────────────────────────────

export async function buildSimplePdf(
  rows: ExportRow[],
  selectedOS: ObraSocial,
  cols: ExportField[],
  signal?: AbortSignal
): Promise<Blob> {
  const [{ JsPDF, autoTable }, logo] = await Promise.all([
    loadPdfLibs(),
    fetchAsDataUrl(CMC_LOGO_SRC),
  ]);
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const code = buildOsCode(selectedOS);
  const date = fmtFechaVisible(new Date());
  const osName = `${selectedOS.NOMBRE} (${code})`;
  const detalle = `${rows.length} ${rows.length === 1 ? "prestador" : "prestadores"}  ·  ${date}`;

  const doc = new JsPDF({ orientation: "landscape", compress: true });

  autoTable(doc, {
    head: [cols.map(c => c.short)],
    body: rows.map(p => cols.map(c => pickCell(p, c))),
    startY: HEADER_H + 5,
    margin: margenTabla,
    tableWidth: TW,
    willDrawPage: () => pintarFranja(doc, logo, osName, "Padrón de prestadores", detalle),
    didDrawPage: (data: { cursor?: { y: number } | null }) =>
      redondearTabla(doc, margenTabla.top, data.cursor?.y ?? margenTabla.top),
    columnStyles: columnStylesDe(cols),
    ...tableStyles(cols.length),
  });

  // La portada va adelante; el listado empieza en la hoja 2.
  (doc as any).insertPage(1);
  doc.setPage(1);
  pintarPortada(doc, { osName, total: rows.length, fecha: date });
  pintarPies(doc, 2);

  return doc.output("blob") as Blob;
}

// ── Grouped PDF with multi-page TOC ──────────────────────────────────────────

type GroupResult = { items: Map<string, ExportRow[]>; labels: Map<string, string> };
function buildGroups(rows: ExportRow[]): GroupResult {
  const items = new Map<string, ExportRow[]>();
  const labels = new Map<string, string>();
  const sinKey = normalize("Sin especialidad");
  labels.set(sinKey, "Sin especialidad");
  for (const p of rows) {
    const list = pickEspecialidadesList(p);
    if (list.length === 0) { items.set(sinKey, [...(items.get(sinKey) ?? []), p]); continue; }
    for (const esp of list) {
      const label = safeStr(esp).trim(); if (!label) continue;
      const key = normalize(label); if (!key) continue;
      if (!labels.has(key)) labels.set(key, label);
      items.set(key, [...(items.get(key) ?? []), p]);
    }
  }
  return { items, labels };
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

export async function buildPdfByEspecialidad(
  rows: ExportRow[],
  selectedOS: ObraSocial,
  cols: ExportField[],
  signal?: AbortSignal
): Promise<Blob> {
  const { items, labels } = buildGroups(rows);
  const code = buildOsCode(selectedOS);

  const keys = Array.from(items.keys()).sort((a, b) =>
    safeStr(labels.get(a)).localeCompare(safeStr(labels.get(b)), "es")
  );
  for (const k of keys) {
    items.get(k)!.sort((a, b) => safeStr(pickNombre(a)).localeCompare(safeStr(pickNombre(b)), "es"));
  }

  return pdfPorGrupos({
    encabezado: `${selectedOS.NOMBRE} (${code})`,
    total: rows.length,
    head: cols.map(c => c.short),
    columnStyles: columnStylesDe(cols),
    grupos: keys.map((k) => ({
      titulo: safeStr(labels.get(k)),
      filas: items.get(k)!.map(p => cols.map(c => pickCell(p, c))),
    })),
    signal,
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
