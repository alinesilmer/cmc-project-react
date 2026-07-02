// Lector de Excel (.xlsx/.xls): devuelve las hojas como grillas. `xlsx` se carga diferido.
import type { SheetData, Cell } from "./types";

const SHEET_OPTS = { header: 1, raw: true, blankrows: false, defval: null } as const;

export async function readExcel(file: File): Promise<SheetData[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  return wb.SheetNames.map((name) => ({
    name,
    grid: XLSX.utils.sheet_to_json(wb.Sheets[name], SHEET_OPTS) as Cell[][],
  }));
}
