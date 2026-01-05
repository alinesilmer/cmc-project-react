// src/app/lib/medicosExport.ts
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import type { FilterSelection } from "../../types/filters";

export const FIELD_MAP: Record<string, string> = {
  nombre: "NOMBRE",
  nombre_: "nombre_",
  apellido: "apellido",
  sexo: "SEXO",
  documento: "DOCUMENTO",
  cuit: "CUIT",
  fecha_nac: "FECHA_NAC",
  existe: "EXISTE",
  provincia: "PROVINCIA",
  localidad: "localidad",
  codigo_postal: "CODIGO_POSTAL",
  domicilio_particular: "DOMICILIO_PARTICULAR",
  tele_particular: "TELE_PARTICULAR",
  celular_particular: "CELULAR_PARTICULAR",
  mail_particular: "MAIL_PARTICULAR",
  nro_socio: "NRO_SOCIO",
  categoria: "categoria",
  titulo: "titulo",
  matricula_prov: "MATRICULA_PROV",
  matricula_nac: "MATRICULA_NAC",
  fecha_recibido: "FECHA_RECIBIDO",
  fecha_matricula: "FECHA_MATRICULA",
  domicilio_consulta: "DOMICILIO_CONSULTA",
  telefono_consulta: "TELEFONO_CONSULTA",
  condicion_impositiva: "condicion_impositiva",
  anssal: "ANSSAL",
  cobertura: "COBERTURA",
  vencimiento_anssal: "VENCIMIENTO_ANSSAL",
  malapraxis: "MALAPRAXIS",
  vencimiento_malapraxis: "VENCIMIENTO_MALAPRAXIS",
  vencimiento_cobertura: "VENCIMIENTO_COBERTURA",
  cbu: "cbu",
  observacion: "OBSERVACION",
};

export const HEADER_LABELS: Record<string, string> = {
  apellido: "Apellido",
  nombre_: "Nombre",
  sexo: "Sexo",
  documento: "DNI",
  cuit: "CUIT",
  fecha_nac: "Fecha de Nacimiento",
  existe: "Estado",
  provincia: "Provincia",
  localidad: "Localidad",
  codigo_postal: "Código Postal",
  domicilio_particular: "Domicilio Particular",
  tele_particular: "Teléfono",
  celular_particular: "Celular",
  mail_particular: "Email",
  nro_socio: "N° de Socio",
  categoria: "Categoría",
  titulo: "Título",
  matricula_prov: "Matrícula Provincial",
  matricula_nac: "Matrícula Nacional",
  fecha_recibido: "Fecha de Recibido",
  fecha_matricula: "Fecha de Matrícula",
  domicilio_consulta: "Domicilio Consultorio",
  telefono_consulta: "Teléfono Consultorio",
  condicion_impositiva: "Condición Impositiva",
  anssal: "ANSSAL",
  cobertura: "Cobertura",
  vencimiento_anssal: "Vencimiento ANSSAL",
  malapraxis: "Mala Praxis",
  vencimiento_malapraxis: "Vencimiento Mala Praxis",
  vencimiento_cobertura: "Vencimiento Cobertura",
  cbu: "CBU",
  observacion: "Observación",
};

export function defaultPretty(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bCuit\b/, "CUIT")
    .replace(/\bCbu\b/, "CBU")
    .replace(/\bAnssal\b/, "ANSSAL");
}

export function labelFor(key: string) {
  return HEADER_LABELS[key] ?? defaultPretty(key);
}

export function safeText(v: any) {
  if (v === null || typeof v === "undefined") return "";
  return String(v).trim();
}

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function parseDateAny(v: any): Date | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s || s.startsWith("0000")) return null;
  const iso = s.length >= 10 ? s.slice(0, 10) : s;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : startOfDay(d);
}

