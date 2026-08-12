import type { ExportField, ExportRow, ObraSocial } from "./types";
import {
  fmtDate, safeStr, normalize, buildOsCode,
  pickNombre, pickEspecialidadesList,
} from "./helpers";
import {
  CMC_NAME, CMC_PHONE, CMC_EMAIL, CMC_LOGO_SRC,
  fetchAsDataUrl, getImageFormat,
} from "./institution";

async function loadPdfLibs(): Promise<{ JsPDF: any; autoTable: any }> {
  const [jspdfMod, autotableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const JsPDF = jspdfMod?.jsPDF ?? jspdfMod?.default ?? jspdfMod;
  const autoTable = autotableMod?.default ?? autotableMod;
  return { JsPDF, autoTable };
}

const BG:  [number, number, number] = [11, 31, 58];
const ACC: [number, number, number] = [41, 98, 170];
const ALT: [number, number, number] = [246, 249, 253];
const TW = 269;
const HEADER_H = 34; 

/** Ancho mínimo legible: por debajo, el encabezado se parte en tres renglones. */
const MIN_COL_MM = 11;

/**
 * Reparte los 269 mm útiles entre las columnas elegidas, en proporción a su
 * peso. Antes esto era una tabla con las 8 combinaciones posibles de tres
 * opciones; con un catálogo abierto esa tabla tendría que listar 2^N casos.
 * El reparto proporcional cubre cualquier selección y siempre suma el ancho
 * exacto, que es lo que autoTable necesita para no desbordar la hoja.
 */
export function anchosDe(cols: ExportField[]): number[] {
  if (cols.length === 0) return [];

  const pesoTotal = cols.reduce((acc, c) => acc + c.weight, 0) || 1;
  let anchos = cols.map((c) => (c.weight / pesoTotal) * TW);

  // Con muchas columnas las angostas quedan ilegibles: se les garantiza un piso
  // y el faltante se descuenta de las anchas, que son las que pueden ceder.
  //
  // El piso sólo se aplica si entra: pasadas las ~24 columnas, `n * MIN_COL_MM`
  // ya supera el ancho de la hoja y garantizarlo dejaba anchos negativos. En ese
  // caso el reparto proporcional puro es lo único coherente — el PDF queda
  // apretado igual, y para eso el selector recomienda Excel.
  const pisoEntra = cols.length * MIN_COL_MM < TW;
  const bajoMinimo = pisoEntra
    ? anchos.reduce((acc, w) => acc + Math.max(0, MIN_COL_MM - w), 0)
    : 0;
  if (bajoMinimo > 0) {
    // `holgura > bajoMinimo` está garantizado cuando el piso entra:
    // holgura − faltante = Σ(w − MIN) = TW − n·MIN > 0.
    const holgura = anchos.reduce((acc, w) => acc + Math.max(0, w - MIN_COL_MM), 0);
    const factor = bajoMinimo / holgura;
    anchos = anchos.map((w) =>
      w < MIN_COL_MM ? MIN_COL_MM : w - (w - MIN_COL_MM) * factor
    );
  }

  // El redondeo de arriba puede dejar unas décimas de más o de menos; el sobrante
  // va a la columna más ancha, donde no se nota.
  const suma = anchos.reduce((a, b) => a + b, 0);
  const resto = TW - suma;
  if (Math.abs(resto) > 0.01) {
    let iMax = 0;
    anchos.forEach((w, i) => { if (w > anchos[iMax]) iMax = i; });
    anchos[iMax] += resto;
  }
  return anchos;
}

function pickCell(row: ExportRow, campo: ExportField): string {
  return safeStr(campo.get(row)).trim() || "—";
}

/** Con muchas columnas hay que achicar la letra o el texto se parte demasiado. */
function tableStyles(cols: ExportField[]) {
  const n = cols.length;
  const fontSize = n >= 12 ? 6 : n >= 10 ? 6.5 : n >= 8 ? 7 : 7.5;
  return {
    styles: {
      fontSize,
      cellPadding: { top: 3, bottom: 3, left: 2.5, right: 2.5 },
      valign: "middle" as const,
      overflow: "linebreak" as const,
      lineColor: [220, 226, 234] as [number,number,number],
      lineWidth: 0.25,
    },
    headStyles: {
      fillColor: BG,
      textColor: [255,255,255] as [number,number,number],
      fontStyle: "bold" as const,
      fontSize,
      cellPadding: { top: 4, bottom: 4, left: 2.5, right: 2.5 },
    },
    alternateRowStyles: { fillColor: ALT },
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

// ── Shared header drawing ────────────────────────────────────────────────────

function drawHeaderBase(
  doc: any,
  logo: string | null,
  leftLine1: string,
  leftLine2: string,
  rightLine1: string,
  rightLine2: string,
) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BG);
  doc.rect(0, 0, w, HEADER_H, "F");
  doc.setFillColor(...ACC);
  doc.rect(0, HEADER_H, w, 1.5, "F");

  if (logo) {
    try {
      const logoH = 22;
      const logoW = 22;
      const logoY = (HEADER_H - logoH) / 2;
      doc.addImage(logo, getImageFormat(logo), 13, logoY, logoW, logoH);
    } catch { /* skip */ }
  }
  const textX = logo ? 38 : 14;

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);  doc.setFont(undefined, "bold");
  doc.text(leftLine1, textX, HEADER_H * 0.38);
  doc.setFontSize(7);  doc.setFont(undefined, "normal");
  doc.text(leftLine2, textX, HEADER_H * 0.65);

  doc.setFontSize(10.5); doc.setFont(undefined, "bold");
  doc.text(rightLine1, w - 13, HEADER_H * 0.38, { align: "right" });
  doc.setFontSize(7.5);  doc.setFont(undefined, "normal");
  doc.text(rightLine2, w - 13, HEADER_H * 0.66, { align: "right" });

  doc.setTextColor(0, 0, 0);
}

