"use client";

import { useState } from "react";
import { getJSON } from "../../lib/http";
import type { FilterSelection } from "../../types/filters";

import {
  labelFor,
  toCSV,
  downloadBlob,
  exportToExcelBW,
  normalizeText,
  parseDateAny,
  startOfDay,
  addDays,
  inRange,
  isMissingField,
} from "./medicosExport";

import {
  hasEspecialidadesCatalog,
  setEspecialidadesCatalog,
} from "../../lib/especialidadesCatalog";

// -------------------------
// helpers
// -------------------------
type Format = "xlsx" | "csv";

function stamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(
    d.getHours()
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function safeStr(v: any) {
  return v === null || v === undefined ? "" : String(v);
}

function buildQS(obj: Record<string, any>) {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.join("&");
}

function normalizeColKey(k: string) {
  // por si quedó en algún lado "especialidades"
  if (k === "especialidades") return "especialidad";
  return k;
}

// -------------------------
// ✅ Especialidad filter por ID (nro_especialidad..6)
// -------------------------
function parseEspecialidadFilter(v: string): { mode: "none" | "id"; value: string } {
  const s = String(v ?? "").trim();
  if (!s) return { mode: "none", value: "" };

  if (s.startsWith("id:")) return { mode: "id", value: s.slice(3).trim() };

  // fallback si guardaste el id pelado
  if (/^\d+$/.test(s)) return { mode: "id", value: s };

  // si venía name:... no lo usamos acá (para no romper)
  return { mode: "none", value: "" };
}

function rowHasEspecialidadId(row: any, id: string): boolean {
  const want = String(id ?? "").trim();
  if (!want || want === "0") return true;

  const keys = [
    "nro_especialidad",
    "nro_especialidad2",
    "nro_especialidad3",
    "nro_especialidad4",
    "nro_especialidad5",
    "nro_especialidad6",
    "NRO_ESPECIALIDAD",
    "NRO_ESPECIALIDAD2",
    "NRO_ESPECIALIDAD3",
    "NRO_ESPECIALIDAD4",
    "NRO_ESPECIALIDAD5",
    "NRO_ESPECIALIDAD6",
  ];

  return keys.some((k) => String(row?.[k] ?? "").trim() === want);
}

// -------------------------
// ✅ Catalog loader (para que Excel nunca salga vacío)
// -------------------------
async function ensureEspecialidadesCatalogLoaded() {
  if (hasEspecialidadesCatalog()) return;

  const data = await getJSON<any[]>("/api/especialidades/");
  const opts = Array.isArray(data)
    ? data
        .map((e: any) => {
          const rawVal = e?.id ?? e?.ID ?? e?.codigo ?? e?.CODIGO ?? e?.value ?? "";
          const rawLabel =
            e?.nombre ??
            e?.NOMBRE ??
            e?.descripcion ??
            e?.DESCRIPCION ??
            e?.detalle ??
            e?.DETALLE ??
            e?.label ??
            e?.name ??
            rawVal;

          const v = String(rawVal ?? "").trim();
          const l = String(rawLabel ?? "").trim();
          return { value: v || l, label: l || v };
        })
        .filter((x) => x.value && x.value !== "0")
    : [];

  setEspecialidadesCatalog(opts);
}

// -------------------------
// ✅ Fetch all medicos WITHOUT filters (evita 422)
//   - intenta page/size
//   - si falla, intenta skip/limit
//   - fallback: sin params
// -------------------------
async function fetchMedicosAll(): Promise<any[]> {
  const PAGE_SIZE = 1000;

  async function fetchWithPageSize(): Promise<any[]> {
    let page = 1;
    const out: any[] = [];
    let total: number | null = null;

    while (true) {
      const qs = buildQS({ page, size: PAGE_SIZE });
      const data = await getJSON<any>(`/api/medicos?${qs}`);

      if (Array.isArray(data)) return data;

      const items = Array.isArray(data?.items) ? data.items : [];
      const t = Number.isFinite(data?.total) ? Number(data.total) : null;

      for (const it of items) out.push(it);
      if (t !== null) total = t;

      if (items.length === 0) break;
      if (total !== null && out.length >= total) break;

      page += 1;
      if (page > 10000) break;
    }

    return out;
  }

  async function fetchWithSkipLimit(): Promise<any[]> {
    let skip = 0;
    const out: any[] = [];
    let total: number | null = null;

    while (true) {
      const qs = buildQS({ skip, limit: PAGE_SIZE });
      const data = await getJSON<any>(`/api/medicos?${qs}`);

      if (Array.isArray(data)) return data;

      const items = Array.isArray(data?.items) ? data.items : [];
      const t = Number.isFinite(data?.total) ? Number(data.total) : null;

      for (const it of items) out.push(it);
      if (t !== null) total = t;

      if (items.length === 0) break;
      if (total !== null && out.length >= total) break;

      skip += PAGE_SIZE;
      if (skip > 50_000_000) break;
    }

    return out;
  }

  try {
    return await fetchWithPageSize();
  } catch {
    try {
      return await fetchWithSkipLimit();
    } catch {
      const data = await getJSON<any>("/api/medicos");
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.items)) return data.items;
      return [];
    }
  }
}

