"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import styles from "./UsersList.module.scss";
import { getJSON } from "../../lib/http";
import Button from "../../components/atoms/Button/Button";
import BackButton from "../../components/atoms/BackButton/BackButton";
import Modal from "../../components/atoms/Modal/Modal";
import FilterModal from "../../components/molecules/FilterModal/FilterModal";

import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const FIELD_MAP: Record<string, string> = {
  name: "NOMBRE",
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

const HEADER_LABELS: Record<string, string> = {
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
  mail_particular: "Email", // 👈 aquí el caso que pediste
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

// Título por defecto si no existe en HEADER_LABELS ni en AVAILABLE_COLUMNS
function defaultPretty(key: string) {
  // snake_case -> "Snake Case"
  const pretty = key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  // correcciones de siglas comunes
  return pretty
    .replace(/\bCuit\b/, "CUIT")
    .replace(/\bCbu\b/, "CBU")
    .replace(/\bAnssal\b/, "ANSSAL");
}

// Busca primero en el listado del modal, luego en HEADER_LABELS y por último genera uno bonito
function labelFor(key: string) {
  const fromAvailable = AVAILABLE_COLUMNS.find((c) => c.key === key)?.label;
  if (fromAvailable) return fromAvailable;
  if (HEADER_LABELS[key]) return HEADER_LABELS[key];
  return defaultPretty(key);
}

type MedicoRow = Record<string, any>;

function safeText(v: any) {
  if (v === null || typeof v === "undefined") return "";
  return String(v);
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function parseDateAny(v: any): Date | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s || s.startsWith("0000")) return null;

  const iso = s.length >= 10 ? s.slice(0, 10) : s;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : startOfDay(d);
}

function formatDateES(v: any) {
  const d = parseDateAny(v);
  if (!d) return "";
  return d.toLocaleDateString("es-AR");
}

function getValue(row: any, key: string) {
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

function normalizeBool(v: any): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const t = v.trim().toUpperCase();
    return ["1", "S", "SI", "TRUE", "T", "Y", "YES"].includes(t);
  }
  return false;
}

function isActiveRow(row: any): boolean {
  if (typeof row?.activo !== "undefined") return Boolean(Number(row.activo));
  const ex = (getValue(row, "existe") ?? "").toString().trim().toUpperCase();
  return ex === "S";
}