export function formatDateES(v: any) {
  if (!v) return "";
  const s = String(v).trim();
  if (s === "1900-01-01" || s.startsWith("0000-00-00")) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function getValue(row: any, key: string) {
  if (!row) return "";
  if (key in row) return row[key];

  const upper = key.toUpperCase();
  if (upper in row) return row[upper];
  const lower = key.toLowerCase();
  if (lower in row) return row[lower];

  const mapped = FIELD_MAP[key];
  if (mapped) {
    if (mapped in row) return row[mapped];
    const mappedUpper = mapped.toUpperCase();
    if (mappedUpper in row) return row[mappedUpper];
    const mappedLower = mapped.toLowerCase();
    if (mappedLower in row) return row[mappedLower];
  }
  return "";
}

export function normalizeBool(v: any): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const t = v.trim().toUpperCase();
    return ["1", "S", "SI", "TRUE", "T", "Y", "YES"].includes(t);
  }
  return false;
}

export function isActiveRow(row: any): boolean {
  if (typeof row?.activo !== "undefined") return Boolean(Number(row.activo));
  const ex = (getValue(row, "existe") ?? "").toString().trim().toUpperCase();
  return ex === "S";
}

export function normalizeAdherente(row: any): boolean | null {
  const raw =
    getValue(row, "adherente") ??
    getValue(row, "ES_ADHERENTE") ??
    getValue(row, "es_adherente");
  if (raw === null || typeof raw === "undefined" || raw === "") return null;
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number") return Boolean(raw);
  if (typeof raw === "string") {
    const t = raw.trim().toUpperCase();
    if (["1", "S", "SI", "TRUE"].includes(t)) return true;
    if (["0", "N", "NO", "FALSE"].includes(t)) return false;
  }
  return null;
}

export function isEmptyLike(v: any) {
  if (v === null || typeof v === "undefined") return true;
  const s = String(v).trim();
  return s === "" || s === "0" || s.toUpperCase() === "NULL";
}

export function includesCI(hay: any, needle: string) {
  const a = String(hay ?? "").toLowerCase();
  const b = String(needle ?? "").toLowerCase();
  return b ? a.includes(b) : true;
}

export function buildQS(
  params: Record<string, string | number | undefined | null>
) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    const s = String(v).trim();
    if (s !== "") sp.set(k, s);
  });
  return sp.toString();
}

export function mapUIToQuery(f: FilterSelection) {
  const estado =
    f.otros.estado === "activo"
      ? "activos"
      : f.otros.estado === "inactivo"
      ? "inactivos"
      : undefined;

  return {
    estado,
    sexo: f.otros.sexo || undefined,
    provincia: f.otros.provincia || undefined,
    localidad: f.otros.localidad || undefined,
    categoria: f.otros.categoria || undefined,
    condicion_impositiva: f.otros.condicionImpositiva || undefined,
    fecha_ingreso_desde: f.otros.fechaIngresoDesde || undefined,
    fecha_ingreso_hasta: f.otros.fechaIngresoHasta || undefined,

    malapraxis_vencida: f.vencimientos.malapraxisVencida ? 1 : undefined,
    malapraxis_por_vencer: f.vencimientos.malapraxisPorVencer ? 1 : undefined,
    anssal_vencido: f.vencimientos.anssalVencido ? 1 : undefined,
    anssal_por_vencer: f.vencimientos.anssalPorVencer ? 1 : undefined,
    cobertura_vencida: f.vencimientos.coberturaVencida ? 1 : undefined,
    cobertura_por_vencer: f.vencimientos.coberturaPorVencer ? 1 : undefined,

    por_vencer_dias: f.vencimientos.dias || undefined,
    vencimientos_desde: f.vencimientos.fechaDesde || undefined,
    vencimientos_hasta: f.vencimientos.fechaHasta || undefined,

    skip: 0,
  };
}

// export async function exportToExcelBW(args: {
//   filename: string;
//   title: string;
//   subtitle?: string;
//   columns: Array<{ key: string; header: string }>;
//   rows: any[];
//   logoFile?: File | null;
// }) {
//   const { filename, title, subtitle, columns, rows, logoFile } = args;

