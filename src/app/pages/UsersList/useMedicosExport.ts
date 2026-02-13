// src/app/pages/UsersList/useMedicosExport.ts
"use client";

import { useCallback, useState } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

import { DEFAULT_HEADERS, buildQS, mapUIToQuery, pickValue } from "./medicosExport";
import type { MedicoRow } from "./medicosExport";

import { getAccessToken, setAccessToken, getCookie } from "../../auth/token"; // ✅ use your existing token helpers

type Format = "xlsx" | "csv";

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

async function tryReadJSON(res: Response) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return await res.json();
  const text = await res.text().catch(() => "");
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function refreshTokenSameOrigin(): Promise<string | null> {
  // your lib calls "/auth/refresh" on API server.
  // In same-origin mode, depending on proxy, it can be "/api/auth/refresh" or "/auth/refresh".
  const csrf = getCookie("csrf_token");
  const headers: Record<string, string> = {};
  if (csrf) headers["X-CSRF-Token"] = csrf;

  const candidates = ["/api/auth/refresh", "/auth/refresh"];

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers,
      });

      if (!res.ok) continue;

      const data: any = await tryReadJSON(res);
      const token = data?.access_token ? String(data.access_token) : null;
      if (token) {
        setAccessToken(token);
        return token;
      }
    } catch {
      // try next
    }
  }

  return null;
}

