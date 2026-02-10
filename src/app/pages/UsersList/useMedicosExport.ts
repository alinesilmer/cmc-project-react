"use client";

import { useState } from "react";
import { getJSON } from "../../lib/http";
import type { FilterSelection } from "../../types/filters";

import {
  buildQS,
  mapUIToQuery,
  labelFor,
  toCSV,
  downloadBlob,
  exportToExcelBW,
} from "./medicosExport";

import { hasEspecialidadesCatalog, setEspecialidadesCatalog } from "../../lib/especialidadesCatalog";

type Format = "xlsx" | "csv";

function stamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(
    d.getMinutes()
  )}${pad(d.getSeconds())}`;
}

// Normaliza key por si en algún lado te quedó "especialidades"
function normalizeColKey(k: string) {
  if (k === "especialidades") return "especialidad";
  return k;
}

function parseEspecialidadFilter(v: string): { mode: "none" | "id" | "name"; value: string } {
  const s = String(v ?? "").trim();
  if (!s) return { mode: "none", value: "" };
  if (s.startsWith("id:")) return { mode: "id", value: s.slice(3).trim() };
  if (s.startsWith("name:")) return { mode: "name", value: s.slice(5).trim() };
  // fallback: si te quedó guardado un id “pelado”
  if (/^\d+$/.test(s)) return { mode: "id", value: s };
  return { mode: "name", value: s };
}

function rowHasEspecialidadId(row: any, id: string): boolean {
  const want = String(id).trim();
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

async function ensureEspecialidadesCatalogLoaded() {
  if (hasEspecialidadesCatalog()) return;

  // si no está cargado, lo cargamos acá para que el Excel NUNCA salga vacío
  const data = await getJSON<any[]>("/api/especialidades/");
  const opts = Array.isArray(data)
    ? data.map((e: any) => {
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
    : [];

  setEspecialidadesCatalog(opts);
}

export function useMedicosExport() {
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function onExportWithFilters(format: Format, filters: FilterSelection, logoFile: File | null) {
    setExportLoading(true);
    setExportError(null);

    try {
      // ✅ Asegura catálogo antes de exportar (clave)
      await ensureEspecialidadesCatalogLoaded();

      // ✅ armamos query con tus filtros (sin especialidad para evitar 422)
      const queryObj = mapUIToQuery(filters);
      const qs = buildQS({ ...queryObj, limit: 50000 });

      const url = `/api/medicos?${qs}`;
      let rows = await getJSON<any[]>(url);

      if (!Array.isArray(rows)) throw new Error("La API no devolvió una lista de médicos.");

      // ✅ filtro de especialidad SE APLICA LOCAL (por id)
      const esp = parseEspecialidadFilter(filters.otros.especialidad || "");
      if (esp.mode === "id") {
        rows = rows.filter((r) => rowHasEspecialidadId(r, esp.value));
      }
      // si fuera name:... (viejo), lo dejamos sin filtrar para no romper (o lo implementamos luego)

      // ✅ columnas seleccionadas
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
        subtitle: "Listado de médicos",
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