// -------------------------
// ✅ Client-side filters (para no depender del backend)
// -------------------------
function isActive(row: any): boolean {
  const b = row?.activo ?? row?.ACTIVO;
  if (typeof b === "boolean") return b;

  const ex = String(row?.existe ?? row?.EXISTE ?? "").trim().toUpperCase();
  if (!ex) return true;
  return ex === "S" || ex === "SI" || ex === "1" || ex === "Y" || ex === "TRUE";
}

function pickField(row: any, candidates: string[]) {
  for (const k of candidates) {
    const v = row?.[k];
    if (v !== null && v !== undefined && String(v).trim() !== "") return v;
  }
  return "";
}

function matchTextIncludes(rowVal: any, q: string) {
  if (!q) return true;
  return normalizeText(rowVal).includes(q);
}

function applyClientFilters(rows: any[], filters: FilterSelection): any[] {
  let out = rows.slice();

  // Otros
  const sexo = String(filters.otros.sexo ?? "").trim();
  if (sexo) {
    const q = normalizeText(sexo);
    out = out.filter((r) => normalizeText(pickField(r, ["sexo", "SEXO"])) === q);
  }

  const provincia = String(filters.otros.provincia ?? "").trim();
  if (provincia) {
    const q = normalizeText(provincia);
    out = out.filter((r) => matchTextIncludes(pickField(r, ["provincia", "PROVINCIA"]), q));
  }

  const categoria = String(filters.otros.categoria ?? "").trim();
  if (categoria) {
    const q = normalizeText(categoria);
    out = out.filter((r) => normalizeText(pickField(r, ["categoria", "CATEGORIA"])) === q);
  }

  const condImp = String(filters.otros.condicionImpositiva ?? "").trim();
  if (condImp) {
    const q = normalizeText(condImp);
    out = out.filter((r) =>
      normalizeText(pickField(r, ["condicion_impositiva", "CONDICION_IMPOSITIVA"])) === q
    );
  }

  if (filters.otros.estado) {
    out = out.filter((r) => (filters.otros.estado === "activo" ? isActive(r) : !isActive(r)));
  }

  // Fecha ingreso
  const fiDesde = parseDateAny(filters.otros.fechaIngresoDesde);
  const fiHasta = parseDateAny(filters.otros.fechaIngresoHasta);
  if (fiDesde || fiHasta) {
    const d0 = fiDesde ? startOfDay(fiDesde) : null;
    const d1 = fiHasta ? startOfDay(fiHasta) : null;
    out = out.filter((r) => {
      const d = parseDateAny(pickField(r, ["fecha_ingreso", "FECHA_INGRESO"]));
      if (!d) return false;
      return inRange(startOfDay(d), d0, d1);
    });
  }

  // Solo con mala praxis (empresa)
  if (filters.otros.conMalapraxis) {
    out = out.filter((r) => {
      const v = safeStr(pickField(r, ["malapraxis", "MALAPRAXIS", "malapraxis_empresa", "MALAPRAXIS_EMPRESA"])).trim();
      return !!v && v !== "0";
    });
  }

  // ✅ Especialidad por ID (local)
  const esp = parseEspecialidadFilter(filters.otros.especialidad || "");
  if (esp.mode === "id" && esp.value) {
    out = out.filter((r) => rowHasEspecialidadId(r, esp.value));
  }

  // Faltantes / presentes
  if (filters.faltantes.enabled) {
    out = out.filter((r) => {
      const miss = isMissingField(r, filters.faltantes.field);
      return filters.faltantes.mode === "missing" ? miss : !miss;
    });
  }

  // Vencimientos (OR entre condiciones seleccionadas)
  const today = startOfDay(new Date());

  const rangeFrom =
    filters.vencimientos.fechaDesde ? startOfDay(parseDateAny(filters.vencimientos.fechaDesde) as any) : null;
  const rangeTo =
    filters.vencimientos.fechaHasta ? startOfDay(parseDateAny(filters.vencimientos.fechaHasta) as any) : null;

  const dias = Number(filters.vencimientos.dias || 0);
  const porVencerEnd = rangeTo
    ? rangeTo
    : dias > 0
    ? addDays(today, dias)
    : null;

  const anyVtoSelected =
    filters.vencimientos.malapraxisVencida ||
    filters.vencimientos.malapraxisPorVencer ||
    filters.vencimientos.anssalVencido ||
    filters.vencimientos.anssalPorVencer ||
    filters.vencimientos.coberturaVencida ||
    filters.vencimientos.coberturaPorVencer;

  if (anyVtoSelected) {
    out = out.filter((r) => {
      const vtoMal = parseDateAny(pickField(r, ["vencimiento_malapraxis", "VENCIMIENTO_MALAPRAXIS"]));
      const vtoAns = parseDateAny(pickField(r, ["vencimiento_anssal", "VENCIMIENTO_ANSSAL"]));
      const vtoCob = parseDateAny(pickField(r, ["vencimiento_cobertura", "VENCIMIENTO_COBERTURA"]));

      const malCond =
        (filters.vencimientos.malapraxisVencida && vtoMal && startOfDay(vtoMal).getTime() < today.getTime()) ||
        (filters.vencimientos.malapraxisPorVencer &&
          vtoMal &&
          startOfDay(vtoMal).getTime() >= today.getTime() &&
          (!porVencerEnd ? true : inRange(startOfDay(vtoMal), rangeFrom ?? today, porVencerEnd)));

      const ansCond =
        (filters.vencimientos.anssalVencido && vtoAns && startOfDay(vtoAns).getTime() < today.getTime()) ||
        (filters.vencimientos.anssalPorVencer &&
          vtoAns &&
          startOfDay(vtoAns).getTime() >= today.getTime() &&
          (!porVencerEnd ? true : inRange(startOfDay(vtoAns), rangeFrom ?? today, porVencerEnd)));

      const cobCond =
        (filters.vencimientos.coberturaVencida && vtoCob && startOfDay(vtoCob).getTime() < today.getTime()) ||
        (filters.vencimientos.coberturaPorVencer &&
          vtoCob &&
          startOfDay(vtoCob).getTime() >= today.getTime() &&
          (!porVencerEnd ? true : inRange(startOfDay(vtoCob), rangeFrom ?? today, porVencerEnd)));

      // OR: si seleccionaste varias, entra con cualquiera
      return Boolean(malCond || ansCond || cobCond);
    });
  }

  return out;
}

