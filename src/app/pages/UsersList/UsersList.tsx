"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./UsersList.module.scss";
import { getJSON } from "../../lib/http";
import Button from "../../components/atoms/Button/Button";
import BackButton from "../../components/atoms/BackButton/BackButton";
import Modal from "../../components/atoms/Modal/Modal";

import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const PAGE_SIZE = 50;

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

  // profesionales
  nro_socio: "NRO_SOCIO",
  categoria: "categoria",
  titulo: "titulo",
  matricula_prov: "MATRICULA_PROV",
  matricula_nac: "MATRICULA_NAC",
  fecha_recibido: "FECHA_RECIBIDO",
  fecha_matricula: "FECHA_MATRICULA",
  domicilio_consulta: "DOMICILIO_CONSULTA",
  telefono_consulta: "TELEFONO_CONSULTA",

  // impositivos
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
  const raw = getValue(row, "adherente") ?? getValue(row, "ES_ADHERENTE") ?? getValue(row, "es_adherente");
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
}) {
  const { filename, title, subtitle, columns, rows } = args;

  const wb = new ExcelJS.Workbook();
  wb.creator = "CMC";
  wb.created = new Date();

  const ws = wb.addWorksheet("Export", {
    views: [{ state: "frozen", ySplit: 6 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  const colCount = Math.max(1, columns.length);

  const logoCols = colCount >= 8 ? 3 : colCount >= 5 ? 2 : 1;

  ws.mergeCells(1, 1, 3, logoCols);
  const logoCell = ws.getCell(1, 1);
  logoCell.value = "LOGO";
  logoCell.alignment = { horizontal: "center", vertical: "middle" };
  logoCell.font = { bold: true, size: 12, color: { argb: "FF000000" } };

  ws.mergeCells(1, logoCols + 1, 2, colCount);
  const titleCell = ws.getCell(1, logoCols + 1);
  titleCell.value = title;
  titleCell.font = { bold: true, size: 16, color: { argb: "FF000000" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells(3, logoCols + 1, 3, colCount);
  const metaCell = ws.getCell(3, logoCols + 1);
  const meta = `Generado: ${new Date().toLocaleString("es-AR")}${subtitle ? ` · ${subtitle}` : ""}`;
  metaCell.value = meta;
  metaCell.font = { size: 10, color: { argb: "FF000000" } };
  metaCell.alignment = { horizontal: "center", vertical: "middle" };

  ws.getRow(1).height = 28;
  ws.getRow(2).height = 18;
  ws.getRow(3).height = 18;

  // const topBorder = {
  //   top: { style: "thin", color: { argb: "FF000000" } },
  //   left: { style: "thin", color: { argb: "FF000000" } },
  //   bottom: { style: "thin", color: { argb: "FF000000" } },
  //   right: { style: "thin", color: { argb: "FF000000" } },
  // };
  // for (let r = 1; r <= 3; r++) {
  //   for (let c = 1; c <= colCount; c++) {
  //     ws.getCell(r, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
  //   }
  // }

  ws.getRow(4).height = 8;

  const headerRowIdx = 5;
  const headerRow = ws.getRow(headerRowIdx);
  headerRow.values = ["", ...columns.map((c) => c.header)];
  headerRow.height = 20;

  for (let c = 1; c <= colCount; c++) {
    const cell = ws.getCell(headerRowIdx, c);
    cell.font = { bold: true, size: 11, color: { argb: "FF000000" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F0F0" } }; 
  }

  const dataStart = 6;

  const normCellValue = (row: any, key: string) => {
    const v = getValue(row, key);

    if (key.startsWith("vencimiento_") || key.startsWith("fecha_")) return formatDateES(v);

    if (key === "malapraxis") return normalizeBool(v) ? "SI" : "NO";

    return safeText(v);
  };

  rows.forEach((r, i) => {
    const excelRowIdx = dataStart + i;
    const vals = columns.map((c) => normCellValue(r, c.key));
    ws.getRow(excelRowIdx).values = ["", ...vals];

    const zebra = i % 2 === 0 ? "FFFFFFFF" : "FFFAFAFA"; 
    for (let c = 1; c <= colCount; c++) {
      const cell = ws.getCell(excelRowIdx, c);
      cell.font = { size: 10, color: { argb: "FF000000" } };
      cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: zebra } };
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

    ws.getColumn(c).width = Math.min(42, Math.max(10, maxLen + 2));
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
      columns
        .map((c) => escapeCSV(String(getValue(r, c.key) ?? "")))
        .join(";")
    ),
  ];

  return "\uFEFF" + lines.join("\n");
}

/** ====== Presets ====== */
type ExportGroupId = "vencimientos" | "contactabilidad" | "calidad" | "administrativos";
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
};

const GROUPS: Array<{ id: ExportGroupId; title: string;}> = [
  { id: "vencimientos", title: "Vencimientos / Cumplimiento"},
  { id: "contactabilidad", title: "Contactabilidad"},
  { id: "calidad", title: "Calidad de padrón" },
  { id: "administrativos", title: "Administrativos / Matrícula" },
];

const PRESETS: Record<
  ExportPresetId,
  { group: ExportGroupId; title: string; columns: string[] }
> = {
  // A) Vencimientos
  malapraxis_vencida: {
    group: "vencimientos",
    title: "Malapraxis vencida",
    columns: ["apellido", "nombre_", "documento", "matricula_prov", "mail_particular", "celular_particular", "vencimiento_malapraxis"],
  },
  malapraxis_por_vencer: {
    group: "vencimientos",
    title: "Malapraxis por vencer",
    columns: ["apellido", "nombre_", "documento", "matricula_prov", "mail_particular", "celular_particular", "vencimiento_malapraxis"],
  },
  anssal_vencido: {
    group: "vencimientos",
    title: "ANSSAL vencido",
    columns: ["apellido", "nombre_", "documento", "matricula_prov", "anssal", "vencimiento_anssal", "mail_particular", "celular_particular"],
  },
  anssal_por_vencer: {
    group: "vencimientos",
    title: "ANSSAL por vencer",
    columns: ["apellido", "nombre_", "documento", "matricula_prov", "anssal", "vencimiento_anssal", "mail_particular", "celular_particular"],
  },
  cobertura_vencida: {
    group: "vencimientos",
    title: "Cobertura vencida",
    columns: ["apellido", "nombre_", "documento", "matricula_prov", "cobertura", "vencimiento_cobertura", "mail_particular", "celular_particular"],
  },
  cobertura_por_vencer: {
    group: "vencimientos",
    title: "Cobertura por vencer",
    columns: ["apellido", "nombre_", "documento", "matricula_prov", "cobertura", "vencimiento_cobertura", "mail_particular", "celular_particular"],
  },

  // B) Contactabilidad
  contactables: {
    group: "contactabilidad",
    title: "Contactables (mail o celular)",
    columns: ["apellido", "nombre_", "nro_socio", "mail_particular", "celular_particular", "provincia", "localidad"],
  },

  // C) Calidad
  datos_incompletos: {
    group: "calidad",
    title: "Datos críticos incompletos",
    columns: ["apellido", "nombre_", "documento", "provincia", "localidad", "observacion"],
  },
  sin_cuit_o_cbu: {
    group: "calidad",
    title: "Sin CUIT o sin CBU",
    columns: ["apellido", "nombre_", "documento", "cuit", "cbu", "condicion_impositiva"],
  },

  // D) Administrativos
  altas_recientes: {
    group: "administrativos",
    title: "Altas recientes (por fecha_matricula)",
    columns: ["apellido", "nombre_", "documento", "matricula_prov", "fecha_matricula", "categoria", "provincia", "localidad"],
  },
  por_zona: {
    group: "administrativos",
    title: "Por zona (Provincia/Localidad)",
    columns: ["apellido", "nombre_", "documento", "matricula_prov", "mail_particular", "celular_particular", "provincia", "localidad", "domicilio_particular", "codigo_postal"],
  },
};

function presetColumns(presetId: ExportPresetId) {
  return PRESETS[presetId].columns.map((k) => ({
    key: k,
    header: FIELD_MAP[k] ?? k,
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

function baseFilterForPreset(presetId: ExportPresetId, row: any, params: PresetParams) {
  const today = startOfDay(new Date());

  const dateBeforeToday = (key: string) => {
    const d = parseDateAny(getValue(row, key));
    return d ? d.getTime() < today.getTime() : false;
  };

  const dateBetween = (key: string, from: Date, to: Date) => {
    const d = parseDateAny(getValue(row, key));
    if (!d) return false;
    return d.getTime() >= from.getTime() && d.getTime() <= to.getTime();
  };

  switch (presetId) {
    case "malapraxis_vencida": {
      const mp = normalizeBool(getValue(row, "malapraxis"));
      return mp && dateBeforeToday("vencimiento_malapraxis");
    }
    case "malapraxis_por_vencer": {
      const mp = normalizeBool(getValue(row, "malapraxis"));
      const n = Math.max(1, Number(params.dias ?? 30));
      return mp && dateBetween("vencimiento_malapraxis", today, addDays(today, n));
    }

    case "anssal_vencido":
      return dateBeforeToday("vencimiento_anssal");

    case "anssal_por_vencer": {
      const n = Math.max(1, Number(params.dias ?? 30));
      return dateBetween("vencimiento_anssal", today, addDays(today, n));
    }

    case "cobertura_vencida":
      return dateBeforeToday("vencimiento_cobertura");

    case "cobertura_por_vencer": {
      const n = Math.max(1, Number(params.dias ?? 30));
      return dateBetween("vencimiento_cobertura", today, addDays(today, n));
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
      return isEmptyLike(getValue(row, "cuit")) || isEmptyLike(getValue(row, "cbu"));
    }

    case "altas_recientes": {
      const fd = params.fechaDesde?.trim();
      const fh = params.fechaHasta?.trim();
      const from = fd ? startOfDay(new Date(fd)) : addDays(today, -30);
      const to = fh ? startOfDay(new Date(fh)) : today;
      return dateBetween("fecha_matricula", from, to);
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

const UsersList: React.FC = () => {
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [rawUsers, setRawUsers] = useState<MedicoRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [selectedGroup, setSelectedGroup] = useState<ExportGroupId | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<ExportPresetId | null>(null);
  const [presetParams, setPresetParams] = useState<PresetParams>({
    dias: 30,
    q: "",
    status: "",
    adherente: "",
    provincia: "",
    localidad: "",
    fechaDesde: "",
    fechaHasta: "",
  });

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
    });
    setExportError(null);
  };

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const skip = (page - 1) * PAGE_SIZE;
        const params = new URLSearchParams();
        params.set("limit", PAGE_SIZE.toString());
        params.set("skip", skip.toString());

        const q = searchTerm.trim();
        if (q) params.set("q", q);

        const data = await getJSON<MedicoRow[]>(`/api/medicos?${params.toString()}`);
        const raw = data ?? [];
        const items = raw.map(toUserRow);

        if (!ignore) {
          setRawUsers(raw);
          setUsers(items);
          setHasMore(items.length === PAGE_SIZE);
        }
      } catch (e: any) {
        console.error(e);
        if (!ignore) {
          setRawUsers([]);
          setUsers([]);
          setError("Error al cargar usuarios");
          setHasMore(false);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [page, searchTerm]);

  const filteredUsers = users;

  const activeUsers = useMemo(() => users.filter((u) => u.status === "activo").length, [users]);
  const inactiveUsers = useMemo(() => users.filter((u) => u.status === "inactivo").length, [users]);

  const exportExcelCurrentPageBW = async () => {
    try {
      setExportLoading(true);
      setExportError(null);

      const cols = [
        { key: "apellido", header: FIELD_MAP.apellido ?? "apellido" },
        { key: "nombre_", header: FIELD_MAP.nombre_ ?? "nombre_" },
        { key: "documento", header: FIELD_MAP.documento ?? "DOCUMENTO" },
        { key: "nro_socio", header: FIELD_MAP.nro_socio ?? "NRO_SOCIO" },
        { key: "mail_particular", header: FIELD_MAP.mail_particular ?? "MAIL_PARTICULAR" },
        { key: "celular_particular", header: FIELD_MAP.celular_particular ?? "CELULAR_PARTICULAR" },
        { key: "provincia", header: FIELD_MAP.provincia ?? "PROVINCIA" },
        { key: "localidad", header: FIELD_MAP.localidad ?? "localidad" },
      ];

      await exportToExcelBW({
        filename: `usuarios_pagina_${page}.xlsx`,
        title: "Listado de Usuarios (Página)",
        subtitle: `Página ${page}`,
        columns: cols,
        rows: rawUsers,
      });
    } catch (e) {
      console.error(e);
      setExportError("No se pudo generar el Excel (página).");
    } finally {
      setExportLoading(false);
    }
  };

  const exportCSVCurrentPage = () => {
    const cols = [
      { key: "apellido", header: FIELD_MAP.apellido ?? "apellido" },
      { key: "nombre_", header: FIELD_MAP.nombre_ ?? "nombre_" },
      { key: "documento", header: FIELD_MAP.documento ?? "DOCUMENTO" },
      { key: "nro_socio", header: FIELD_MAP.nro_socio ?? "NRO_SOCIO" },
      { key: "mail_particular", header: FIELD_MAP.mail_particular ?? "MAIL_PARTICULAR" },
      { key: "celular_particular", header: FIELD_MAP.celular_particular ?? "CELULAR_PARTICULAR" },
      { key: "provincia", header: FIELD_MAP.provincia ?? "PROVINCIA" },
      { key: "localidad", header: FIELD_MAP.localidad ?? "localidad" },
    ];
    const csv = toCSV(rawUsers, cols);
    downloadBlob(`usuarios_pagina_${page}.csv`, "text/csv;charset=utf-8", csv);
  };

  const fetchAllForPreset = async () => {
    const params = new URLSearchParams();
    params.set("limit", "100000");
    params.set("skip", "0");

    const data = await getJSON<MedicoRow[]>(`/api/medicos?${params.toString()}`);
    return data ?? [];
  };

  const exportPresetExcel = async () => {
    if (!selectedPreset) return;

    setExportLoading(true);
    setExportError(null);

    try {
      const all = await fetchAllForPreset();

      const filtered = all
        .filter((r) => baseFilterForPreset(selectedPreset, r, presetParams))
        .filter((r) => applyExtraFilters(r, presetParams));

      const sorted = sortForPreset(selectedPreset, filtered);

      const cols = presetColumns(selectedPreset);
      const preset = PRESETS[selectedPreset];

      const subtitleParts: string[] = [];
      if (selectedPreset.endsWith("por_vencer")) subtitleParts.push(`N=${presetParams.dias ?? 30} días`);
      if (selectedPreset === "altas_recientes") {
        if (presetParams.fechaDesde) subtitleParts.push(`Desde ${formatDateES(presetParams.fechaDesde)}`);
        if (presetParams.fechaHasta) subtitleParts.push(`Hasta ${formatDateES(presetParams.fechaHasta)}`);
      }
      if (presetParams.provincia) subtitleParts.push(`Provincia: ${presetParams.provincia}`);
      if (presetParams.localidad) subtitleParts.push(`Localidad: ${presetParams.localidad}`);
      if (presetParams.status) subtitleParts.push(`Estado: ${presetParams.status}`);
      if (presetParams.adherente) subtitleParts.push(`Adherente: ${presetParams.adherente}`);

      const subtitle = subtitleParts.length ? subtitleParts.join(" · ") : undefined;

      const ymd = new Date().toISOString().slice(0, 10);
      await exportToExcelBW({
        filename: `${selectedPreset}_${ymd}.xlsx`,
        title: preset.title,
        subtitle,
        columns: cols,
        rows: sorted,
      });
    } catch (e: any) {
      console.error(e);
      setExportError("No se pudo descargar el Excel. Revisá el endpoint /api/medicos y los campos.");
    } finally {
      setExportLoading(false);
    }
  };

  const exportPresetCSV = async () => {
    if (!selectedPreset) return;
    setExportLoading(true);
    setExportError(null);

    try {
      const all = await fetchAllForPreset();

      const filtered = all
        .filter((r) => baseFilterForPreset(selectedPreset, r, presetParams))
        .filter((r) => applyExtraFilters(r, presetParams));

      const sorted = sortForPreset(selectedPreset, filtered);

      const cols = presetColumns(selectedPreset);
      const csv = toCSV(sorted, cols);
      downloadBlob(`${selectedPreset}.csv`, "text/csv;charset=utf-8", csv);
    } catch (e) {
      console.error(e);
      setExportError("No se pudo descargar el CSV.");
    } finally {
      setExportLoading(false);
    }
  };

  const presetsForGroup = useMemo(() => {
    if (!selectedGroup) return [];
    return (Object.keys(PRESETS) as ExportPresetId[]).filter((id) => PRESETS[id].group === selectedGroup);
  }, [selectedGroup]);

  return (
    <div className={styles.container}>
      <BackButton />

      <div className={styles.header}>
        <h1 className={styles.title}>Listado de Usuarios</h1>

        <div>
          <Button
            className={styles.backButton}
            variant="third"
            style={{ marginLeft: 8 }}
            title="Filtrar y descargar"
            onClick={() => {
              resetExportWizard();
              setIsExportOpen(true);
            }}
          >
            Filtrar y Descargar
          </Button>

          <Button className={styles.backButton} onClick={() => navigate("/panel/register-socio")} style={{ marginLeft: 8 }} title="Crear socio (médico)">
            + Agregar socio
          </Button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{users.length}</span>
          <span className={styles.statLabel}>Total Usuarios (página)</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{activeUsers}</span>
          <span className={styles.statLabel}>Activos</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{inactiveUsers}</span>
          <span className={styles.statLabel}>Inactivos</span>
        </div>
      </div>

      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          value={searchTerm}
          onChange={(e) => {
            setPage(1);
            setSearchTerm(e.target.value);
          }}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nro Socio</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Fecha de Ingreso</th>
              <th>Matrícula Provincial</th>
              <th style={{ width: 120 }}>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 12 }}>
                  ⏳ Cargando…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 12 }}>
                  {error}
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 12 }}>
                  No se encontraron usuarios que coincidan con la búsqueda
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.nro_socio ?? "—"}</td>
                  <td className={styles.nameCell}>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.phone}</td>
                  <td>{user.joinDate && !String(user.joinDate).startsWith("0000") ? new Date(user.joinDate).toLocaleDateString("es-AR") : "—"}</td>
                  <td>{user.matriculaProv ?? "—"}</td>
                  <td>
                    <Button
                      className={styles.backButton}
                      variant="primary"
                      type="button"
                      style={{ padding: "4px 8px", fontSize: 12 }}
                      title="Ver / editar"
                      onClick={() => {
                        const targetId = user.id ?? user.nro_socio;
                        if (targetId) navigate(`/panel/doctors/${targetId}`);
                      }}
                    >
                      Ver / editar
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.paginationBar}>
        <Button className={styles.backButton} type="button" disabled={page === 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          Anterior
        </Button>

        <span className={styles.pageLabel}>Página {page}</span>

        <Button className={styles.backButton} type="button" disabled={!hasMore || loading} onClick={() => setPage((p) => p + 1)}>
          Siguiente
        </Button>
      </div>

      {!loading && filteredUsers.length === 0 && !error && (
        <div className={styles.emptyState}>
          <p>No se encontraron usuarios que coincidan con la búsqueda</p>
        </div>
      )}

      <Modal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Filtrar y Descargar"
        size="large"
      >
        <div className={styles.exportModal}>
          {/* Quick actions (página) */}
          <div className={styles.exportQuickRow}>
            <Button variant="third" type="button" disabled={exportLoading} onClick={exportCSVCurrentPage}>
              Exportar CSV 
            </Button>
          </div>

          <div className={styles.exportDivider} />

          {/* STEP 1: grupos */}
          {!selectedGroup && (
            <>
              <div className={styles.exportSectionTitle}>Elegí una temática</div>
              <div className={styles.exportCardsGrid}>
                {GROUPS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className={styles.exportCard}
                    onClick={() => setSelectedGroup(g.id)}
                  >
                    <div className={styles.exportCardTitle}>{g.title}</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* STEP 2: presets */}
          {selectedGroup && !selectedPreset && (
            <>
              <div className={styles.exportNavRow}>
                <button type="button" className={styles.exportBackLink} onClick={() => setSelectedGroup(null)}>
                  ← Volver
                </button>
                <div className={styles.exportBreadcrumb}>
                  {GROUPS.find((g) => g.id === selectedGroup)?.title}
                </div>
              </div>

              <div className={styles.exportSectionTitle}>Elegí el listado</div>

              <div className={styles.exportCardsGrid}>
                {presetsForGroup.map((pid) => (
                  <button
                    key={pid}
                    type="button"
                    className={styles.exportCard}
                    onClick={() => setSelectedPreset(pid)}
                  >
                    <div className={styles.exportCardTitle}>{PRESETS[pid].title}</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* STEP 3: inputs opcionales */}
          {selectedGroup && selectedPreset && (
            <>
              <div className={styles.exportNavRow}>
                <button type="button" className={styles.exportBackLink} onClick={() => setSelectedPreset(null)}>
                  ← Volver
                </button>
                <div className={styles.exportBreadcrumb}>
                  {GROUPS.find((g) => g.id === selectedGroup)?.title} · <b>{PRESETS[selectedPreset].title}</b>
                </div>
              </div>

              {/* Inputs específicos */}
              {(selectedPreset.endsWith("por_vencer") || selectedPreset === "altas_recientes" || selectedPreset === "por_zona") && (
                <>
                  <div className={styles.exportSectionTitle}>Parámetros (opcionales)</div>

                  <div className={styles.exportGrid}>
                    {selectedPreset.endsWith("por_vencer") && (
                      <div className={styles.exportField}>
                        <label className={styles.exportLabel}>Ventana de días</label>
                        <select
                          className={styles.exportSelect}
                          value={String(presetParams.dias ?? 30)}
                          onChange={(e) => setPresetParams((p) => ({ ...p, dias: Number(e.target.value) }))}
                        >
                          <option value="30">30 días</option>
                          <option value="60">60 días</option>
                          <option value="90">90 días</option>
                        </select>
                      </div>
                    )}

                    {selectedPreset === "altas_recientes" && (
                      <>
                        <div className={styles.exportField}>
                          <label className={styles.exportLabel}>Fecha matrícula desde</label>
                          <input
                            type="date"
                            value={presetParams.fechaDesde ?? ""}
                            onChange={(e) => setPresetParams((p) => ({ ...p, fechaDesde: e.target.value }))}
                            className={styles.exportInput}
                          />
                        </div>

                        <div className={styles.exportField}>
                          <label className={styles.exportLabel}>Fecha matrícula hasta</label>
                          <input
                            type="date"
                            value={presetParams.fechaHasta ?? ""}
                            onChange={(e) => setPresetParams((p) => ({ ...p, fechaHasta: e.target.value }))}
                            className={styles.exportInput}
                          />
                        </div>
                      </>
                    )}

                    {(selectedPreset === "por_zona" || selectedPreset === "altas_recientes" || selectedPreset === "contactables") && (
                      <>
                        <div className={styles.exportField}>
                          <label className={styles.exportLabel}>Provincia</label>
                          <input
                            value={presetParams.provincia ?? ""}
                            onChange={(e) => setPresetParams((p) => ({ ...p, provincia: e.target.value }))}
                            placeholder="Ej: Corrientes"
                            className={styles.exportInput}
                          />
                        </div>

                        <div className={styles.exportField}>
                          <label className={styles.exportLabel}>Localidad</label>
                          <input
                            value={presetParams.localidad ?? ""}
                            onChange={(e) => setPresetParams((p) => ({ ...p, localidad: e.target.value }))}
                            placeholder="Ej: Capital"
                            className={styles.exportInput}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              {/* Extras comunes */}
              <div className={styles.exportSectionTitle}>Filtros extra (opcionales)</div>
              <div className={styles.exportGrid}>

                <div className={styles.exportField}>
                  <label className={styles.exportLabel}>Estado</label>
                  <select
                    value={presetParams.status ?? ""}
                    onChange={(e) => setPresetParams((p) => ({ ...p, status: e.target.value as any }))}
                    className={styles.exportSelect}
                  >
                    <option value="">Todos</option>
                    <option value="activo">Activos</option>
                    <option value="inactivo">Inactivos</option>
                  </select>
                </div>

                <div className={styles.exportField}>
                  <label className={styles.exportLabel}>Adherente</label>
                  <select
                    value={presetParams.adherente ?? ""}
                    onChange={(e) => setPresetParams((p) => ({ ...p, adherente: e.target.value as any }))}
                    className={styles.exportSelect}
                  >
                    <option value="">Todos</option>
                    <option value="si">Sí</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className={styles.exportActionsRow}>
                <div className={styles.exportActionsLeft}>
                  <Button variant="third" type="button" disabled={exportLoading} onClick={exportPresetCSV}>
                   Exportar CSV
                  </Button>
                </div>

                <div className={styles.exportActionsRight}>
                  <Button
                    variant="third"
                    type="button"
                    onClick={() => setIsExportOpen(false)}
                    disabled={exportLoading}
                  >
                    Cerrar
                  </Button>
                </div>
              </div>
            </>
          )}

          {exportError && <div className={styles.exportError}>{exportError}</div>}

         
        </div>
      </Modal>
    </div>
  );
};

export default UsersList;