function drawHeader(doc: any, logo: string | null, title: string, subtitle: string) {
  drawHeaderBase(doc, logo, CMC_NAME, `${CMC_PHONE}  ·  ${CMC_EMAIL}`, title, subtitle);
}

function drawTocHeader(
  doc: any, logo: string | null,
  osName: string, code: string, date: string, count: number, pageNum: number, totalPages: number,
) {
  const pageLabel = totalPages > 1 ? ` — pág. ${pageNum}/${totalPages}` : "";
  drawHeaderBase(
    doc, logo,
    CMC_NAME, `${CMC_PHONE}  ·  ${CMC_EMAIL}`,
    "Índice de Especialidades",
    `${osName} (${code})  ·  ${date}  ·  ${count} especialidades${pageLabel}`,
  );
}

// ── TOC text helpers ─────────────────────────────────────────────────────────

/** Truncate text so it fits within maxW mm at the current font size. */
function fitText(doc: any, text: string, maxW: number): string {
  if (doc.getTextWidth(text) <= maxW) return text;
  let t = text;
  while (t.length > 1 && doc.getTextWidth(t + "…") > maxW) t = t.slice(0, -1);
  return t + "…";
}

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
  const date = fmtDate(new Date());

  const doc = new JsPDF({ orientation: "landscape", compress: true });
  const title = "Prestadores por Obra Social";
  const subtitle = `${selectedOS.NOMBRE} (${code})  ·  ${date}  ·  ${rows.length} prestadores`;

  autoTable(doc, {
    head: [cols.map(c => c.short)],
    body: rows.map(p => cols.map(c => pickCell(p, c))),
    startY: HEADER_H + 4,
    margin: { left: 14, right: 14, top: HEADER_H + 2 },
    tableWidth: TW,
    didDrawPage: () => drawHeader(doc, logo, title, subtitle),
    columnStyles: columnStylesDe(cols),
    ...tableStyles(cols),
  });

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

