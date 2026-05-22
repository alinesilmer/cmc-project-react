import { getJSON } from "../../lib/http";
import { parseFecha } from "./boletinConsultaComun.helpers";
import type { GalenoValues } from "./boletinConsultaComun.types";

type ApiGalenoRow = {
  id: number;
  nro_obrasocial: number;
  obra_social: string | null;
  nivel: number;
  fecha_cambio: string | null;
  consulta: number;
  galeno_quirurgico: number;
  gastos_quirurgicos: number;
  galeno_practica: number;
  galeno_radiologico: number;
  gastos_radiologico: number;
  gastos_bioquimicos: number;
  otros_gastos: number;
  galeno_cirugia_adultos: number;
  galeno_cirugia_infantil: number;
  consulta_especial: number;
  categoria_a: string;
  categoria_b: string;
  categoria_c: string;
};

export type GalenoMap = Map<number, GalenoValues>;

function extractRows(payload: unknown): ApiGalenoRow[] {
  if (Array.isArray(payload)) return payload as ApiGalenoRow[];
  const obj = payload as Record<string, unknown>;
  if (Array.isArray(obj?.results)) return obj.results as ApiGalenoRow[];
  if (Array.isArray(obj?.items)) return obj.items as ApiGalenoRow[];
  if (Array.isArray(obj?.data)) return obj.data as ApiGalenoRow[];
  return [];
}

export async function fetchGalenoMap(): Promise<GalenoMap> {
  const allRows: ApiGalenoRow[] = [];
  const size = 500;

  for (let page = 1; page <= 30; page++) {
    const payload = await getJSON<unknown>("/api/valores/galenos", { page, size });
    const rows = extractRows(payload);
    if (rows.length === 0) break;
    allRows.push(...rows);
    if (rows.length < size) break;
  }

  // Per OS, keep the entry with the most recent fecha_cambio.
  const latest = new Map<number, ApiGalenoRow>();
  for (const row of allRows) {
    if (!row.nro_obrasocial) continue;
    const existing = latest.get(row.nro_obrasocial);
    if (!existing) {
      latest.set(row.nro_obrasocial, row);
      continue;
    }
    const rowTs = parseFecha(row.fecha_cambio) ?? 0;
    const exTs = parseFecha(existing.fecha_cambio) ?? 0;
    if (rowTs > exTs) latest.set(row.nro_obrasocial, row);
  }

  const result: GalenoMap = new Map();
  for (const [nro, row] of latest.entries()) {
    result.set(nro, {
      quirurgico: row.galeno_quirurgico ?? 0,
      practica: row.galeno_practica ?? 0,
      radiologico: row.galeno_radiologico ?? 0,
      cirugiaAdultos: row.galeno_cirugia_adultos ?? 0,
      cirugiaInfantil: row.galeno_cirugia_infantil ?? 0,
      gastosQuirurgicos: row.gastos_quirurgicos ?? 0,
      gastosRadiologico: row.gastos_radiologico ?? 0,
      gastosBioquimicos: row.gastos_bioquimicos ?? 0,
      otrosGastos: row.otros_gastos ?? 0,
    });
  }

  return result;
}
