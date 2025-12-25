import type { ObraSocial } from "./docxParser";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorker;

function parseLinesToRanking(lines: string[]): ObraSocial[] {
  const result: ObraSocial[] = [];
  let obraActual = "";

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Si la línea parece encabezado de obra social: "1 - OSDE ..." o "12 – ..."
    if (/^\s*\d+\s*[-–]/.test(line)) {
      obraActual = line;
      continue;
    }

    // Busca "Consulta ... $ 12.345,67"
    const match = line.match(/Consulta(?:\s+Especialista|\s+Única)?\s*\$?\s*([\d.,]+)/i);

    if (match && obraActual) {
      const value = Number(match[1].replace(/\./g, "").replace(",", "."));
      if (Number.isFinite(value)) {
        result.push({ nombre: obraActual, consulta: value });
      }
      obraActual = "";
    }
  }

  return result;
}

export async function parsePdfRanking(file: File): Promise<ObraSocial[]> {
  const buffer = await file.arrayBuffer();
  const pdf = await (pdfjsLib as any).getDocument({ data: buffer }).promise;

  const lines: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    // juntamos los "items" en líneas
    const strings = content.items.map((it: any) => String(it.str ?? ""));
    // PDF suele cortar: esto no siempre respeta líneas perfectas, pero ayuda
    lines.push(...strings.join(" ").split(/\n+/));
    // también agregamos una separación por página
    lines.push("");
  }

  return parseLinesToRanking(lines);
}
