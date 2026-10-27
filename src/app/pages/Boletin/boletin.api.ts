// Lo que el ranking de valores pide al servidor.

import { http } from "@/app/shared/lib/http";

export type RankedOS = {
  nro: number;
  nombre: string;
  honorariosA: number;
};

function safeNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const raw = v.trim();
    if (!raw) return 0;

    let normalized = raw;

    if (raw.includes(",")) {
      normalized = raw.replace(/\./g, "").replace(",", ".");
    } else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) {
      normalized = raw.replace(/\./g, "");
    }

    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function normalizeText(s: unknown, maxLen = 160): string {
  const t = String(s ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!t) return "";
  return t.length > maxLen ? `${t.slice(0, maxLen - 1)}…` : t;
}

/** El ranking a una fecha, desde el nomenclador nuevo. */
export async function fetchRanking(codigo: string, fecha: string): Promise<RankedOS[]> {
  const { data } = await http.get("/api/reportes_nm/ranking_valores", {
    params: { codigo, ...(fecha ? { fecha_referencia: fecha } : {}) },
  });
  const filas = Array.isArray(data?.ranking) ? data.ranking : [];
  return filas.map((r: Record<string, unknown> | null) => ({
    nro: Number(r?.obra_social_nro ?? 0),
    nombre: normalizeText(r?.nombre_os ?? `OS ${r?.obra_social_nro ?? ""}`),
    honorariosA: safeNum(r?.valor),
  }));
}
