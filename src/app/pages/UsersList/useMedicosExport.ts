// src/app/pages/UsersList/useMedicosExport.ts
"use client";

import { useCallback, useState } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

import type { FilterSelection, MedicoRow } from "./medicosExport";
import { DEFAULT_HEADERS, buildQS, mapUIToQuery, filterRowsForExport, getCellValue } from "./medicosExport";
import { getJSON } from "../../lib/http";

type ExportFormat = "xlsx" | "csv";

function readToken(): string | null {
  const keys = ["token", "access_token", "auth_token", "jwt", "cmc_token"];
  for (const k of keys) {
    const v = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (v && v.trim()) return v.trim();
  }
  return null;
}

async function fetchJSONWithToken<T>(url: string): Promise<T> {
  const token = readToken();

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers["X-Token"] = token; // in case backend expects it
  }

  const res = await fetch(url, {
    method: "GET",
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Export request failed (${res.status}): ${text || res.statusText}`);
  }

  return (await res.json()) as T;
}

function safeId(row: any): string {
  const id = row?.id ?? row?.ID ?? row?.nro_socio ?? row?.NRO_SOCIO ?? "";
  return String(id ?? "");
}

function csvEscape(v: any): string {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return await file.arrayBuffer();
}

function guessImageExtension(mime: string): "png" | "jpeg" {
  const t = (mime || "").toLowerCase();
  if (t.includes("jpeg") || t.includes("jpg")) return "jpeg";
  return "png";
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function humanDateTime(): string {
  const d = new Date();
  // keep it stable and simple
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

function buildFiltersSummary(filters: FilterSelection): string[] {
  const lines: string[] = [];
  const o = filters.otros;
  const v = filters.vencimientos;

  const push = (label: string, value?: any) => {
    const s = String(value ?? "").trim();
    if (!s) return;
    lines.push(`${label}: ${s}`);
  };

  // Otros
  push("Estado", o.estado);
  push("Sexo", o.sexo);
  push("Adherente", o.adherente);
  push("Provincia", o.provincia);
  push("Categoría", o.categoria);
  push("Condición Impositiva", o.condicionImpositiva);
  push("Especialidad", o.especialidad);
  if (o.fechaIngresoDesde || o.fechaIngresoHasta) {
    lines.push(`Fecha ingreso: ${o.fechaIngresoDesde || "—"} → ${o.fechaIngresoHasta || "—"}`);
  }
  if ((o as any).conMalapraxis) lines.push("Con mala praxis: Sí");

  // Vencimientos flags
  const vflags: string[] = [];
  if (v.malapraxisVencida) vflags.push("Mala praxis vencida");
  if (v.malapraxisPorVencer) vflags.push("Mala praxis por vencer");
  if (v.anssalVencido) vflags.push("ANSSAL vencida");
  if (v.anssalPorVencer) vflags.push("ANSSAL por vencer");
  if (v.coberturaVencida) vflags.push("Cobertura vencida");
  if (v.coberturaPorVencer) vflags.push("Cobertura por vencer");
  if (vflags.length) lines.push(`Vencimientos: ${vflags.join(" · ")}`);

  // Window
  if (v.fechaDesde || v.fechaHasta || (v.dias && v.dias > 0)) {
    const window =
      v.fechaDesde || v.fechaHasta
        ? `Rango: ${v.fechaDesde || "—"} → ${v.fechaHasta || "—"}`
        : `Próximos días: ${v.dias}`;
    lines.push(`Ventana “por vencer”: ${window}`);
  }

  if (!lines.length) lines.push("Sin filtros (export completo).");
  return lines;
}

function applySheetDesign(ws: ExcelJS.Worksheet, headerRowIndex: number, colCount: number) {
  // Page / print
  ws.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9, // A4
    margins: {
      left: 0.35,
      right: 0.35,
      top: 0.6,
      bottom: 0.6,
      header: 0.3,
      footer: 0.3,
    },
  };

  // Freeze header row
  ws.views = [{ state: "frozen", ySplit: headerRowIndex }];

  // Auto filter on header row
  const lastColLetter = ws.getColumn(colCount).letter;
  ws.autoFilter = {
    from: { row: headerRowIndex, column: 1 },
    to: { row: headerRowIndex, column: colCount },
  };

  // Header row style
  const headerRow = ws.getRow(headerRowIndex);
  headerRow.height = 22;
  headerRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } }; // dark slate
    cell.border = {
      top: { style: "thin", color: { argb: "FF9CA3AF" } },
      left: { style: "thin", color: { argb: "FF9CA3AF" } },
      bottom: { style: "thin", color: { argb: "FF9CA3AF" } },
      right: { style: "thin", color: { argb: "FF9CA3AF" } },
    };
  });
}

function applyZebraAndBorders(
  ws: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  colCount: number
) {
  for (let r = startRow; r <= endRow; r++) {
    const row = ws.getRow(r);
    row.height = 18;

    const isAlt = (r - startRow) % 2 === 1;
    for (let c = 1; c <= colCount; c++) {
      const cell = row.getCell(c);

      cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
      };

      if (isAlt) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } }; // very light
      }
    }
  }
}

function setColumnFormats(ws: ExcelJS.Worksheet, selectedColumns: string[]) {
  // Try to format date-like columns nicely.
  // We don’t force conversion if your value is text, but if it is Date/ISO it’ll render well.
  const dateKeys = new Set(["fecha_ingreso", "anssal", "malapraxis", "cobertura", "vencimiento_anssal", "vencimiento_malapraxis", "vencimiento_cobertura"]);
  selectedColumns.forEach((k, idx) => {
    if (dateKeys.has(k)) {
      const col = ws.getColumn(idx + 1);
      col.numFmt = "dd/mm/yyyy";
      col.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    }
    if (k === "documento" || k.includes("matricula") || k.includes("nro_socio")) {
      // Keep as text to avoid scientific notation / losing leading zeros
      const col = ws.getColumn(idx + 1);
      col.numFmt = "@";
    }
  });
}

function autoWidth(ws: ExcelJS.Worksheet) {
  ws.columns = ws.columns.map((col) => {
    let maxLen = 10;
    col.eachCell?.({ includeEmpty: true }, (cell) => {
      const v = cell.value;
      const s = v == null ? "" : String(v);
      if (s.length > maxLen) maxLen = s.length;
    });
    col.width = Math.min(Math.max(maxLen + 2, 12), 60);
    return col;
  });
}

export function useMedicosExport() {
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const onExportWithFilters = useCallback(
    async (format: ExportFormat, filters: FilterSelection, logoFile: File | null): Promise<boolean> => {
      setExportLoading(true);
      setExportError(null);

      try {
        const selectedColumns = (filters.columns ?? []).slice();
        if (!selectedColumns.length) {
          setExportError("Seleccioná al menos una columna");
          return false;
        }

        // Fetch all rows (paged)
        const pageSize = 2000;
        const maxPages = 40;

        const queryParams = mapUIToQuery(filters);
        let all: MedicoRow[] = [];

        let offset = 0;
        let lastPageFirstId = "";
        let lastPageLastId = "";

        for (let page = 0; page < maxPages; page++) {
          const qs = buildQS({ ...queryParams, limit: pageSize, offset });
          const url = `/api/medicos/all?${qs}`;

          let payload: any;
          try {
            payload = await getJSON<any>(url);
          } catch (e: any) {
            const msg = String(e?.message || "");
            if (msg.includes("401") || msg.toLowerCase().includes("token") || msg.toLowerCase().includes("falta")) {
              payload = await fetchJSONWithToken<any>(url);
            } else {
              throw e;
            }
          }

          const rows: MedicoRow[] = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.items)
              ? payload.items
              : Array.isArray(payload?.data)
                ? payload.data
                : [];

          if (!rows.length) break;

          const firstId = safeId(rows[0]);
          const lastId = safeId(rows[rows.length - 1]);

          if (page > 0 && firstId === lastPageFirstId && lastId === lastPageLastId) break;

          lastPageFirstId = firstId;
          lastPageLastId = lastId;

          all = all.concat(rows);

          if (rows.length < pageSize) break;
          offset += pageSize;
        }

        // Apply client-side filters too
        const filtered = filterRowsForExport(all, filters);

        const dateStr = todayISO();
        const filenameBase = `Medicos_${dateStr}`;

        if (format === "csv") {
          const headers = selectedColumns.map((k) => DEFAULT_HEADERS[k as keyof typeof DEFAULT_HEADERS] ?? String(k));
          const lines: string[] = [];
          lines.push(headers.map(csvEscape).join(","));

          for (const r of filtered) {
            const line = selectedColumns.map((k) => csvEscape(getCellValue(r, k as keyof typeof DEFAULT_HEADERS)));
            lines.push(line.join(","));
          }

          const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
          saveAs(blob, `${filenameBase}.csv`);
          return true;
        }

        // ==========================
        // XLSX (PRETTY)
        // ==========================
        const wb = new ExcelJS.Workbook();
        wb.creator = "CMC";
        wb.created = new Date();

        const ws = wb.addWorksheet("Medicos");

        // Build nice header block (logo + title + meta + filters)
        const colCount = selectedColumns.length;

        // Reserve some header rows
        // Row 1: title (merged)
        // Row 2: subtitle/meta
        // Row 3-5: filters summary
        // Row 6: spacer
        // Row 7: table header
        let headerRowIndex = 7;

        // Title
        ws.getRow(1).height = 26;
        ws.getCell(1, 1).value = "Listado de Médicos";
        ws.getCell(1, 1).font = { bold: true, size: 18 };
        ws.getCell(1, 1).alignment = { vertical: "middle", horizontal: "left" };
        ws.mergeCells(1, 1, 1, Math.max(6, colCount));

        // Meta
        ws.getRow(2).height = 18;
        ws.getCell(2, 1).value = `Generado: ${humanDateTime()}  ·  Registros: ${filtered.length}`;
        ws.getCell(2, 1).font = { size: 11, color: { argb: "FF374151" } };
        ws.getCell(2, 1).alignment = { vertical: "middle", horizontal: "left" };
        ws.mergeCells(2, 1, 2, Math.max(6, colCount));

        // Filters summary (up to 3 lines, rest grouped)
        const summary = buildFiltersSummary(filters);
        const maxLines = 3;
        const shown = summary.slice(0, maxLines);
        const rest = summary.slice(maxLines);

        const summaryLines = rest.length
          ? [...shown, `+ ${rest.length} filtro(s) más...`]
          : shown;

        for (let i = 0; i < 3; i++) {
          const rowN = 3 + i;
          ws.getRow(rowN).height = 16;
          ws.getCell(rowN, 1).value = summaryLines[i] ?? "";
          ws.getCell(rowN, 1).font = { size: 10, color: { argb: "FF4B5563" } };
          ws.getCell(rowN, 1).alignment = { vertical: "middle", horizontal: "left", wrapText: true };
          ws.mergeCells(rowN, 1, rowN, Math.max(6, colCount));
        }

        // Spacer
        ws.getRow(6).height = 8;
        ws.mergeCells(6, 1, 6, Math.max(6, colCount));

        // Logo
        if (logoFile) {
          try {
            const buf = await readFileAsArrayBuffer(logoFile);
            const ext = guessImageExtension(logoFile.type);

            const imgId = wb.addImage({ buffer: buf, extension: ext });

            // Place logo at top-right-ish without breaking merged cells
            // Put it around columns (Math.max(6,colCount)-3)
            const anchorCol = Math.max(1, Math.max(6, colCount) - 3);
            ws.addImage(imgId, {
              tl: { col: anchorCol - 1, row: 0 }, // 0-indexed internally
              ext: { width: 170, height: 55 },
            });
          } catch {
            // ignore logo errors
          }
        }

        // Table header row
        const headers = selectedColumns.map((k) => DEFAULT_HEADERS[k as keyof typeof DEFAULT_HEADERS] ?? String(k));
        ws.getRow(headerRowIndex).values = headers as any;

        // Data rows
        let rIndex = headerRowIndex + 1;
        for (const row of filtered) {
          ws.getRow(rIndex).values = selectedColumns.map((k) => getCellValue(row, k as keyof typeof DEFAULT_HEADERS)) as any;
          rIndex++;
        }

        // Styling
        applySheetDesign(ws, headerRowIndex, colCount);
        setColumnFormats(ws, selectedColumns);

        const dataStart = headerRowIndex + 1;
        const dataEnd = Math.max(dataStart, rIndex - 1);
        if (dataEnd >= dataStart) {
          applyZebraAndBorders(ws, dataStart, dataEnd, colCount);
        }

        // Slight border box around the header block
        for (let rr = 1; rr <= 5; rr++) {
          const row = ws.getRow(rr);
          for (let cc = 1; cc <= Math.max(6, colCount); cc++) {
            const cell = row.getCell(cc);
            cell.border = {
              bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
            };
          }
        }

        // Column widths
        autoWidth(ws);

        // Export
        const out = await wb.xlsx.writeBuffer();
        saveAs(
          new Blob([out], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }),
          `${filenameBase}.xlsx`
        );

        return true;
      } catch (e: any) {
        const msg = e?.message || "Error desconocido exportando";
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
