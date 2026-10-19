import type { ExportField, ExportRow, ObraSocial } from "./types";
import {
  safeStr, normalize, buildOsCode,
  pickNombre, pickEspecialidadesList,
} from "./helpers";
import { fmtFechaVisible } from "@/app/shared/lib/fechas";
import { CMC_LOGO_SRC, fetchAsDataUrl } from "@/app/shared/lib/documentos/institucion";
import {
  HEADER_H, TW,
  loadPdfLibs, margenTabla, pintarFranja, pintarPies, redondearTabla, tableStyles,
} from "@/app/shared/lib/documentos/pdfColegio";
import { pdfPorGrupos, pintarPortada } from "@/app/shared/lib/documentos/pdfPorGrupos";
import { pickCellValue as pickCell } from "@/app/pages/AfiliadosPorObraSocialPage/utiles";

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

/** Anchos + alineación por columna, en el formato que espera autoTable. */
function columnStylesDe(cols: ExportField[]) {
  const anchos = anchosDe(cols);
  const estilos: Record<number, { cellWidth: number; halign: "left" | "center" }> = {};
  cols.forEach((c, i) => {
    estilos[i] = { cellWidth: anchos[i], halign: c.align };
  });
  return estilos;
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