function normalizeAdherente(row: any): boolean | null {
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

function isEmptyLike(v: any) {
  if (v === null || typeof v === "undefined") return true;
  const s = String(v).trim();
  return s === "" || s === "0" || s.toUpperCase() === "NULL";
}

function includesCI(hay: any, needle: string) {
  const a = String(hay ?? "").toLowerCase();
  const b = String(needle ?? "").toLowerCase();
  return b ? a.includes(b) : true;
}

async function exportToExcelBW(args: {
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
    views: [{ state: "frozen", ySplit: 7 }],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  const colCount = Math.max(1, columns.length);
  const logoCols = colCount >= 8 ? 3 : colCount >= 5 ? 2 : 1;

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

  ws.mergeCells(1, 1, 4, logoCols);
  const logoCell = ws.getCell(1, 1);
  logoCell.alignment = { horizontal: "center", vertical: "middle" };

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

  const headerRowIdx = 6;
  const headerRow = ws.getRow(headerRowIdx);
  headerRow.values = ["", ...columns.map((c) => c.header)];
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

  const dataStart = 7;

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
    ws.getRow(excelRowIdx).values = ["", ...vals];
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

  columns.forEach((col, idx) => {
    const c = idx + 1;
    const headerLen = (col.header ?? "").length;
    let maxLen = headerLen;

    for (let i = 0; i < Math.min(rows.length, 500); i++) {
      const v = safeText(normCellValue(rows[i], col.key));
      maxLen = Math.max(maxLen, v.length);
    }

    ws.getColumn(c).width = Math.min(50, Math.max(12, maxLen + 3));
  });

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

function downloadBlob(filename: string, mime: string, content: string) {
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

function toCSV(rows: any[], columns: Array<{ key: string; header: string }>) {
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

type ExportGroupId =
  | "vencimientos"
  | "contactabilidad"
  | "calidad"
  | "administrativos";
type ExportPresetId =
  | "malapraxis_vencida"
  | "malapraxis_por_vencer"
  | "anssal_vencido"
  | "anssal_por_vencer"
  | "cobertura_vencida"
  | "cobertura_por_vencer"
  | "contactables"
  | "datos_incompletos"
  | "sin_cuit_o_cbu"
  | "altas_recientes"
  | "por_zona";

type PresetParams = {
  q?: string;
  status?: "" | "activo" | "inactivo";
  adherente?: "" | "si" | "no";
  provincia?: string;
  localidad?: string;
  dias?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  logoUrl?: string;
};

const GROUPS: Array<{ id: ExportGroupId; title: string }> = [
  { id: "vencimientos", title: "Vencimientos / Cumplimiento" },
  { id: "contactabilidad", title: "Contactabilidad" },
  { id: "calidad", title: "Calidad de padrón" },
  { id: "administrativos", title: "Administrativos / Matrícula" },
];

const PRESETS: Record<
  ExportPresetId,
  { group: ExportGroupId; title: string; columns: string[] }
> = {
  malapraxis_vencida: {
    group: "vencimientos",
    title: "Malapraxis vencida",
    columns: [
      "apellido",
      "nombre_",
      "documento",
      "matricula_prov",
      "mail_particular",
      "celular_particular",
      "vencimiento_malapraxis",
    ],
  },
  malapraxis_por_vencer: {
    group: "vencimientos",
    title: "Malapraxis por vencer",
    columns: [
      "apellido",
      "nombre_",
      "documento",
      "matricula_prov",
      "mail_particular",
      "celular_particular",
      "vencimiento_malapraxis",
    ],
  },
  anssal_vencido: {
    group: "vencimientos",
    title: "ANSSAL vencido",
    columns: [
      "apellido",
      "nombre_",
      "documento",
      "matricula_prov",
      "anssal",
      "vencimiento_anssal",
      "mail_particular",
      "celular_particular",
    ],
  },
  anssal_por_vencer: {
    group: "vencimientos",
    title: "ANSSAL por vencer",
    columns: [
      "apellido",
      "nombre_",
      "documento",
      "matricula_prov",
      "anssal",
      "vencimiento_anssal",
      "mail_particular",
      "celular_particular",
    ],
  },
  cobertura_vencida: {
    group: "vencimientos",
    title: "Cobertura vencida",
    columns: [
      "apellido",
      "nombre_",
      "documento",
      "matricula_prov",
      "cobertura",
      "vencimiento_cobertura",
      "mail_particular",
      "celular_particular",
    ],
  },
  cobertura_por_vencer: {
    group: "vencimientos",
    title: "Cobertura por vencer",
    columns: [
      "apellido",
      "nombre_",
      "documento",
      "matricula_prov",
      "cobertura",
      "vencimiento_cobertura",
      "mail_particular",
      "celular_particular",
    ],
  },
  contactables: {
    group: "contactabilidad",
    title: "Contactables (mail o celular)",
    columns: [
      "apellido",
      "nombre_",
      "nro_socio",
      "mail_particular",
      "celular_particular",
      "provincia",
      "localidad",
    ],
  },
  datos_incompletos: {
    group: "calidad",
    title: "Datos críticos incompletos",
    columns: [
      "apellido",
      "nombre_",
      "documento",
      "provincia",
      "localidad",
      "observacion",
    ],
  },
  sin_cuit_o_cbu: {
    group: "calidad",
    title: "Sin CUIT o sin CBU",
    columns: [
      "apellido",
      "nombre_",
      "documento",
      "cuit",
      "cbu",
      "condicion_impositiva",
    ],
  },
  altas_recientes: {
    group: "administrativos",
    title: "Altas recientes (por fecha_matricula)",
    columns: [
      "apellido",
      "nombre_",
      "documento",
      "matricula_prov",
      "fecha_matricula",
      "categoria",
      "provincia",
      "localidad",
    ],
  },
  por_zona: {
    group: "administrativos",
    title: "Por zona (Provincia/Localidad)",
    columns: [
      "apellido",
      "nombre_",
      "documento",
      "matricula_prov",
      "mail_particular",
      "celular_particular",
      "provincia",
      "localidad",
      "domicilio_particular",
      "codigo_postal",
    ],
  },
};

function presetColumns(presetId: ExportPresetId) {
  return PRESETS[presetId].columns.map((k) => ({
    key: k,
    header: labelFor(k),
  }));
}

function applyExtraFilters(row: any, says: PresetParams) {
  const q = (says.q ?? "").trim();
  if (q) {
    const ok =
      includesCI(getValue(row, "apellido"), q) ||
      includesCI(getValue(row, "nombre_"), q) ||
      includesCI(getValue(row, "name"), q) ||
      includesCI(getValue(row, "mail_particular"), q) ||
      includesCI(getValue(row, "documento"), q) ||
      includesCI(getValue(row, "matricula_prov"), q) ||
      includesCI(getValue(row, "nro_socio"), q);
    if (!ok) return false;
  }

  if (says.status) {
    const st = isActiveRow(row) ? "activo" : "inactivo";
    if (st !== says.status) return false;
  }

  if (says.adherente) {
    const a = normalizeAdherente(row);
    if (says.adherente === "si" && a !== true) return false;
    if (says.adherente === "no" && a !== false) return false;
  }

  const prov = (says.provincia ?? "").trim();
  if (prov) {
    if (!includesCI(getValue(row, "provincia"), prov)) return false;
  }

  const loc = (says.localidad ?? "").trim();
  if (loc) {
    if (!includesCI(getValue(row, "localidad"), loc)) return false;
  }

  return true;
}

function baseFilterForPreset(
  presetId: ExportPresetId,
  row: any,
  params: PresetParams
) {
  const today = startOfDay(new Date());

  const hasCustomRange =
    Boolean(params.fechaDesde?.trim()) || Boolean(params.fechaHasta?.trim());
  const from = params.fechaDesde?.trim()
    ? startOfDay(new Date(params.fechaDesde))
    : today;
  const to = params.fechaHasta?.trim()
    ? endOfDay(new Date(params.fechaHasta))
    : endOfDay(addDays(today, Math.max(1, Number(params.dias ?? 30))));

  const dateBefore = (key: string, cutoff: Date) => {
    const d = parseDateAny(getValue(row, key));
    return d ? d.getTime() < cutoff.getTime() : false;
  };

  const dateBetween = (key: string, a: Date, b: Date) => {
    const d = parseDateAny(getValue(row, key));
    if (!d) return false;
    return d.getTime() >= a.getTime() && d.getTime() <= b.getTime();
  };

  switch (presetId) {
    case "malapraxis_vencida": {
      const mp = normalizeBool(getValue(row, "malapraxis"));
      const cutoff = params.fechaDesde?.trim() ? from : today;
      return mp && dateBefore("vencimiento_malapraxis", cutoff);
    }
    case "malapraxis_por_vencer": {
      const mp = normalizeBool(getValue(row, "malapraxis"));
      return (
        mp &&
        dateBetween(
          "vencimiento_malapraxis",
          hasCustomRange ? from : today,
          hasCustomRange ? to : to
        )
      );
    }
    case "anssal_vencido": {
      const cutoff = params.fechaDesde?.trim() ? from : today;
      return dateBefore("vencimiento_anssal", cutoff);
    }
    case "anssal_por_vencer": {
      return dateBetween(
        "vencimiento_anssal",
        hasCustomRange ? from : today,
        hasCustomRange ? to : to
      );
    }
    case "cobertura_vencida": {
      const cutoff = params.fechaDesde?.trim() ? from : today;
      return dateBefore("vencimiento_cobertura", cutoff);
    }
    case "cobertura_por_vencer": {
      return dateBetween(
        "vencimiento_cobertura",
        hasCustomRange ? from : today,
        hasCustomRange ? to : to
      );
    }
    case "contactables": {
      const mail = String(getValue(row, "mail_particular") ?? "").trim();
      const cel = String(getValue(row, "celular_particular") ?? "").trim();
      return Boolean(mail) || Boolean(cel);
    }
    case "datos_incompletos": {
      const missing =
        isEmptyLike(getValue(row, "documento")) ||
        isEmptyLike(getValue(row, "apellido")) ||
        isEmptyLike(getValue(row, "nombre_")) ||
        isEmptyLike(getValue(row, "provincia")) ||
        isEmptyLike(getValue(row, "localidad"));
      return missing;
    }
    case "sin_cuit_o_cbu": {
      return (
        isEmptyLike(getValue(row, "cuit")) || isEmptyLike(getValue(row, "cbu"))
      );
    }
    case "altas_recientes": {
      const a = params.fechaDesde?.trim() ? from : addDays(today, -30);
      const b = params.fechaHasta?.trim() ? to : endOfDay(today);
      return dateBetween("fecha_matricula", a, b);
    }
    case "por_zona":
      return true;
    default:
      return true;
  }
}

function sortForPreset(presetId: ExportPresetId, rows: any[]) {
  const dateKeyAsc = (key: string) => (a: any, b: any) => {
    const da = parseDateAny(getValue(a, key));
    const db = parseDateAny(getValue(b, key));
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da.getTime() - db.getTime();
  };

  const textAsc = (key: string) => (a: any, b: any) => {
    const aa = String(getValue(a, key) ?? "").toLowerCase();
    const bb = String(getValue(b, key) ?? "").toLowerCase();
    return aa.localeCompare(bb, "es");
  };

  switch (presetId) {
    case "malapraxis_vencida":
    case "malapraxis_por_vencer":
      return rows.sort(dateKeyAsc("vencimiento_malapraxis"));
    case "anssal_vencido":
    case "anssal_por_vencer":
      return rows.sort(dateKeyAsc("vencimiento_anssal"));
    case "cobertura_vencida":
    case "cobertura_por_vencer":
      return rows.sort(dateKeyAsc("vencimiento_cobertura"));
    case "altas_recientes":
      return rows.sort(dateKeyAsc("fecha_matricula"));
    default:
      return rows.sort(textAsc("apellido"));
  }
}

function toUserRow(m: any) {
  const status = isActiveRow(m) ? "activo" : "inactivo";
  const a = normalizeAdherente(m);
  const os = (m?.obra_social ?? m?.OBRA_SOCIAL ?? "").toString().trim();

  return {
    id: m?.ID ?? m?.id ?? m?.NRO_SOCIO ?? Math.random().toString(36).slice(2),
    nro_socio: m?.NRO_SOCIO ?? m?.nro_socio ?? null,
    name: m?.NOMBRE ?? m?.nombre ?? "—",
    email: m?.mail_particular ?? m?.email ?? "—",
    phone: m?.tele_particular ?? "—",
    joinDate: m?.fecha_ingreso ?? m?.joinDate ?? null,
    status,
    matriculaProv: m?.MATRICULA_PROV ?? m?.matricula_prov ?? "—",
    adherente: a,
    obraSocial: os || "—",
  };
}

type UserRow = ReturnType<typeof toUserRow>;

type FilterSelection = {
  columns: string[];
  vencimientos: {
    malapraxisVencida: boolean;
    malapraxisPorVencer: boolean;
    anssalVencido: boolean;
    anssalPorVencer: boolean;
    coberturaVencida: boolean;
    coberturaPorVencer: boolean;
    fechaDesde?: string;
    fechaHasta?: string;
    dias: number;
  };
  otros: {
    sexo: string;
    estado: string;
    adherente: string;
    provincia: string;
    localidad: string;
    especialidad: string;
    categoria: string;
    condicionImpositiva: string;
    fechaIngresoDesde: string;
    fechaIngresoHasta: string;
  };
};

const AVAILABLE_COLUMNS = [
  { key: "apellido", label: "Apellido" },
  { key: "nombre_", label: "Nombre" },
  { key: "sexo", label: "Sexo" },
  { key: "documento", label: "Documento" },
  { key: "mail_particular", label: "Mail" },
  { key: "tele_particular", label: "Teléfono" },
  { key: "celular_particular", label: "Celular" },
  { key: "matricula_prov", label: "Matrícula Provincial" },
  { key: "matricula_nac", label: "Matrícula Nacional" },
  { key: "domicilio_consulta", label: "Domicilio Consultorio" },
  { key: "telefono_consulta", label: "Teléfono Consultorio" },
  { key: "provincia", label: "Provincia" },
  { key: "localidad", label: "Localidad" },
  { key: "categoria", label: "Categoría" },
  { key: "condicion_impositiva", label: "Condición Impositiva" },
];

const UsersList: React.FC = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [rawUsers, setRawUsers] = useState<MedicoRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [error, setError] = useState<string | null>(null);

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [selectedGroup, setSelectedGroup] = useState<ExportGroupId | null>(
    null
  );
  const [selectedPreset, setSelectedPreset] = useState<ExportPresetId | null>(
    null
  );
  const [presetParams, setPresetParams] = useState<PresetParams>({
    dias: 30,
    q: "",
    status: "",
    adherente: "",
    provincia: "",
    localidad: "",
    fechaDesde: "",
    fechaHasta: "",
    logoUrl: "https://example.com/logo.png",
  });

  const [filters, setFilters] = useState<FilterSelection>({
    columns: ["apellido", "nombre_", "documento", "mail_particular"],
    vencimientos: {
      malapraxisVencida: false,
      malapraxisPorVencer: false,
      anssalVencido: false,
      anssalPorVencer: false,
      coberturaVencida: false,
      coberturaPorVencer: false,
      dias: 30,
    },
    otros: {
      sexo: "",
      estado: "",
      adherente: "",
      provincia: "",
      localidad: "",
      especialidad: "",
      categoria: "",
      condicionImpositiva: "",
      fechaIngresoDesde: "",
      fechaIngresoHasta: "",
    },
  });

  const resetFilters = () => {
    setFilters({
      columns: ["apellido", "nombre_", "documento", "mail_particular"],
      vencimientos: {
        malapraxisVencida: false,
        malapraxisPorVencer: false,
        anssalVencido: false,
        anssalPorVencer: false,
        coberturaVencida: false,
        coberturaPorVencer: false,
        dias: 30,
      },
      otros: {
        sexo: "",
        estado: "",
        adherente: "",
        provincia: "",
        localidad: "",
        especialidad: "",
        categoria: "",
        condicionImpositiva: "",
        fechaIngresoDesde: "",
        fechaIngresoHasta: "",
      },
    });
    setExportError(null);
  };

  const resetExportWizard = () => {
    setSelectedGroup(null);
    setSelectedPreset(null);
    setPresetParams({
      dias: 30,
      q: "",
      status: "",
      adherente: "",
      provincia: "",
      localidad: "",
      fechaDesde: "",
      fechaHasta: "",
      logoUrl: "https://example.com/logo.png",
    });
    setExportError(null);
  };

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const data = await getJSON<MedicoRow[]>("/api/medicos");

        if (ignore) return;

        setRawUsers(data);
        setUsers(data.map(toUserRow));
      } catch (err: any) {
        if (ignore) return;
        setError(err?.message || "Error al cargar los datos");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    const s = searchTerm.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s) ||
        String(u.nro_socio ?? "")
          .toLowerCase()
          .includes(s) ||
        String(u.matriculaProv ?? "")
          .toLowerCase()
          .includes(s)
    );
  }, [users, searchTerm]);

  const visibleUsers = filteredUsers;

  const handleExportWithFilters = async (
    format: "xlsx" | "csv",
    logoFile: File | null
  ) => {
    if (filters.columns.length === 0) {
      setExportError("Debe seleccionar al menos una columna para exportar");
      return;
    }

    setExportLoading(true);
    setExportError(null);

    try {
      const today = startOfDay(new Date());

      const hasCustomRange =
        Boolean(filters.vencimientos.fechaDesde?.trim()) ||
        Boolean(filters.vencimientos.fechaHasta?.trim());
      const from = filters.vencimientos.fechaDesde?.trim()
        ? startOfDay(new Date(filters.vencimientos.fechaDesde))
        : today;
      const to = filters.vencimientos.fechaHasta?.trim()
        ? endOfDay(new Date(filters.vencimientos.fechaHasta))
        : endOfDay(
            addDays(today, Math.max(1, Number(filters.vencimientos.dias ?? 30)))
          );

      const filtered = rawUsers.filter((row) => {
        if (filters.vencimientos.malapraxisVencida) {
          const mp = normalizeBool(getValue(row, "malapraxis"));
          const d = parseDateAny(getValue(row, "vencimiento_malapraxis"));
          const cutoff = filters.vencimientos.fechaDesde?.trim() ? from : today;
          if (!mp || !d || d.getTime() >= cutoff.getTime()) return false;
        }

        if (filters.vencimientos.malapraxisPorVencer) {
          const mp = normalizeBool(getValue(row, "malapraxis"));
          const d = parseDateAny(getValue(row, "vencimiento_malapraxis"));
          const a = hasCustomRange ? from : today;
          const b = hasCustomRange ? to : to;
          if (
            !mp ||
            !d ||
            d.getTime() < a.getTime() ||
            d.getTime() > b.getTime()
          )
            return false;
        }

        if (filters.vencimientos.anssalVencido) {
          const d = parseDateAny(getValue(row, "vencimiento_anssal"));
          const cutoff = filters.vencimientos.fechaDesde?.trim() ? from : today;
          if (!d || d.getTime() >= cutoff.getTime()) return false;
        }

        if (filters.vencimientos.anssalPorVencer) {
          const d = parseDateAny(getValue(row, "vencimiento_anssal"));
          const a = hasCustomRange ? from : today;
          const b = hasCustomRange ? to : to;
          if (!d || d.getTime() < a.getTime() || d.getTime() > b.getTime())
            return false;
        }

        if (filters.vencimientos.coberturaVencida) {
          const d = parseDateAny(getValue(row, "vencimiento_cobertura"));
          const cutoff = filters.vencimientos.fechaDesde?.trim() ? from : today;
          if (!d || d.getTime() >= cutoff.getTime()) return false;
        }

        if (filters.vencimientos.coberturaPorVencer) {
          const d = parseDateAny(getValue(row, "vencimiento_cobertura"));
          const a = hasCustomRange ? from : today;
          const b = hasCustomRange ? to : to;
          if (!d || d.getTime() < a.getTime() || d.getTime() > b.getTime())
            return false;
        }

        if (filters.otros.estado) {
          const st = isActiveRow(row) ? "activo" : "inactivo";
          if (st !== filters.otros.estado) return false;
        }

        if (filters.otros.adherente) {
          const a = normalizeAdherente(row);
          if (filters.otros.adherente === "si" && a !== true) return false;
          if (filters.otros.adherente === "no" && a !== false) return false;
        }

        if (filters.otros.provincia) {
          if (!includesCI(getValue(row, "provincia"), filters.otros.provincia))
            return false;
        }

        if (filters.otros.localidad) {
          if (!includesCI(getValue(row, "localidad"), filters.otros.localidad))
            return false;
        }

        if (filters.otros.sexo) {
          if (!includesCI(getValue(row, "sexo"), filters.otros.sexo))
            return false;
        }

        if (filters.otros.categoria) {
          if (!includesCI(getValue(row, "categoria"), filters.otros.categoria))
            return false;
        }

        if (filters.otros.condicionImpositiva) {
          if (
            !includesCI(
              getValue(row, "condicion_impositiva"),
              filters.otros.condicionImpositiva
            )
          )
            return false;
        }

        if (filters.otros.fechaIngresoDesde) {
          const d = parseDateAny(getValue(row, "fecha_ingreso"));
          const f = startOfDay(new Date(filters.otros.fechaIngresoDesde));
          if (!d || d.getTime() < f.getTime()) return false;
        }

        if (filters.otros.fechaIngresoHasta) {
          const d = parseDateAny(getValue(row, "fecha_ingreso"));
          const t = endOfDay(new Date(filters.otros.fechaIngresoHasta));
          if (!d || d.getTime() > t.getTime()) return false;
        }

        return true;
      });

      if (filtered.length === 0) {
        setExportError(
          "No hay registros que coincidan con los filtros seleccionados"
        );
        setExportLoading(false);
        return;
      }

      const cols = filters.columns.map((k) => ({
        key: k,
        header: labelFor(k),
      }));

      const fname = `export_${new Date().toISOString().slice(0, 10)}`;

      if (format === "xlsx") {
        await exportToExcelBW({
          filename: `${fname}.xlsx`,
          title: "Listado de Médicos",
          subtitle: `${filtered.length} registro${
            filtered.length !== 1 ? "s" : ""
          }`,
          columns: cols,
          rows: filtered,
          logoFile: logoFile,
        });
      } else {
        const csv = toCSV(filtered, cols);
        downloadBlob(`${fname}.csv`, "text/csv;charset=utf-8", csv);
      }

      setIsExportOpen(false);
      resetFilters();
    } catch (err: any) {
      setExportError(err?.message || "Error al exportar");
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportPreset = async (format: "xlsx" | "csv") => {
    if (!selectedPreset) {
      setExportError("Seleccione un preset");
      return;
    }

    setExportLoading(true);
    setExportError(null);

    try {
      const preset = PRESETS[selectedPreset];
      const filtered = rawUsers.filter((r) => {
        if (!baseFilterForPreset(selectedPreset, r, presetParams)) return false;
        if (!applyExtraFilters(r, presetParams)) return false;
        return true;
      });

      const sorted = sortForPreset(selectedPreset, filtered);

      if (sorted.length === 0) {
        setExportError(
          "No hay registros que coincidan con los filtros seleccionados"
        );
        setExportLoading(false);
        return;
      }

      const cols = presetColumns(selectedPreset);
      const fname = `${selectedPreset}_${new Date()
        .toISOString()
        .slice(0, 10)}`;

      if (format === "xlsx") {
        await exportToExcelBW({
          filename: `${fname}.xlsx`,
          title: preset.title,
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

      setIsExportOpen(false);
      resetExportWizard();
    } catch (err: any) {
      setExportError(err?.message || "Error al exportar");
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p>Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Usuarios</h1>
          <p className={styles.subtitle}>Gestión de médicos asociados</p>
        </div>
        <div className={styles.headerActions}>
          <BackButton />
          <Button onClick={() => setIsExportOpen(true)}>
            Filtrar y Exportar
          </Button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{users.length}</div>
          <div className={styles.statLabel}>Total de usuarios</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>
            {users.filter((u) => u.status === "activo").length}
          </div>
          <div className={styles.statLabel}>Activos</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{filteredUsers.length}</div>
          <div className={styles.statLabel}>Filtrados</div>
        </div>
      </div>

      <div className={styles.searchBar}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Buscar por nombre, email, matrícula o número de socio..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredUsers.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No se encontraron usuarios</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nro. Socio</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Matrícula</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.nro_socio ?? "—"}</td>
                  <td className={styles.nameCell}>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.phone}</td>
                  <td>{user.matriculaProv}</td>
                  <td>
                    <span
                      className={
                        user.status === "activo"
                          ? styles.statusActive
                          : styles.statusInactive
                      }
                    >
                      {user.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Filtrar y descargar"
        size="large"
      >
        <FilterModal
          filters={filters}
          setFilters={setFilters}
          exportError={exportError}
          exportLoading={exportLoading}
          onExport={handleExportWithFilters}
          onClose={() => setIsExportOpen(false)}
          resetFilters={resetFilters}
        />
      </Modal>
    </div>
  );
};

export default UsersList;
