import * as XLSX from "xlsx";
import type { ObraSocial } from "./docxParser";

function toNumber(v: any): number {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return Number.NaN;

  const cleaned = v
    .replace(/\$/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "");

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : Number.NaN;
}

function isTextCell(v: any) {
  if (typeof v !== "string") return false;
  const s = v.trim();
  if (!s) return false;
  if (s.toLowerCase().includes("importe consulta")) return false;
  if (s.toLowerCase().includes("obra social por importe")) return false;
  if (s.toLowerCase().startsWith("fecha:")) return false;
  return true;
}

export async function parseXlsxRanking(file: File): Promise<ObraSocial[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });

  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];

  const ws = wb.Sheets[sheetName];

  const matrix = XLSX.utils.sheet_to_json<any[]>(ws, {
    header: 1,
    defval: null,
    blankrows: false,
  });

  const result: ObraSocial[] = [];

  for (const row of matrix) {
    if (!Array.isArray(row)) continue;

    // 1) encontrar mejor candidato de "nombre"
    let nameIdx = -1;
    let nameVal = "";

    for (let c = 0; c < row.length; c++) {
      const v = row[c];
      if (isTextCell(v)) {
        nameIdx = c;
        nameVal = String(v).trim();
        break;
      }
    }

    if (nameIdx === -1) continue;

    // 2) encontrar mejor candidato de "importe" (preferir números a la derecha)
    let amount = Number.NaN;

    for (let c = row.length - 1; c >= 0; c--) {
      const v = row[c];
      const n = toNumber(v);
      if (Number.isFinite(n) && n > 0) {
        amount = n;
        break;
      }
    }

    if (!Number.isFinite(amount)) continue;

    result.push({ nombre: nameVal, consulta: amount });
  }

  // dedupe (por si hay filas repetidas)
  const seen = new Set<string>();
  const deduped = result.filter((x) => {
    const key = `${x.nombre}__${x.consulta}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped;
}
