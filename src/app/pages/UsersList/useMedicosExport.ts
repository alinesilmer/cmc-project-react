// src/app/pages/UsersList/useMedicosExport.ts
"use client";

import { useCallback, useState } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

import type { ExportColumnKey, MedicoRow } from "./medicosExport";
import { DEFAULT_HEADERS, mapUIToQuery, pickValue } from "./medicosExport";

// ✅ IMPORTANT: use your existing axios instance (DO NOT CHANGE LIB)
import { http } from "../../lib/http";
import type { FilterSelection } from "../../types/filters";

type ExportFormat = "xlsx" | "csv";

function safeStr(v: unknown) {
  return v == null ? "" : String(v);
}

function formatDateTime(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function fileToBase64(file: File): Promise<{ base64: string; ext: "png" | "jpeg" }> {
  const ab = await file.arrayBuffer();
  const bytes = new Uint8Array(ab);

  // binary -> base64
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const b64 = btoa(binary);

  const type = (file.type || "").toLowerCase();
  const ext: "png" | "jpeg" =
    type.includes("png") ? "png" : "jpeg";

  return { base64: `data:image/${ext};base64,${b64}`, ext };
}

function downloadCSV(filename: string, headers: string[], dataRows: string[][]) {
  const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
  const lines = [
    headers.map(esc).join(","),
    ...dataRows.map((r) => r.map(esc).join(",")),
  ];
  const csv = lines.join("\n");

  saveAs(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

export function useMedicosExport() {
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const onExportWithFilters = useCallback(
    async (format: ExportFormat, filters: FilterSelection, logoFile: File | null) => {
      setExportLoading(true);
      setExportError(null);

      try {
        const cols = (filters.columns || []) as ExportColumnKey[];
        if (!cols.length) {
          setExportError("Seleccioná al menos una columna");
          return false;
        }

        // ✅ build backend params
        const params = {
          ...mapUIToQuery(filters as any),
          limit: 2000,
          offset: 0,
        };

        // ✅ CRITICAL: same-origin request (NO CORS) but keep your axios interceptors/token/refresh
        // This makes the request go to:  https://colegiomedicocorrientes.com/api/medicos/all
        // instead of:                  https://api.colegiomedicocorrientes.com/api/medicos/all
        const { data: payload } = await http.get<any>("/api/medicos/all", {
          baseURL: "", // 👈 SAME ORIGIN ONLY HERE (NO LIB CHANGE)
          params,
          withCredentials: true,
        });

        const rows: MedicoRow[] = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.items)
            ? payload.items
            : Array.isArray(payload?.data)
              ? payload.data
              : [];

        const filenameBase = "Medicos";
        const now = new Date();
        const generated = formatDateTime(now);

        if (format === "csv") {
          const headers = cols.map((k) => DEFAULT_HEADERS[k] ?? k);
          const dataRows = rows.map((r) => cols.map((k) => pickValue(r, k)));
          downloadCSV(`${filenameBase}.csv`, headers, dataRows);
          return true;
        }

        // =========================
        // XLSX PRETTY
        // =========================
        const wb = new ExcelJS.Workbook();
        wb.creator = "CMC";
        wb.created = now;

        const ws = wb.addWorksheet("Medicos", {
          views: [{ state: "frozen", ySplit: 6 }], // freeze below header row
        });

        // Row layout:
        // 1..4 header zone (logo + title)
        // 5 metadata
        // 6 column headers
        const HEADER_ROW = 6;

        ws.getRow(1).height = 22;
        ws.getRow(2).height = 22;
        ws.getRow(3).height = 22;
        ws.getRow(4).height = 22;
        ws.getRow(5).height = 18;
        ws.getRow(HEADER_ROW).height = 22;

        const headers = cols.map((k) => DEFAULT_HEADERS[k] ?? k);
        const totalCols = headers.length;
        const lastCol = Math.max(totalCols, 1);

        // ---- Logo (optional)
        if (logoFile) {
          try {
            const { base64, ext } = await fileToBase64(logoFile);
            const imageId = wb.addImage({ base64, extension: ext });

            // ✅ FIX for your TypeScript error: use correct col/row anchors
            ws.addImage(imageId, {
              tl: { col: 0, row: 0 }, // A1
              ext: { width: 220, height: 90 },
            });
          } catch {
            // ignore logo errors
          }
        }

        // ---- Title (merge across columns)
        const title = "Listado de Médicos";
        ws.mergeCells(1, 1, 2, lastCol); // rows 1-2 merged for title
        const titleCell = ws.getCell(1, 1);
        titleCell.value = title;
        titleCell.font = { bold: true, size: 18 };
        titleCell.alignment = { vertical: "middle", horizontal: "center" };

        // ---- Meta (generated date)
        ws.mergeCells(5, 1, 5, lastCol);
        const metaCell = ws.getCell(5, 1);
        metaCell.value = `Generado: ${generated}`;
        metaCell.font = { italic: true, size: 11 };
        metaCell.alignment = { vertical: "middle", horizontal: "right" };

        // ---- Header row
        ws.addRow([]); // row 6 is header row after frozen split; we'll set values directly
        for (let i = 0; i < headers.length; i++) {
          const cell = ws.getCell(HEADER_ROW, i + 1);
          cell.value = headers[i];
          cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
          cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F3A5F" } };
          cell.border = {
            top: { style: "thin", color: { argb: "FFB0B0B0" } },
            left: { style: "thin", color: { argb: "FFB0B0B0" } },
            bottom: { style: "thin", color: { argb: "FFB0B0B0" } },
            right: { style: "thin", color: { argb: "FFB0B0B0" } },
          };
        }

        // ---- Data rows start at HEADER_ROW + 1
        for (const r of rows) {
          ws.addRow(cols.map((k) => pickValue(r, k)));
        }

        // ---- AutoFilter
        ws.autoFilter = {
          from: { row: HEADER_ROW, column: 1 },
          to: { row: HEADER_ROW, column: lastCol },
        };

        // ---- Column widths
        ws.columns = headers.map((h) => ({ header: h, key: h, width: Math.min(Math.max(h.length + 4, 14), 45) }));
        // Improve widths based on content (cheap scan)
        ws.columns.forEach((col) => {
          let maxLen = Math.max(12, safeStr(col.header).length + 2);
          col.eachCell?.({ includeEmpty: true }, (cell) => {
            const s = safeStr(cell.value);
            if (s.length > maxLen) maxLen = s.length;
          });
          col.width = Math.min(Math.max(maxLen + 2, 12), 60);
        });

        // ---- Zebra borders for data rows
        const firstDataRow = HEADER_ROW + 1;
        const lastDataRow = ws.rowCount;

        for (let r = firstDataRow; r <= lastDataRow; r++) {
          const row = ws.getRow(r);
          row.height = 18;
          row.eachCell((cell) => {
            cell.border = {
              top: { style: "thin", color: { argb: "FFE0E0E0" } },
              left: { style: "thin", color: { argb: "FFE0E0E0" } },
              bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
              right: { style: "thin", color: { argb: "FFE0E0E0" } },
            };
            cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
          });
        }

        const buf = await wb.xlsx.writeBuffer();
        saveAs(
          new Blob([buf], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }),
          `${filenameBase}.xlsx`
        );

        return true;
      } catch (e: any) {
        const msg =
          e?.response?.data?.detail
            ? String(e.response.data.detail)
            : e?.message || "Error exportando";

        setExportError(msg);
        return false;
      } finally {
        setExportLoading(false);
      }
    },
    []
  );

  return { exportLoading, exportError, setExportError, onExportWithFilters };
}
