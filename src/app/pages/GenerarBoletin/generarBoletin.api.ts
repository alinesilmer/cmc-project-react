// Lo que el boletín de valores pide al servidor.

import { http } from "@/app/shared/lib/http";

const ENDPOINTS = {
  valoresBoletin: `/api/valores/boletin`,
};

export type ApiBoletinRow = {
  id: number;
  nro_obrasocial: number;
  obra_social: string | null;
  nivel: number;
  fecha_cambio: string;

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

  categoria_a: string | null;
  categoria_b: string | null;
  categoria_c: string | null;
};

type QueryParams = {
  nro_obrasocial?: number;
  nivel?: number;
  fecha_cambio?: string;
  categoria?: "A" | "B" | "C";
};

function safeNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function normalizeRow(r: Record<string, unknown> | null | undefined): ApiBoletinRow {
  return {
    id: Number(r?.id ?? r?.ID ?? 0),
    nro_obrasocial: Number(r?.nro_obrasocial ?? r?.NRO_OBRASOCIAL ?? 0),
    obra_social: (r?.obra_social ?? r?.OBRA_SOCIAL ?? null) as string | null,
    nivel: Number(r?.nivel ?? r?.NIVEL ?? 0),
    fecha_cambio: String(r?.fecha_cambio ?? r?.FECHA_CAMBIO ?? ""),

    consulta: safeNum(r?.consulta ?? r?.CONSULTA),
    galeno_quirurgico: safeNum(r?.galeno_quirurgico ?? r?.GALENO_QUIRURGICO),
    gastos_quirurgicos: safeNum(r?.gastos_quirurgicos ?? r?.GASTOS_QUIRURGICOS),
    galeno_practica: safeNum(r?.galeno_practica ?? r?.GALENO_PRACTICA),
    galeno_radiologico: safeNum(r?.galeno_radiologico ?? r?.GALENO_RADIOLOGICO),
    gastos_radiologico: safeNum(r?.gastos_radiologico ?? r?.GASTOS_RADIOLOGICO),
    gastos_bioquimicos: safeNum(r?.gastos_bioquimicos ?? r?.GASTOS_BIOQUIMICOS),
    otros_gastos: safeNum(r?.otros_gastos ?? r?.OTROS_GASTOS),
    galeno_cirugia_adultos: safeNum(
      r?.galeno_cirugia_adultos ?? r?.GALENO_CIRUGIA_ADULTOS
    ),
    galeno_cirugia_infantil: safeNum(
      r?.galeno_cirugia_infantil ?? r?.GALENO_CIRUGIA_INFANTIL
    ),
    consulta_especial: safeNum(r?.consulta_especial ?? r?.CONSULTA_ESPECIAL),

    categoria_a: (r?.categoria_a ?? r?.CATEGORIA_A ?? null) as string | null,
    categoria_b: (r?.categoria_b ?? r?.CATEGORIA_B ?? null) as string | null,
    categoria_c: (r?.categoria_c ?? r?.CATEGORIA_C ?? null) as string | null,
  };
}

export async function fetchValoresBoletin(params?: QueryParams): Promise<ApiBoletinRow[]> {
  const { data } = await http.get(ENDPOINTS.valoresBoletin, { params });
  const arr = Array.isArray(data) ? data : [];
  return arr.map(normalizeRow);
}
