import type { ObraSocial } from "./docxParser";
import { parseDocx } from "./docxParser";
import { parseXlsxRanking } from "./xlsxParser";
import { parsePdfRanking } from "./pdfParser";

function extOf(name: string) {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop()! : "";
}

function toMoneyNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return Number.NaN;

  const s = v
    .trim()
    .replace(/\s/g, "")
    .replace(/[^\d.,-]/g, "");

  if (s.includes(",")) {
    return Number(s.replace(/\./g, "").replace(",", "."));
  }
  return Number(s.replace(/,/g, ""));
}

function normalizeObrasSociales(rows: ObraSocial[]): ObraSocial[] {

  const banned = /generado\s*:|ranking\s+por\s+importe|obras\s+sociales\s+por\s+importe/i;

  const bestByName = new Map<string, number>();

  for (const r of rows) {
    const nombre = (r?.nombre ?? "").replace(/\s+/g, " ").trim();
    const consulta = toMoneyNumber((r as any)?.consulta);

    if (!nombre) continue;
    if (banned.test(nombre)) continue;
    if (!Number.isFinite(consulta) || consulta <= 0) continue;

    const prev = bestByName.get(nombre);
    if (prev === undefined || consulta > prev) bestByName.set(nombre, consulta);
  }

  return Array.from(bestByName, ([nombre, consulta]) => ({ nombre, consulta }));
}

export async function parseInputFile(file: File): Promise<ObraSocial[]> {
  const ext = extOf(file.name);

  let parsed: ObraSocial[];
  if (ext === "docx") parsed = await parseDocx(file);
  else if (ext === "xlsx" || ext === "xls") parsed = await parseXlsxRanking(file);
  else if (ext === "pdf") parsed = await parsePdfRanking(file);
  else throw new Error("Formato no soportado. Usá .docx, .xlsx/.xls o .pdf");

  return normalizeObrasSociales(parsed);
}
