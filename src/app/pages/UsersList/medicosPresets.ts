// src/app/pages/UsersList/medicosPresets.ts

import type { ExportColumnKey } from "./medicosExport";

export type ExportColumn = { key: ExportColumnKey | string; header: string };

export type ExportPresetId =
  | "activos"
  | "inactivos"
  | "malapraxis_vencida"
  | "malapraxis_30d"
  | "anssal_vencida"
  | "anssal_30d"
  | "cobertura_vencida"
  | "cobertura_30d";

export type PresetParams = { dias?: number };
type Row = Record<string, unknown>;

/* =========================
   Helpers (local)
========================= */
function isEmptyValue(v: any): boolean {
  if (v === null || typeof v === "undefined") return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

function normalizeText(v: any): string {
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function pickFirst(row: any, keys: string[]): any {
  for (const k of keys) {
    const v = row?.[k];
    if (!isEmptyValue(v)) return v;
  }
  return "";
}

function parseDateAny(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;

  if (typeof v === "number") {
    const ms = v < 10_000_000_000 ? v * 1000 : v;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  const s = String(v).trim();
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]) - 1;
    const yy = Number(m[3]);
    const d = new Date(yy, mm, dd);
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function inRange(d: Date, from?: Date | null, to?: Date | null): boolean {
  const t = d.getTime();
  if (from && t < from.getTime()) return false;
  if (to && t > to.getTime()) return false;
  return true;
}

/**
 * Minimal "getCellValue": resolves common key variants.
 */
function getCellValue(row: Row, key: string): any {
  const variants =
    key === "nombre"
      ? ["nombre", "NOMBRE", "apellido_nombre", "APELLIDO_NOMBRE", "ape_nom", "APE_NOM"]
      : [
          key,
          key.toUpperCase(),
          key.toLowerCase(),
          key.replace(/_/g, ""),
          key.replace(/_/g, "").toUpperCase(),
        ];

  return pickFirst(row, variants);
}

/* =========================
   Presets logic
========================= */
function isActiveRow(row: Row): boolean {
  const ex = String((row as any)?.EXISTE ?? (row as any)?.existe ?? "").trim().toUpperCase();
  if (ex) return ex === "S";
  const activo = (row as any)?.activo;
  if (typeof activo !== "undefined") return Boolean(Number(activo));
  return true;
}

function getVto(
  row: Row,
  key: "vencimiento_malapraxis" | "vencimiento_anssal" | "vencimiento_cobertura"
): Date | null {
  const raw = getCellValue(row, key);
  return parseDateAny(raw);
}

function isExpired(d: Date): boolean {
  const today = startOfDay(new Date());
  return startOfDay(d).getTime() < today.getTime();
}

function isInNextDays(d: Date, days: number): boolean {
  const today = startOfDay(new Date());
  const to = addDays(today, days);
  const sd = startOfDay(d);
  return !isExpired(sd) && inRange(sd, today, to);
}

export function presetColumns(presetId: ExportPresetId): ExportColumn[] {
  const base: ExportColumn[] = [
    { key: "nro_socio", header: "N° Socio" },
    { key: "nombre", header: "Nombre completo" },
    { key: "mail_particular", header: "Mail" },
    { key: "matricula_prov", header: "Matrícula Provincial" },
    { key: "especialidad", header: "Especialidades" },
    { key: "malapraxis", header: "Mala Praxis (empresa)" },
  ];

  if (presetId.startsWith("malapraxis")) base.push({ key: "vencimiento_malapraxis", header: "Venc. Mala Praxis" });
  if (presetId.startsWith("anssal")) base.push({ key: "vencimiento_anssal", header: "Venc. ANSSAL" });
  if (presetId.startsWith("cobertura")) base.push({ key: "vencimiento_cobertura", header: "Venc. Cobertura" });

  return base;
}

export function baseFilterForPreset(presetId: ExportPresetId, row: Row, params: PresetParams): boolean {
  const dias = params.dias ?? 30;

  if (presetId === "activos") return isActiveRow(row);
  if (presetId === "inactivos") return !isActiveRow(row);

  if (presetId === "malapraxis_vencida") {
    const d = getVto(row, "vencimiento_malapraxis");
    return !!d && isExpired(d);
  }
  if (presetId === "malapraxis_30d") {
    const d = getVto(row, "vencimiento_malapraxis");
    return !!d && isInNextDays(d, dias);
  }

  if (presetId === "anssal_vencida") {
    const d = getVto(row, "vencimiento_anssal");
    return !!d && isExpired(d);
  }
  if (presetId === "anssal_30d") {
    const d = getVto(row, "vencimiento_anssal");
    return !!d && isInNextDays(d, dias);
  }

  if (presetId === "cobertura_vencida") {
    const d = getVto(row, "vencimiento_cobertura");
    return !!d && isExpired(d);
  }
  if (presetId === "cobertura_30d") {
    const d = getVto(row, "vencimiento_cobertura");
    return !!d && isInNextDays(d, dias);
  }

  return true;
}

export function applyExtraFilters(_row: Row, _params: PresetParams): boolean {
  return true;
}

export function sortForPreset(_presetId: ExportPresetId, rows: Row[]): Row[] {
  return [...rows].sort((a, b) => {
    const na = normalizeText(getCellValue(a, "nombre"));
    const nb = normalizeText(getCellValue(b, "nombre"));
    return na.localeCompare(nb);
  });
}