async function fetchJSONSameOrigin<T>(url: string): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (res.status !== 401) {
    if (!res.ok) {
      const body = await tryReadJSON(res);
      throw new Error(`Export request failed (${res.status}): ${typeof body === "string" ? body : JSON.stringify(body)}`);
    }
    return (await res.json()) as T;
  }

  // 401 -> refresh + retry (like your axios interceptor)
  const newToken = await refreshTokenSameOrigin();
  if (!newToken) {
    setAccessToken(null);
    const body = await tryReadJSON(res);
    throw new Error(`Export request failed (401): ${typeof body === "string" ? body : JSON.stringify(body)}`);
  }

  const retry = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${newToken}`,
    },
  });

  if (!retry.ok) {
    const body = await tryReadJSON(retry);
    throw new Error(`Export request failed (${retry.status}): ${typeof body === "string" ? body : JSON.stringify(body)}`);
  }

  return (await retry.json()) as T;
}

async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return await file.arrayBuffer();
}

export function useMedicosExport() {
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  /**
   * This matches what your UsersList expects:
   * onExportWithFilters(format, filters, logoFile) -> Promise<boolean>
   */
  const onExportWithFilters = useCallback(
    async (format: Format, filters: any, logoFile: File | null) => {
      setExportLoading(true);
      setExportError(null);

      try {
        const selectedColumns: string[] = Array.isArray(filters?.columns) ? filters.columns : [];
        if (!selectedColumns.length) {
          setExportError("Seleccioná al menos una columna");
          return false;
        }

        // build query for backend
        const queryParams = mapUIToQuery(filters);
        const qs = buildQS({ ...queryParams, limit: 2000, offset: 0 });

        // ✅ SAME-ORIGIN (NO CORS)
        const url = `/api/medicos/all?${qs}`;

        const payload = await fetchJSONSameOrigin<any>(url);

        const rows: MedicoRow[] = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.items)
            ? payload.items
            : Array.isArray(payload?.data)
              ? payload.data
              : [];

        const filenameBase = "Medicos";

        if (format === "csv") {
          // CSV export (ExcelJS)
          const wb = new ExcelJS.Workbook();
          const ws = wb.addWorksheet("Medicos");

          const headers = selectedColumns.map((k) => DEFAULT_HEADERS[k] ?? k);
          ws.addRow(headers);

          for (const r of rows) {
            ws.addRow(selectedColumns.map((k) => pickValue(r, k)));
          }

          const buf = await wb.csv.writeBuffer();
          saveAs(new Blob([buf], { type: "text/csv;charset=utf-8" }), `${filenameBase}.csv`);
          return true;
        }

        // =================== PRETTY XLSX ===================
        const wb = new ExcelJS.Workbook();
        wb.creator = "CMC";
        wb.created = new Date();

        // Freeze: top 3 rows (title/meta/header)
        const ws = wb.addWorksheet("Medicos", {
          views: [{ state: "frozen", ySplit: 3 }],
        });

        // Top rows reserved
        ws.addRow([]);
        ws.addRow([]);
        ws.addRow([]);

        // Logo (optional)
        if (logoFile) {
          try {
            const buf = await fileToArrayBuffer(logoFile);
            const ext = (logoFile.type || "").includes("png") ? "png" : "jpeg";

            const imageId = wb.addImage({
              buffer: buf,
              extension: ext as "png" | "jpeg",
            });

           // A1:B3 (top-left to bottom-right)
ws.addImage(imageId, {
  tl: { col: 0, row: 0 },
  ext: { width: 220, height: 90 }, // pixels
});

          } catch {
            // ignore logo errors
          }
        }

        // Title + generated at
        ws.getCell("C1").value = "Listado de Médicos";
        ws.getCell("C1").font = { size: 18, bold: true };
        ws.getCell("C1").alignment = { vertical: "middle", horizontal: "left" };

        ws.getCell("C2").value = `Generado: ${new Date().toLocaleString()}`;
        ws.getCell("C2").font = { size: 11 };
        ws.getCell("C2").alignment = { vertical: "middle", horizontal: "left" };

        // Header row (row 4)
        const headerRowIndex = 4;
        const headers = selectedColumns.map((k) => DEFAULT_HEADERS[k] ?? k);

        const headerRow = ws.getRow(headerRowIndex);
        headers.forEach((h, i) => {
          const cell = headerRow.getCell(i + 1);
          cell.value = h;
          cell.font = { bold: true };
          cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };
          cell.border = {
            top: { style: "thin", color: { argb: "FFCCCCCC" } },
            left: { style: "thin", color: { argb: "FFCCCCCC" } },
            bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
            right: { style: "thin", color: { argb: "FFCCCCCC" } },
          };
        });
        headerRow.height = 20;
        headerRow.commit();

        // Data rows
        let rowIndex = headerRowIndex + 1;
        for (const r of rows) {
          const values = selectedColumns.map((k) => pickValue(r, k));
          const row = ws.getRow(rowIndex);

          values.forEach((v, i) => {
            const cell = row.getCell(i + 1);
            cell.value = v;
            cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
            cell.border = {
              top: { style: "thin", color: { argb: "FFF0F0F0" } },
              left: { style: "thin", color: { argb: "FFF0F0F0" } },
              bottom: { style: "thin", color: { argb: "FFF0F0F0" } },
              right: { style: "thin", color: { argb: "FFF0F0F0" } },
            };
          });

          // Zebra striping
          if ((rowIndex - (headerRowIndex + 1)) % 2 === 1) {
            row.eachCell((cell) => {
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAFA" } };
            });
          }

          row.commit();
          rowIndex++;
        }

        // AutoFilter
        ws.autoFilter = {
          from: { row: headerRowIndex, column: 1 },
          to: { row: headerRowIndex, column: headers.length },
        };

        // Column widths (scan a portion for speed)
        ws.columns = selectedColumns.map((k, i) => {
          let maxLen = String(headers[i] ?? "").length;
          const scan = Math.min(rows.length, 300);
          for (let j = 0; j < scan; j++) {
            const s = pickValue(rows[j], k);
            maxLen = Math.max(maxLen, String(s ?? "").length);
          }
          return { width: clamp(maxLen + 2, 12, 60) };
        });

        const out = await wb.xlsx.writeBuffer();
        saveAs(
          new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
          `${filenameBase}.xlsx`
        );

        return true;
      } catch (e: any) {
        setExportError(e?.message || "Error exportando");
        return false;
      } finally {
        setExportLoading(false);
      }
    },
    []
  );

  return { exportLoading, exportError, setExportError, onExportWithFilters };
}