/** Render one TOC page worth of entries. Returns whether any link/outline was added. */
function renderTocEntries(
  doc: any,
  entries: { label: string; tocPage: number; globalIdx: number }[],
  startY: number,
  lineH: number,
  pw: number,
  maxPerCol: number,
) {
  const col1X    = 14;
  const col1End  = pw / 2 - 8;
  const col2X    = pw / 2 + 8;
  const col2End  = pw - 14;
  const pageNumW = 10; // mm reserved for page number on the right

  entries.forEach((entry, localIdx) => {
    const inCol2  = localIdx >= maxPerCol;
    const row     = inCol2 ? localIdx - maxPerCol : localIdx;
    const x       = inCol2 ? col2X : col1X;
    const colEnd  = inCol2 ? col2End : col1End;
    const y       = startY + row * lineH;

    const prefix   = `${String(entry.globalIdx + 1).padStart(2, " ")}.  `;
    const maxLabelW = colEnd - x - pageNumW - doc.getTextWidth(prefix);

    doc.setFontSize(8); doc.setFont(undefined, "normal");
    const label = fitText(doc, entry.label, maxLabelW);

    doc.setTextColor(30, 30, 30);
    doc.text(prefix + label, x, y);

    doc.setTextColor(100, 120, 150);
    doc.text(String(entry.tocPage), colEnd, y, { align: "right" });

    doc.setTextColor(0, 0, 0);
    doc.link(x, y - lineH * 0.7, colEnd - x, lineH, { pageNumber: entry.tocPage });
    try { (doc as any).outline?.add(null, entry.label, { pageNumber: entry.tocPage }); } catch { /* skip */ }
  });
}

export async function buildPdfByEspecialidad(
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

  const { items, labels } = buildGroups(rows);
  const code = buildOsCode(selectedOS);
  const date = fmtDate(new Date());
  const colStyles = columnStylesDe(cols);

  const keys = Array.from(items.keys()).sort((a, b) =>
    safeStr(labels.get(a)).localeCompare(safeStr(labels.get(b)), "es")
  );
  for (const k of keys) {
    items.get(k)!.sort((a, b) => safeStr(pickNombre(a)).localeCompare(safeStr(pickNombre(b)), "es"));
  }

  const doc = new JsPDF({ orientation: "landscape", compress: true });
  const sections: { label: string; page: number }[] = [];
  const mainTitle = "Prestadores por Obra Social";

  // ── Render content sections ────────────────────────────────────────────────
  keys.forEach((k, idx) => {
    if (idx > 0) doc.addPage();
    const startPage: number = (doc as any).internal.getNumberOfPages();
    const arr = items.get(k)!;
    const espLabel = safeStr(labels.get(k));
    sections.push({ label: espLabel, page: startPage });
    const sub = `${selectedOS.NOMBRE} (${code})  ·  ${date}  ·  ${arr.length} ${arr.length === 1 ? "prestador" : "prestadores"}`;

    autoTable(doc, {
      head: [cols.map(c => c.short)],
      body: arr.map(p => cols.map(c => pickCell(p, c))),
      startY: HEADER_H + 10,
      margin: { left: 14, right: 14, top: HEADER_H + 8 },
      tableWidth: TW,
      didDrawPage: () => {
        drawHeader(doc, logo, mainTitle, sub);
        doc.setFontSize(8.5); doc.setTextColor(...ACC); doc.setFont(undefined, "bold");
        doc.text(`▸  ${espLabel}`, 14, HEADER_H + 6);
        doc.setTextColor(0, 0, 0); doc.setFont(undefined, "normal");
      },
      columnStyles: colStyles,
      ...tableStyles(cols),
    });
  });

  // ── Calculate TOC pagination ───────────────────────────────────────────────
  const pw     = doc.internal.pageSize.getWidth();
  const ph     = doc.internal.pageSize.getHeight();
  const lineH  = 9;                                       // mm per entry row
  const startY = HEADER_H + 12;                          // top of entry list
  const bottomMargin = 12;
  const maxPerCol  = Math.max(1, Math.floor((ph - startY - bottomMargin) / lineH));
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
    drawTocHeader(doc, logo, selectedOS.NOMBRE, code, date, keys.length, tocPageIdx + 1, numTocPages);

    const sliceStart = tocPageIdx * maxPerPage;
    const sliceEnd   = Math.min(sliceStart + maxPerPage, sections.length);
    const pageEntries = sections.slice(sliceStart, sliceEnd).map((s, i) => ({
      label:     s.label,
      tocPage:   s.page + numTocPages,  // content pages shifted by numTocPages
      globalIdx: sliceStart + i,
    }));

    renderTocEntries(doc, pageEntries, startY, lineH, pw, maxPerCol);
  }

  return doc.output("blob") as Blob;
}