// -------------------------
// Hook
// -------------------------
export function useMedicosExport() {
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function onExportWithFilters(
    format: Format,
    filters: FilterSelection,
    logoFile: File | null
  ) {
    setExportLoading(true);
    setExportError(null);

    try {
      // ✅ catálogo SIEMPRE antes del export (para especialidades)
      await ensureEspecialidadesCatalogLoaded();

      // ✅ traer TODO sin filtros (evita 422)
      const all = await fetchMedicosAll();
      if (!Array.isArray(all) || all.length === 0) {
        throw new Error("No se recibieron médicos desde /api/medicos.");
      }

      // ✅ aplicar filtros localmente (incluye especialidad por ID)
      const rows = applyClientFilters(all, filters);

      // ✅ columnas
      const selectedCols = (filters.columns ?? []).map(normalizeColKey);
      const cols = selectedCols.map((key) => ({ key, header: labelFor(key) }));

      const filenameBase = `medicos_${stamp()}`;

      if (format === "csv") {
        const csv = toCSV(rows, cols);
        downloadBlob(`${filenameBase}.csv`, "text/csv;charset=utf-8", csv);
        return true;
      }

      await exportToExcelBW({
        filename: `${filenameBase}.xlsx`,
        title: "Colegio Médico de Corrientes",
        subtitle: `Listado de médicos • Filas: ${rows.length}`,
        columns: cols,
        rows,
        logoFile,
      });

      return true;
    } catch (e: any) {
      setExportError(e?.message || "Error al exportar");
      return false;
    } finally {
      setExportLoading(false);
    }
  }

  return {
    exportLoading,
    exportError,
    setExportError,
    onExportWithFilters,
  };
}
