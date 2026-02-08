
import { useState } from "react";
import { getJSONLong } from "../../lib/http";
import type { FilterSelection, MissingFieldKey } from "../../types/filters";
import {
  buildQS,
  exportToExcelBW,
  labelFor,
  mapUIToQuery,
  toCSV,
  downloadBlob,
  getCellValue,
  isMissingField,
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

async function fetchAllMedicos(qsBase: string, pageSize = 10_000) {
  const all: MedicoRow[] = [];
  let skip = 0;
  const TIMEOUT_PER_PAGE = 120_000;

  while (true) {
    const qs = `${qsBase}&limit=${pageSize}&skip=${skip}`;
    const url = `/api/medicos/all?${qs}`;
    const page = await getJSONLong<MedicoRow[]>(url, TIMEOUT_PER_PAGE);

    if (!Array.isArray(page) || page.length === 0) break;

    all.push(...page);
    if (page.length < pageSize) break;
    skip += page.length;
  }

  return all;
}

function applyClientOnlyFilters(rows: MedicoRow[], filters: FilterSelection) {
  let out = rows;

 // FALTANTES
if (filters.faltantes?.enabled) {
  const field = filters.faltantes.field as MissingFieldKey;
  const mode = filters.faltantes.mode;

  const isValidEmail = (v: unknown) => {
    const s = String(v ?? "").trim();
    if (!s) return false;
    if (s === "@") return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
  };

  out = out.filter((r) => {
    // Caso especial: mail_particular
    if (field === "mail_particular") {
      const raw = getCellValue(r, "mail_particular"); 
      if (mode === "missing") {
        // faltante si vacío o "@" o no válido
        return !isValidEmail(raw);
      }
      return isValidEmail(raw);
    }

    const miss = isMissingField(r, field);
    return mode === "missing" ? miss : !miss;
  });
}


  if (filters.otros?.conMalapraxis) {
    out = out.filter((r) => {
      const v = getCellValue(r, "malapraxis"); 
      return String(v ?? "").trim() !== "";
    });
  }

  return out;
}

export function useMedicosExport() {
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function onExportWithFilters(format: "xlsx" | "csv", filters: FilterSelection, logoFile: File | null) {
    if (!filters.columns || filters.columns.length === 0) {
      setExportError("Seleccioná al menos una columna");
      return false;
    }

    setExportLoading(true);
    setExportError(null);

    try {
      const colsKeys = ["nro_socio", ...filters.columns.filter((c) => c !== "nro_socio")];

      const qsBase = buildQS({ ...mapUIToQuery(filters) });

      const rowsRaw = await fetchAllMedicos(qsBase, 10_000);

      const rows = applyClientOnlyFilters(rowsRaw, filters);

      const cols = colsKeys.map((key) => ({ key, header: labelFor(key) }));
      const fnameDate = new Date().toISOString().slice(0, 10);

      if (format === "xlsx") {
        await exportToExcelBW({
          filename: `medicos_${fnameDate}.xlsx`,
          title: "Prestadores del Colegio Médico de Corrientes",
          subtitle: `${rows.length} registros`,
          columns: cols,
          rows,
          logoFile,
        });
      } else {
        const csv = toCSV(rows, cols);
        downloadBlob(`medicos_${fnameDate}.csv`, "text/csv;charset=utf-8", csv);
      }

      return true;
    } catch (e: any) {
      setExportError(e?.message || "Error al exportar");
      return false;
    } finally {
      setExportLoading(false);
    }
  }

  async function onExportPreset(format: "xlsx" | "csv", presetId: ExportPresetId, rawUsers: MedicoRow[], presetParams: PresetParams) {
    setExportLoading(true);
    setExportError(null);

    try {
      const filtered = rawUsers.filter(
        (r) => baseFilterForPreset(presetId, r, presetParams) && applyExtraFilters(r, presetParams)
      );
      const sorted = sortForPreset(presetId, filtered);

      if (sorted.length === 0) {
        setExportError("No hay registros que coincidan con los filtros seleccionados");
        return false;
      }

      const cols = presetColumns(presetId);
      const fname = `${presetId}_${new Date().toISOString().slice(0, 10)}`;

      if (format === "xlsx") {
        await exportToExcelBW({
          filename: `${fname}.xlsx`,
          title: "Prestadores del Colegio Médico de Corrientes",
          subtitle: `${sorted.length} registro${sorted.length !== 1 ? "s" : ""}`,
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
