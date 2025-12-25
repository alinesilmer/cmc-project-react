import type { ObraSocial } from "./docxParser";
import { parseDocx } from "./docxParser";
import { parseXlsxRanking } from "./xlsxParser";
import { parsePdfRanking } from "./pdfParser";

function extOf(name: string) {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop()! : "";
}

export async function parseInputFile(file: File): Promise<ObraSocial[]> {
  const ext = extOf(file.name);

  if (ext === "docx") return parseDocx(file);
  if (ext === "xlsx" || ext === "xls") return parseXlsxRanking(file);
  if (ext === "pdf") return parsePdfRanking(file);

  throw new Error("Formato no soportado. Usá .docx, .xlsx/.xls o .pdf");
}
