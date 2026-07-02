// Procesa una grilla (Excel/CSV) → filas código/precio. Compartido por ambos lectores.
import type { Cell, ColMapping, PrecioRow } from "./types";
import { normalizeCodigoCell } from "./codigo";
import { parsePrecioCell, isPorPresupuesto } from "./precio";
import { dedupeByCodigo } from "./dedupe";

function maxCols(grid: Cell[][]): number {
  return grid.reduce((m, r) => Math.max(m, r.length), 0);
}

// Fila de la tabla de niveles/complejidades: alguna CELDA empieza con "NIVEL n" o
// "COMPLEJIDAD n". Es preciso: no matchea una descripción normal que solo CONTENGA
// "nivel 2" en el medio (ej. "TAC nivel 2 cerebral") — esa fila sí se lee.
function isNivelesRow(r: Cell[]): boolean {
  return r.some((c) => /^\s*(nivel|complejidad)\s+\d+/i.test(String(c ?? "")));
}

/**
 * Auto-detecta las columnas. Si se pasa `codeSet` (catálogo CMC), la columna de código
 * es la que más celdas tiene que EXISTEN en el catálogo → detección a prueba de balas
 * (una columna de precios de 6 dígitos no coincide con el catálogo y no se elige).
 */
export function autoDetectMapping(grid: Cell[][], codeSet?: Set<string>): ColMapping {
  const cols = maxCols(grid);
  const useCatalog = !!codeSet && codeSet.size > 0;
  // La detección de columnas ignora las filas de niveles para que esa tabla no
  // desvíe qué columna es código o precio de los códigos reales.
  const dataRows = grid.filter((r) => !isNivelesRow(r));
  const headerText = (c: number) =>
    grid.slice(0, 5).map((r) => String(r[c] ?? "")).join(" ").toLowerCase();
  const priceScore = (c: number) =>
    dataRows.reduce((s, r) => s + (parsePrecioCell(r[c] ?? null) ? 1 : 0), 0);

  // ── columna de código ──
  let codigoCol = 0;
  let best = -1;
  for (let c = 0; c < cols; c++) {
    let s = 0;
    for (const r of dataRows) {
      const nv = normalizeCodigoCell(r[c] ?? null);
      if (!nv) continue;
      if (useCatalog) { if (codeSet!.has(nv)) s++; }
      else s++;
    }
    if (!useCatalog && /c[oó]d/.test(headerText(c))) s += 100000; // pista por encabezado
    if (s > best) { best = s; codigoCol = c; }
  }

  // ── columnas de precio (pista por encabezado; si no, la última columna numérica) ──
  let precio1: number | null = null;
  let precio2: number | null = null;
  for (let c = 0; c < cols; c++) {
    if (c === codigoCol) continue;
    const h = headerText(c);
    if (precio1 == null && /ciruj|cirj|honor|\bhon\b/.test(h)) precio1 = c;
    if (precio2 == null && /ayud|\bay\b/.test(h)) precio2 = c;
  }
  if (precio1 == null) {
    for (let c = cols - 1; c >= 0; c--) {
      if (c === codigoCol) continue;
      if (priceScore(c) >= 3) { precio1 = c; break; }
    }
  }
  if (precio1 == null) precio1 = codigoCol === 0 ? 1 : 0;

  return { codigo: codigoCol, precio1, precio2 };
}

/**
 * Grilla + mapeo → filas. Salta niveles ("UNIDAD QUIRÚRGICA SEGÚN NIVEL DE COMPLEJIDAD").
 * Si se pasa `codeSet`, solo conserva filas cuyo código existe en el catálogo.
 */
export function sheetToRows(grid: Cell[][], m: ColMapping, codeSet?: Set<string>): PrecioRow[] {
  const useCatalog = !!codeSet && codeSet.size > 0;
  const rows: PrecioRow[] = [];

  for (const r of grid) {
    if (isNivelesRow(r)) continue; // solo la tabla de niveles/complejidades se omite

    const codigo = normalizeCodigoCell(r[m.codigo] ?? null);
    if (!codigo) continue;
    if (useCatalog && !codeSet!.has(codigo)) continue; // no está en el catálogo → se omite

    const p1 = parsePrecioCell(r[m.precio1] ?? null);
    const p2 = m.precio2 != null ? parsePrecioCell(r[m.precio2] ?? null) : null;

    if (p1?.presupuesto || p2?.presupuesto) {
      rows.push({ codigo, precio_1: "", precio_2: "", por_presupuesto: true });
      continue;
    }
    if (!p1 && !p2) {
      // sin precio en las columnas mapeadas: si la fila dice "por presupuesto", se marca
      if (isPorPresupuesto(r.map((c) => String(c ?? "")).join(" "))) {
        rows.push({ codigo, precio_1: "", precio_2: "", por_presupuesto: true });
      }
      continue;
    }

    rows.push({
      codigo,
      precio_1: p1?.value ?? "",
      precio_2: p2?.value ?? "",
      por_presupuesto: false,
    });
  }
  return dedupeByCodigo(rows);
}

// ── Utilidades para el UI de mapeo ──────────────────────────────────────────────

export function colLetter(n: number): string {
  let s = "";
  let x = n + 1;
  while (x > 0) { const m = (x - 1) % 26; s = String.fromCharCode(65 + m) + s; x = Math.floor((x - 1) / 26); }
  return s;
}

function colSample(grid: Cell[][], c: number): string {
  for (const r of grid) {
    const v = r[c];
    if (v != null && String(v).trim() !== "") return String(v).trim().slice(0, 22);
  }
  return "";
}

/** Solo columnas con datos (algunas hojas reportan cientos de columnas vacías). */
export function columnList(grid: Cell[][]): { index: number; label: string }[] {
  const out: { index: number; label: string }[] = [];
  const cols = maxCols(grid);
  for (let c = 0; c < cols; c++) {
    const sample = colSample(grid, c);
    if (sample !== "") out.push({ index: c, label: `${colLetter(c)} · ${sample}` });
  }
  return out;
}
