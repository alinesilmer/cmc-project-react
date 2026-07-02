// Lector de CSV: una sola hoja. `xlsx` se carga diferido (parsea CSV desde texto).
import type { SheetData, Cell } from "./types";

const SHEET_OPTS = { header: 1, raw: true, blankrows: false, defval: null } as const;

export async function readCsv(file: File): Promise<SheetData[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.text(), { type: "string" });
  const name = wb.SheetNames[0] ?? "CSV";
  return [{ name, grid: XLSX.utils.sheet_to_json(wb.Sheets[name], SHEET_OPTS) as Cell[][] }];
}
