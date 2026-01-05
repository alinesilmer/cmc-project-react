// src/app/hooks/useMedicosExport.ts
import { useState } from "react";
import { getJSONLong } from "../../lib/http";
import type { FilterSelection } from "../../types/filters";
import {
  buildQS,
  exportToExcelBW,
  labelFor,
  mapUIToQuery,
  toCSV,
  downloadBlob,
} from "./medicosExport";
import {
  presetColumns,
  sortForPreset,
  baseFilterForPreset,
  applyExtraFilters,
  type ExportPresetId,
  type PresetParams,
} from "./medicosPresets";

type MedicoRow = Record<string, unknown>;

// Descarga paginada para evitar timeouts de 15s y respuestas gigantes
async function fetchAllMedicos(qsBase: string, pageSize = 10_000) {
  const all: MedicoRow[] = [];
  let skip = 0;

  // subí el timeout por página a 120s (ajustable)
  const TIMEOUT_PER_PAGE = 120_000;

  // loop hasta que la página venga incompleta
  // (tu endpoint soporta ?limit y ?skip)
  // /api/medicos/all?{qsBase}&limit=10000&skip=0
  while (true) {
    const qs = `${qsBase}&limit=${pageSize}&skip=${skip}`;
    const url = `/api/medicos/all?${qs}`;
    const page = await getJSONLong<MedicoRow[]>(url, TIMEOUT_PER_PAGE);

    if (!Array.isArray(page) || page.length === 0) break;

    all.push(...page);
    if (page.length < pageSize) break; // última página
    skip += page.length;
  }
  return all;
}

export function useMedicosExport() {
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function onExportWithFilters(
    format: "xlsx" | "csv",
    filters: FilterSelection,
    logoFile: File | null
  ) {
    if (filters.columns.length === 0) {
      setExportError("Seleccioná al menos una columna");
      return false;
    }
    setExportLoading(true);
    setExportError(null);
    try {
      // armamos QS SIN limit/skip (lo maneja fetchAllMedicos)
      const qsBase = buildQS({ ...mapUIToQuery(filters) });
      const rows = await fetchAllMedicos(qsBase, 10_000); // podés subir a 20k si tu API banca

      const cols = filters.columns.map((key) => ({
        key,
        header: labelFor(key),
      }));

      if (format === "xlsx") {
        await exportToExcelBW({
          filename: `medicos_${new Date().toISOString().slice(0, 10)}.xlsx`,
          title: "Listado de Médicos",
          subtitle: `${rows.length} registros`,
          columns: cols,
          rows,
          logoFile,
        });
      } else {
        const csv = toCSV(rows, cols);
        downloadBlob(
          `medicos_${new Date().toISOString().slice(0, 10)}.csv`,
          "text/csv;charset=utf-8",
          csv
        );
      }
      return true;
    } catch (e: any) {
      setExportError(e?.message || "Error al exportar");
      return false;
    } finally {
      setExportLoading(false);
    }
  }

  async function onExportPreset(
    format: "xlsx" | "csv",
    presetId: ExportPresetId,
    rawUsers: MedicoRow[],
    presetParams: PresetParams
  ) {
    setExportLoading(true);
    setExportError(null);
    try {
      const filtered = rawUsers.filter(
        (r) =>
          baseFilterForPreset(presetId, r, presetParams) &&
          applyExtraFilters(r, presetParams)
      );
      const sorted = sortForPreset(presetId, filtered);

      if (sorted.length === 0) {
        setExportError(
          "No hay registros que coincidan con los filtros seleccionados"
        );
        return false;
      }

      const cols = presetColumns(presetId);
      const fname = `${presetId}_${new Date().toISOString().slice(0, 10)}`;

      if (format === "xlsx") {
        await exportToExcelBW({
          filename: `${fname}.xlsx`,
          title: cols.length ? cols[0].header : "Export",
          subtitle: `${sorted.length} registro${
            sorted.length !== 1 ? "s" : ""
          }`,
          columns: cols,
          rows: sorted,
          logoFile: null,
        });
      } else {
        const csv = toCSV(sorted, cols);
        downloadBlob(`${fname}.csv`, "text/csv;charset=utf-8", csv);
      }
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
    onExportPreset,
  };
}
