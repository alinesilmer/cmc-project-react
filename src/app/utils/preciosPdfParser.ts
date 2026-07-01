// Parser: lee un PDF de valores del Colegio (estilo Anexo IV / OSPIDA) y extrae
// las filas que tienen CÓDIGO → precio, devolviendo { codigo, precio_1, precio_2 }.
//
// Reglas (acordadas):
//  - código = primer token de 6 dígitos de la fila.
//  - precios = tokens con formato monetario argentino ($ 1.234,56 · 450678,0861 · 0,00).
//  - Si la fila tiene 3 precios, el último (el de más a la derecha) es el TOTAL
//    (precio_1 + precio_2) y se descarta. Se conservan los otros dos.
//  - Se ordenan de mayor a menor: precio_1 = el más alto, precio_2 = el más bajo.
//  - Filas de un solo precio → precio_2 queda vacío.
//  - Se descartan: filas sin código, encabezados de sección, galenos/“VALORES
//    GENERALES”, niveles (NIVEL 1..10, se cargan a mano), y filas sin precio
//    numérico (POR PRESUPUESTO / NOMENCLADOR SACPER).

import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorker;

export type PrecioRow = {
  codigo: string;
  precio_1: string;
  precio_2: string;
};

type Token = { str: string; x: number; y: number };

// código: exactamente 6 dígitos al comienzo del token (acepta token "código + texto").
const CODE_RE = /^(\d{6})(?!\d)/;

// Un token es "precio" si es: miles con punto (2.193.590,36), coma decimal sin
// miles (450678,0861 · 0,00), o el caso anómalo con punto decimal ($ 0.00).
const PRICE_TOKEN_RE =
  /^\$?\s*(?:\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+,\d+|\d+\.\d{1,2})$/;

function normalizePrice(raw: string): string {
  let s = raw.replace(/\$/g, "").replace(/\s/g, "").trim();
  if (s.includes(",")) {
    // coma = decimal, punto = miles
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (!/^\d+\.\d{1,2}$/.test(s)) {
    // sin coma y no es "0.00": los puntos son miles
    s = s.replace(/\./g, "");
  }
  return s;
}

// Agrupa tokens en líneas por su coordenada Y (de arriba hacia abajo).
function groupIntoLines(tokens: Token[], tol = 3.5): Token[][] {
  const sorted = [...tokens].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: Token[][] = [];
  let current: Token[] = [];
  let lastY: number | null = null;

  for (const t of sorted) {
    if (lastY === null || Math.abs(t.y - lastY) <= tol) {
      current.push(t);
    } else {
      lines.push(current);
      current = [t];
    }
    lastY = t.y;
  }
  if (current.length) lines.push(current);

  // cada línea, de izquierda a derecha
  return lines.map((l) => [...l].sort((a, b) => a.x - b.x));
}

function parseLine(line: Token[]): PrecioRow | null {
  // código: primer token (de izq. a der.) que arranca con 6 dígitos
  let codigo = "";
  for (const t of line) {
    const m = t.str.trim().match(CODE_RE);
    if (m) {
      codigo = m[1];
      break;
    }
  }
  if (!codigo) return null;

  const text = line.map((t) => t.str).join(" ");
  // niveles / galenos: se cargan manualmente
  if (/\bNIVEL\s+\d/i.test(text)) return null;

  // precios con posición (para detectar el TOTAL = el de más a la derecha)
  const prices = line
    .filter((t) => PRICE_TOKEN_RE.test(t.str.trim()))
    .map((t) => {
      const str = normalizePrice(t.str);
      return { x: t.x, str, val: parseFloat(str) };
    })
    .filter((p) => Number.isFinite(p.val))
    .sort((a, b) => a.x - b.x); // izquierda → derecha

  if (prices.length === 0) return null; // POR PRESUPUESTO / NOMENCLADOR SACPER / encabezado

  // 3+ precios → el de más a la derecha es el total: se descarta
  const candidates = prices.length >= 3 ? prices.slice(0, prices.length - 1) : prices;

  // mayor primero, menor al final; máximo dos
  const ordered = [...candidates].sort((a, b) => b.val - a.val).slice(0, 2);

  return {
    codigo,
    precio_1: ordered[0]?.str ?? "",
    precio_2: ordered[1]?.str ?? "",
  };
}

export async function parsePreciosPdf(file: File): Promise<PrecioRow[]> {
  const buffer = await file.arrayBuffer();
  const pdf = await (pdfjsLib as any).getDocument({ data: buffer }).promise;

  const rows: PrecioRow[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const tokens: Token[] = content.items
      .map((it: any) => ({
        str: String(it.str ?? ""),
        x: it.transform?.[4] ?? 0,
        y: it.transform?.[5] ?? 0,
      }))
      .filter((t: Token) => t.str.trim() !== "");

    for (const line of groupIntoLines(tokens)) {
      const row = parseLine(line);
      if (row) rows.push(row);
    }
  }
  return rows;
}

export function rowsToCsv(
  rows: PrecioRow[],
  extra?: { vigencia?: string; nroObraSocial?: string },
): string {
  const vig = extra?.vigencia ?? "";
  const nro = extra?.nroObraSocial ?? "";
  const header = "codigo,precio_1,precio_2,vigencia,nro_obrasocial";
  const body = rows
    .map((r) => `${r.codigo},${r.precio_1},${r.precio_2},${vig},${nro}`)
    .join("\r\n");
  return "﻿" + header + "\r\n" + body + (body ? "\r\n" : "");
}
