// Lector de PDF que devuelve una grilla (filas × celdas), no filas ya interpretadas.
//
// El lector de `utils/precios/readPdf.ts` no sirve acá: devuelve `PrecioRow[]`
// (código → precios) y descarta a propósito las filas de niveles
// ("niveles → se cargan a mano"), que es justamente lo que necesitamos leer.
//
// Este agrupa los tokens en líneas por coordenada Y y, dentro de cada línea, los
// separa en celdas cuando hay un salto horizontal grande — lo más parecido a
// "columnas" que se puede sacar de un PDF sin estructura de tabla.

import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

import type { Cell, SheetData } from "../precios/types";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorker;

interface Token {
  str: string;
  x: number;
  y: number;
  w: number;
}

/** Tolerancia vertical para considerar que dos tokens están en la misma línea. */
const TOL_Y = 3.5;

/**
 * Separación horizontal (en px del PDF) a partir de la cual se corta en una
 * celda nueva. Un espacio normal entre palabras es bastante menor.
 */
const CORTE_X = 12;

function agruparEnLineas(tokens: Token[]): Token[][] {
  const ordenados = [...tokens].sort((a, b) => b.y - a.y || a.x - b.x);
  const lineas: Token[][] = [];
  let actual: Token[] = [];
  let ultimaY: number | null = null;

  for (const t of ordenados) {
    if (ultimaY == null || Math.abs(t.y - ultimaY) <= TOL_Y) {
      actual.push(t);
      ultimaY = ultimaY ?? t.y;
    } else {
      if (actual.length) lineas.push(actual);
      actual = [t];
      ultimaY = t.y;
    }
  }
  if (actual.length) lineas.push(actual);

  return lineas.map((l) => [...l].sort((a, b) => a.x - b.x));
}

/** Corta una línea en celdas usando los huecos horizontales. */
function lineaACeldas(linea: Token[]): Cell[] {
  const celdas: string[] = [];
  let buffer = "";
  let finAnterior: number | null = null;

  for (const t of linea) {
    const texto = t.str.replace(/\s+/g, " ");
    if (!texto.trim()) continue;

    if (finAnterior != null && t.x - finAnterior > CORTE_X) {
      celdas.push(buffer.trim());
      buffer = "";
    }
    buffer += (buffer && !buffer.endsWith(" ") ? " " : "") + texto.trim();
    finAnterior = t.x + t.w;
  }
  if (buffer.trim()) celdas.push(buffer.trim());

  return celdas;
}

/** Cada página del PDF se devuelve como una "hoja", igual que Excel. */
export async function readPdfGrid(file: File): Promise<SheetData[]> {
  const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const hojas: SheetData[] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const contenido = await page.getTextContent();

    const tokens: Token[] = contenido.items
      .map((it: any) => ({
        str: String(it.str ?? ""),
        x: it.transform?.[4] ?? 0,
        y: it.transform?.[5] ?? 0,
        w: it.width ?? 0,
      }))
      .filter((t: Token) => t.str.trim().length > 0);

    const grid = agruparEnLineas(tokens)
      .map(lineaACeldas)
      .filter((f) => f.length > 0);

    hojas.push({ name: `Página ${p}`, grid });
  }

  return hojas;
}
