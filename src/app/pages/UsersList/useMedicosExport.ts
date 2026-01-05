// src/app/hooks/useMedicosExport.ts
import { useState } from "react";
import { getJSON } from "../../lib/http";
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
      return;
    }
    setExportLoading(true);
    setExportError(null);
    try {
      const qs = buildQS({ ...mapUIToQuery(filters), limit: 50000 });
      const url = `/api/medicos/all?${qs}`;
      const rows = await getJSON<MedicoRow[]>(url);

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