//   const wb = new ExcelJS.Workbook();
//   wb.creator = "Colegio Médico de Corrientes";
//   wb.created = new Date();

//   const ws = wb.addWorksheet("Export", {
//     views: [{ state: "frozen", ySplit: 7 }],
//     pageSetup: {
//       orientation: "landscape",
//       fitToPage: true,
//       fitToWidth: 1,
//       fitToHeight: 0,
//     },
//   });

//   const colCount = Math.max(1, columns.length);
//   const logoCols = colCount >= 8 ? 3 : colCount >= 5 ? 2 : 1;

//   if (logoFile) {
//     try {
//       const arrayBuffer = await logoFile.arrayBuffer();
//       const ext = logoFile.name.split(".").pop()?.toLowerCase() || "png";

//       const imageId = wb.addImage({
//         buffer: arrayBuffer,
//         extension: ext as any,
//       });
//       ws.addImage(imageId, {
//         tl: { col: 0.2, row: 0.2 },
//         ext: { width: 120, height: 120 },
//       });
//     } catch (err) {
//       console.error("Error loading logo:", err);
//     }
//   }

//   ws.mergeCells(1, 1, 4, logoCols);
//   ws.getCell(1, 1).alignment = { horizontal: "center", vertical: "middle" };

//   ws.mergeCells(1, logoCols + 1, 2, colCount);
//   const mainTitleCell = ws.getCell(1, logoCols + 1);
//   mainTitleCell.value = "Colegio Médico de Corrientes";
//   mainTitleCell.font = { bold: true, size: 18, color: { argb: "FF0B4F8A" } };
//   mainTitleCell.alignment = { horizontal: "center", vertical: "middle" };

//   ws.mergeCells(3, logoCols + 1, 3, colCount);
//   const subtitleCell = ws.getCell(3, logoCols + 1);
//   subtitleCell.value = title;
//   subtitleCell.font = { bold: true, size: 14, color: { argb: "FF333333" } };
//   subtitleCell.alignment = { horizontal: "center", vertical: "middle" };

//   ws.mergeCells(4, logoCols + 1, 4, colCount);
//   const metaCell = ws.getCell(4, logoCols + 1);
//   const meta = `Generado: ${new Date().toLocaleString("es-AR", {
//     day: "2-digit",
//     month: "2-digit",
//     year: "numeric",
//     hour: "2-digit",
//     minute: "2-digit",
//   })}${subtitle ? ` · ${subtitle}` : ""}`;
//   metaCell.value = meta;
//   metaCell.font = { size: 10, color: { argb: "FF666666" }, italic: true };
//   metaCell.alignment = { horizontal: "center", vertical: "middle" };

//   ws.getRow(1).height = 32;
//   ws.getRow(2).height = 20;
//   ws.getRow(3).height = 22;
//   ws.getRow(4).height = 18;
//   ws.getRow(5).height = 8;

//   const headerRowIdx = 6;
//   const headerRow = ws.getRow(headerRowIdx);
//   headerRow.values = ["", ...columns.map((c) => c.header)];
//   headerRow.height = 24;

//   for (let c = 1; c <= colCount; c++) {
//     const cell = ws.getCell(headerRowIdx, c);
//     cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
//     cell.alignment = {
//       horizontal: "center",
//       vertical: "middle",
//       wrapText: true,
//     };
//     cell.fill = {
//       type: "pattern",
//       pattern: "solid",
//       fgColor: { argb: "FF0B4F8A" },
//     };
//     cell.border = {
//       top: { style: "thin", color: { argb: "FF999999" } },
//       left: { style: "thin", color: { argb: "FF999999" } },
//       bottom: { style: "thin", color: { argb: "FF999999" } },
//       right: { style: "thin", color: { argb: "FF999999" } },
//     };
//   }

//   const dataStart = 7;
//   const normCellValue = (row: any, key: string) => {
//     const v = getValue(row, key);
//     if (key.startsWith("vencimiento_") || key.startsWith("fecha_"))
//       return formatDateES(v);
//     if (key === "malapraxis") return normalizeBool(v) ? "SI" : "NO";
//     return safeText(v);
//   };

