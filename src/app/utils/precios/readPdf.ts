// Lector de PDF: extrae filas código → precio(s) del texto del PDF (pdfjs).
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

import type { PrecioRow } from "./types";
import { findCodigo } from "./codigo";
import { normalizePrice, isPorPresupuesto } from "./precio";
import { dedupeByCodigo } from "./dedupe";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorker;

type Token = { str: string; x: number; y: number };

// Un token es "precio": miles con punto (2.193.590,36), coma decimal (450678,0861 · 0,00)
// o el caso con punto decimal ($ 0.00).
const PRICE_TOKEN_RE =
  /^\$?\s*(?:\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+,\d+|\d+\.\d{1,2})$/;

/** Agrupa tokens en líneas por su coordenada Y (de arriba hacia abajo). */
function groupIntoLines(tokens: Token[], tol = 3.5): Token[][] {
  const sorted = [...tokens].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: Token[][] = [];
  let current: Token[] = [];
  let lastY: number | null = null;

  for (const t of sorted) {
    if (lastY === null || Math.abs(t.y - lastY) <= tol) current.push(t);
    else { lines.push(current); current = [t]; }
    lastY = t.y;
  }
  if (current.length) lines.push(current);
  return lines.map((l) => [...l].sort((a, b) => a.x - b.x));
}

function parseLine(line: Token[]): PrecioRow | null {
  const codigo = findCodigo(line.map((t) => t.str));
  if (!codigo) return null;

  const text = line.map((t) => t.str).join(" ");
  if (/\bNIVEL\s+\d/i.test(text)) return null; // niveles → se cargan a mano

  // precios con posición (para detectar el TOTAL = el de más a la derecha)
  const prices = line
    .filter((t) => PRICE_TOKEN_RE.test(t.str.trim()))
    .map((t) => { const str = normalizePrice(t.str); return { x: t.x, str, val: parseFloat(str) }; })
    .filter((p) => Number.isFinite(p.val))
    .sort((a, b) => a.x - b.x);

  if (prices.length === 0) {
    if (isPorPresupuesto(text)) return { codigo, precio_1: "", precio_2: "", por_presupuesto: true };
    return null;
  }

  // 3+ precios → el de más a la derecha es el total: se descarta. Mayor primero.
  const candidates = prices.length >= 3 ? prices.slice(0, prices.length - 1) : prices;
  const ordered = [...candidates].sort((a, b) => b.val - a.val).slice(0, 2);

  return {
    codigo,
    precio_1: ordered[0]?.str ?? "",
    precio_2: ordered[1]?.str ?? "",
    por_presupuesto: false,
  };
}

export async function readPdf(file: File): Promise<PrecioRow[]> {
  const buffer = await file.arrayBuffer();
  const pdf = await (pdfjsLib as any).getDocument({ data: buffer }).promise;

  const rows: PrecioRow[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const tokens: Token[] = content.items
      .map((it: any) => ({ str: String(it.str ?? ""), x: it.transform?.[4] ?? 0, y: it.transform?.[5] ?? 0 }))
      .filter((t: Token) => t.str.trim() !== "");
    for (const line of groupIntoLines(tokens)) {
      const row = parseLine(line);
      if (row) rows.push(row);
    }
  }
  return dedupeByCodigo(rows);
}
