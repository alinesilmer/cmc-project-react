import type { ExportOptions, ObraSocial, Prestador } from "./types";
import {
  fmtDate, safeStr, normalize, buildOsCode,
  pickNroPrestador, pickNombre, pickMatriculaProv, pickTelefonoConsulta,
  pickEspecialidad, pickDomicilioConsulta, pickMailParticular,
  pickCuit, pickCodigoPostal, pickEspecialidadesList,
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

// ── Column width lookup (all combinations sum exactly to 269mm) ──────────────
type WMap = Record<string, number>;
function getWidths(o: ExportOptions): WMap {
  const { includeEmail: m, includeCuit: c, includeCP: p } = o;
  if (!m && !c && !p) return { nro:14, nom:55, mat:16, tel:20, esp:42, dom:122 };
  if ( m && !c && !p) return { nro:14, nom:50, mat:16, tel:20, esp:40, dom:90,  mail:39 };
  if (!m &&  c && !p) return { nro:14, nom:48, mat:16, tel:20, cuit:26, esp:38, dom:107 };
  if (!m && !c &&  p) return { nro:14, nom:50, mat:16, tel:20, esp:40, dom:110, cp:19 };
  if ( m &&  c && !p) return { nro:12, nom:44, mat:14, tel:18, cuit:24, esp:36, dom:80,  mail:41 };
  if ( m && !c &&  p) return { nro:12, nom:45, mat:14, tel:18, esp:36, dom:90,  mail:37, cp:17 };
  if (!m &&  c &&  p) return { nro:12, nom:44, mat:14, tel:18, cuit:24, esp:36, dom:100, cp:21 };
  /* all */           return { nro:12, nom:43, mat:14, tel:18, cuit:24, esp:34, dom:70,  mail:37, cp:17 };
}

type ColDef = { label: string; key: string; w: number };
function buildCols(o: ExportOptions): ColDef[] {
  const W = getWidths(o);
  const cols: ColDef[] = [
    { label: "N° Socio",   key: "nro",  w: W.nro },
    { label: "Prestador",  key: "nom",  w: W.nom },
    { label: "Mat. Prov",  key: "mat",  w: W.mat },
    { label: "Teléfono",   key: "tel",  w: W.tel },
  ];
  if (o.includeCuit)  cols.push({ label: "CUIT",               key: "cuit", w: W.cuit! });
  cols.push({ label: "Especialidades",      key: "esp",  w: W.esp });
  cols.push({ label: "Dirección consultorio", key: "dom", w: W.dom });
  if (o.includeEmail) cols.push({ label: "Correo electrónico", key: "mail", w: W.mail! });
  if (o.includeCP)    cols.push({ label: "CP",                 key: "cp",   w: W.cp! });
  return cols;
}

function pickCell(p: Prestador, key: string): string {
  switch (key) {
    case "nro":  return safeStr(pickNroPrestador(p)) || "—";
    case "nom":  return safeStr(pickNombre(p)) || "—";
    case "mat":  return safeStr(pickMatriculaProv(p)) || "—";
    case "tel":  return safeStr(pickTelefonoConsulta(p)) || "—";
    case "cuit": return safeStr(pickCuit(p)) || "—";
    case "esp":  return safeStr(pickEspecialidad(p)) || "—";
    case "dom":  return safeStr(pickDomicilioConsulta(p)) || "—";
    case "mail": return safeStr(pickMailParticular(p)) || "—";
    case "cp":   return safeStr(pickCodigoPostal(p)) || "—";
    default:     return "—";
  }
}

function tableStyles(o: ExportOptions) {
  const many = o.includeEmail && o.includeCuit && o.includeCP;
  return {
    styles: {
      fontSize: many ? 7 : 7.5,
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
      fontSize: many ? 7 : 7.5,
      cellPadding: { top: 4, bottom: 4, left: 2.5, right: 2.5 },
    },
    alternateRowStyles: { fillColor: ALT },
  };
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
  rows: Prestador[],
  selectedOS: ObraSocial,
  opts: ExportOptions,
  signal?: AbortSignal
): Promise<Blob> {
  const [{ JsPDF, autoTable }, logo] = await Promise.all([
    loadPdfLibs(),
    fetchAsDataUrl(CMC_LOGO_SRC),
  ]);
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const code = buildOsCode(selectedOS);
  const date = fmtDate(new Date());
  const cols = buildCols(opts);
  const colStyles: Record<number, { cellWidth: number }> = {};
  cols.forEach((c, i) => { colStyles[i] = { cellWidth: c.w }; });

  const doc = new JsPDF({ orientation: "landscape", compress: true });
  const title = "Prestadores por Obra Social";
  const subtitle = `${selectedOS.NOMBRE} (${code})  ·  ${date}  ·  ${rows.length} prestadores`;

  autoTable(doc, {
    head: [cols.map(c => c.label)],
    body: rows.map(p => cols.map(c => pickCell(p, c.key))),
    startY: HEADER_H + 4,
    margin: { left: 14, right: 14, top: HEADER_H + 2 },
    tableWidth: TW,
    didDrawPage: () => drawHeader(doc, logo, title, subtitle),
    columnStyles: colStyles,
    ...tableStyles(opts),
  });

  return doc.output("blob") as Blob;
}

// ── Grouped PDF with multi-page TOC ──────────────────────────────────────────

type GroupResult = { items: Map<string, Prestador[]>; labels: Map<string, string> };
function buildGroups(rows: Prestador[]): GroupResult {
  const items = new Map<string, Prestador[]>();
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
  rows: Prestador[],
  selectedOS: ObraSocial,
  opts: ExportOptions,
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
  const cols = buildCols(opts);
  const colStyles: Record<number, { cellWidth: number }> = {};
  cols.forEach((c, i) => { colStyles[i] = { cellWidth: c.w }; });

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
      head: [cols.map(c => c.label)],
      body: arr.map(p => cols.map(c => pickCell(p, c.key))),
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
      ...tableStyles(opts),
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
