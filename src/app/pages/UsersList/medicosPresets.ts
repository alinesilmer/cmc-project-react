// src/app/pages/UsersList/medicosPresets.ts
import type { ExportColumn } from "./medicosExport";
import { getCellValue, normalizeText, addDays, startOfDay, inRange, parseDateAny } from "./medicosExport";

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

function isActiveRow(row: Row): boolean {
  const ex = String((row as any)?.EXISTE ?? (row as any)?.existe ?? "").trim().toUpperCase();
  if (ex) return ex === "S";
  const activo = (row as any)?.activo;
  if (typeof activo !== "undefined") return Boolean(Number(activo));
  return true;
}

function getVto(row: Row, key: "vencimiento_malapraxis" | "vencimiento_anssal" | "vencimiento_cobertura"): Date | null {
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