//   rows.forEach((r, i) => {
//     const excelRowIdx = dataStart + i;
//     const vals = columns.map((c) => normCellValue(r, c.key));
//     ws.getRow(excelRowIdx).values = ["", ...vals];
//     ws.getRow(excelRowIdx).height = 20;

//     const zebra = i % 2 === 0 ? "FFFFFFFF" : "FFF8F9FA";
//     for (let c = 1; c <= colCount; c++) {
//       const cell = ws.getCell(excelRowIdx, c);
//       cell.font = { size: 10, color: { argb: "FF333333" } };
//       cell.alignment = {
//         horizontal: "left",
//         vertical: "middle",
//         wrapText: true,
//       };
//       cell.fill = {
//         type: "pattern",
//         pattern: "solid",
//         fgColor: { argb: zebra },
//       };
//       cell.border = {
//         top: { style: "thin", color: { argb: "FFE0E0E0" } },
//         left: { style: "thin", color: { argb: "FFE0E0E0" } },
//         bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
//         right: { style: "thin", color: { argb: "FFE0E0E0" } },
//       };
//     }
//   });

//   columns.forEach((col, idx) => {
//     const c = idx + 1;
//     const headerLen = (col.header ?? "").length;
//     let maxLen = headerLen;
//     for (let i = 0; i < Math.min(rows.length, 500); i++) {
//       const v = safeText(normCellValue(rows[i], col.key));
//       maxLen = Math.max(maxLen, v.length);
//     }
//     ws.getColumn(c).width = Math.min(50, Math.max(12, maxLen + 3));
//   });

//   ws.autoFilter = {
//     from: { row: headerRowIdx, column: 1 },
//     to: { row: headerRowIdx, column: colCount },
//   };

//   const buf = await wb.xlsx.writeBuffer();
//   saveAs(
//     new Blob([buf], {
//       type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
//     }),
//     filename
//   );
// }

export async function exportToExcelBW(args: {
  filename: string;
  title: string;
  subtitle?: string;
  columns: Array<{ key: string; header: string }>;
  rows: any[];
  logoFile?: File | null;
}) {
  const { filename, title, subtitle, columns, rows, logoFile } = args;

  const wb = new ExcelJS.Workbook();
  wb.creator = "Colegio Médico de Corrientes";
  wb.created = new Date();

  const ws = wb.addWorksheet("Export", {
    views: [{ state: "frozen", ySplit: 6 }], // congela hasta el header (fila 6)
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  const colCount = Math.max(1, columns.length);
  const logoCols = colCount >= 8 ? 3 : colCount >= 5 ? 2 : 1;

  // Logo opcional
  if (logoFile) {
    try {
      const arrayBuffer = await logoFile.arrayBuffer();
      const ext = logoFile.name.split(".").pop()?.toLowerCase() || "png";
      const imageId = wb.addImage({
        buffer: arrayBuffer,
        extension: ext as any,
      });
      ws.addImage(imageId, {
        tl: { col: 0.2, row: 0.2 },
        ext: { width: 120, height: 120 },
      });
    } catch (err) {
      console.error("Error loading logo:", err);
    }
  }

  // Encabezado superior
  ws.mergeCells(1, 1, 4, logoCols);
  ws.getCell(1, 1).alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells(1, logoCols + 1, 2, colCount);
  const mainTitleCell = ws.getCell(1, logoCols + 1);
  mainTitleCell.value = "Colegio Médico de Corrientes";
  mainTitleCell.font = { bold: true, size: 18, color: { argb: "FF0B4F8A" } };
  mainTitleCell.alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells(3, logoCols + 1, 3, colCount);
  const subtitleCell = ws.getCell(3, logoCols + 1);
  subtitleCell.value = title;
  subtitleCell.font = { bold: true, size: 14, color: { argb: "FF333333" } };
  subtitleCell.alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells(4, logoCols + 1, 4, colCount);
  const metaCell = ws.getCell(4, logoCols + 1);
  const meta = `Generado: ${new Date().toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}${subtitle ? ` · ${subtitle}` : ""}`;
  metaCell.value = meta;
  metaCell.font = { size: 10, color: { argb: "FF666666" }, italic: true };
  metaCell.alignment = { horizontal: "center", vertical: "middle" };

  ws.getRow(1).height = 32;
  ws.getRow(2).height = 20;
  ws.getRow(3).height = 22;
  ws.getRow(4).height = 18;
  ws.getRow(5).height = 8;

  // Fila de encabezados (sin columna vacía al inicio)
  const headerRowIdx = 6;
  const headerRow = ws.getRow(headerRowIdx);
  headerRow.values = columns.map((c) => c.header);
  headerRow.height = 24;

  for (let c = 1; c <= colCount; c++) {
    const cell = ws.getCell(headerRowIdx, c);
    cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0B4F8A" },
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF999999" } },
      left: { style: "thin", color: { argb: "FF999999" } },
      bottom: { style: "thin", color: { argb: "FF999999" } },
      right: { style: "thin", color: { argb: "FF999999" } },
    };
  }

  // Datos
  const dataStart = headerRowIdx + 1;

  const normCellValue = (row: any, key: string) => {
    const v = getValue(row, key);
    if (key.startsWith("vencimiento_") || key.startsWith("fecha_"))
      return formatDateES(v);
    if (key === "malapraxis") return normalizeBool(v) ? "SI" : "NO";
    return safeText(v);
  };

  rows.forEach((r, i) => {
    const excelRowIdx = dataStart + i;
    const vals = columns.map((c) => normCellValue(r, c.key));
    ws.getRow(excelRowIdx).values = vals; // sin columna vacía
    ws.getRow(excelRowIdx).height = 20;

    const zebra = i % 2 === 0 ? "FFFFFFFF" : "FFF8F9FA";
    for (let c = 1; c <= colCount; c++) {
      const cell = ws.getCell(excelRowIdx, c);
      cell.font = { size: 10, color: { argb: "FF333333" } };
      cell.alignment = {
        horizontal: "left",
        vertical: "middle",
        wrapText: true,
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: zebra },
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE0E0E0" } },
        left: { style: "thin", color: { argb: "FFE0E0E0" } },
        bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
        right: { style: "thin", color: { argb: "FFE0E0E0" } },
      };
    }
  });

  // Auto ancho por columna (en base a header + todas las filas)
  for (let idx = 0; idx < columns.length; idx++) {
    const key = columns[idx].key;
    const headerLen = (columns[idx].header ?? "").length;
    let maxLen = headerLen;

    for (let i = 0; i < rows.length; i++) {
      const val = safeText(normCellValue(rows[i], key));
      maxLen = Math.max(maxLen, val.length);
    }

    // heurística razonable: 1 char ~ 1 unidad de ancho. +2 de margen.
    ws.getColumn(idx + 1).width = Math.min(60, Math.max(10, maxLen + 2));
  }

  ws.autoFilter = {
    from: { row: headerRowIdx, column: 1 },
    to: { row: headerRowIdx, column: colCount },
  };

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename
  );
}

export function toCSV(
  rows: any[],
  columns: Array<{ key: string; header: string }>
) {
  const headers = columns.map((c) => c.header);
  const escapeCSV = (s: string) => {
    const needs = /[",\n\r;]/.test(s);
    const normalized = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const quoted = normalized.replace(/"/g, '""');
    return needs ? `"${quoted}"` : quoted;
  };
  const lines = [
    headers.join(";"),
    ...rows.map((r) =>
      columns.map((c) => escapeCSV(String(getValue(r, c.key) ?? ""))).join(";")
    ),
  ];
  return "\uFEFF" + lines.join("\n");
}

export function downloadBlob(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
