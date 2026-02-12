// src/app/pages/UsersList/medicosExport.ts
// Helpers + mapping for Medicos export (/api/medicos/all)

import type { FilterSelection as AppFilterSelection, MissingFieldKey } from "../../types/filters";

/**
 * ✅ This file exports helpers used by:
 * - useMedicosExport.ts (hook)
 * - medicosPresets.ts (presets)
 *
 * It is compatible with your existing types in: src/app/types/filters
 */
export type FilterSelection = AppFilterSelection;

export type ExportColumnKey =
  | "id"
  | "nro_socio"
  | "nombre"
  | "sexo"
  | "documento"
  | "mail_particular"
  | "tele_particular"
  | "telefono_particular"
  | "celular_particular"
  | "telefono_consulta"
  | "domicilio_consulta"
  | "matricula_prov"
  | "matricula_nac"
  | "provincia"
  | "categoria"
  | "especialidad"
  | "condicion_impositiva"
  | "fecha_ingreso"
  | "activo"
  | "adherente"
  | "malapraxis"
  | "anssal"
  | "cobertura"
  | "vencimiento_malapraxis"
  | "vencimiento_anssal"
  | "vencimiento_cobertura";

export type MedicoRow = Record<string, unknown>;

export type ExportColumn = {
  key: ExportColumnKey;
  header: string;
};

/**
 * ✅ KEYMAP: tries multiple possible keys for each export key
 */
export const KEYMAP: Record<ExportColumnKey, string[]> = {
  id: ["id", "ID", "Id"],
  nro_socio: ["nro_socio", "NRO_SOCIO", "socio", "SOCIO"],

  nombre: ["nombre", "NOMBRE", "ape_nom", "apellido_nombre", "APELLIDO_NOMBRE", "APE_NOM"],

  sexo: ["sexo", "SEXO"],
  documento: ["documento", "DOCUMENTO", "dni", "DNI"],

  mail_particular: ["mail_particular", "MAIL_PARTICULAR", "email", "EMAIL", "mail", "MAIL"],
  tele_particular: ["tele_particular", "TELE_PARTICULAR", "telefono", "TELEFONO"],
  telefono_particular: ["telefono_particular", "TELEFONO_PARTICULAR", "tele_particular", "TELE_PARTICULAR"],
  celular_particular: ["celular_particular", "CELULAR_PARTICULAR", "celular", "CELULAR"],

  telefono_consulta: [
    "telefono_consulta",
    "TELEFONO_CONSULTA",
    "tel_consulta",
    "TEL_CONSULTA",
    "telefonoConsulta",
    "TELEFONOCONSULTA",
  ],
  domicilio_consulta: ["domicilio_consulta", "DOMICILIO_CONSULTA", "direccion_consulta", "DIRECCION_CONSULTA"],

  matricula_prov: ["matricula_prov", "MATRICULA_PROV", "matricula", "MATRICULA"],
  matricula_nac: ["matricula_nac", "MATRICULA_NAC"],

  provincia: ["provincia", "PROVINCIA"],
  categoria: ["categoria", "CATEGORIA"],

  // especialidad se calcula (ver getCellValue)
  especialidad: ["ESPECIALIDADES", "especialidades", "ESPECIALIDAD", "especialidad"],

  condicion_impositiva: ["condicion_impositiva", "CONDICION_IMPOSITIVA", "condicionImpositiva"],

  fecha_ingreso: ["fecha_ingreso", "FECHA_INGRESO", "fechaIngreso", "FECHAINGRESO"],

  activo: ["activo", "ACTIVO", "estado", "ESTADO", "EXISTE", "existe"],
  adherente: ["adherente", "ADHERENTE", "ES_ADHERENTE", "es_adherente"],

  malapraxis: ["malapraxis", "MALAPRAXIS", "malapraxis_empresa", "MALAPRAXIS_EMPRESA", "malapraxisEmpresa"],
  anssal: ["anssal", "ANSSAL", "anssal_vto", "ANSSAL_VTO", "anssalVto"],
  cobertura: ["cobertura", "COBERTURA", "cobertura_vto", "COBERTURA_VTO", "coberturaVto"],

  // vencimientos se calculan (ver getCellValue / getVencDate)
  vencimiento_malapraxis: [],
  vencimiento_anssal: [],
  vencimiento_cobertura: [],
};

export const DEFAULT_HEADERS: Record<ExportColumnKey, string> = {
  id: "ID",
  nro_socio: "N° Socio",
  nombre: "Nombre completo",
  sexo: "Sexo",
  documento: "Documento",
  mail_particular: "Mail",
  tele_particular: "Teléfono",
  telefono_particular: "Teléfono Particular",
  celular_particular: "Celular",
  telefono_consulta: "Teléfono Consultorio",
  domicilio_consulta: "Domicilio Consultorio",
  matricula_prov: "Matrícula Provincial",
  matricula_nac: "Matrícula Nacional",
  provincia: "Provincia",
  categoria: "Categoría",
  especialidad: "Especialidades",
  condicion_impositiva: "Condición Impositiva",
  fecha_ingreso: "Fecha Ingreso",
  activo: "Activo",
  adherente: "Adherente",
  malapraxis: "Mala Praxis (empresa)",
  anssal: "ANSSAL",
  cobertura: "Cobertura",
  vencimiento_malapraxis: "Venc. Mala Praxis",
  vencimiento_anssal: "Venc. ANSSAL",
  vencimiento_cobertura: "Venc. Cobertura",
};

export function isNil(v: unknown) {
  return v === null || v === undefined || v === "";
}

export function isEmptyValue(v: any): boolean {
  if (v === null || typeof v === "undefined") return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

export function normalizeText(v: any): string {
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function toCleanString(v: unknown): string {
  if (isNil(v)) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export function pickFirst(row: any, keys: string[]): any {
  for (const k of keys) {
    const v = row?.[k];
    if (!isEmptyValue(v)) return v;
  }
  return "";
}

/**
 * Return best value for a canonical export key, checking multiple key variants.
 */
export function pickValue(row: MedicoRow, canonicalKey: ExportColumnKey): string {
  const candidates = KEYMAP[canonicalKey] ?? [canonicalKey];
  for (const k of candidates) {
    const v = (row as any)?.[k];
    if (!isNil(v)) return toCleanString(v);
  }
  return "";
}

/* ================================
   Especialidades múltiples
================================ */
function splitTokens(v: any): string[] {
  if (isEmptyValue(v)) return [];
  if (Array.isArray(v)) return v.map((x) => String(x ?? "").trim()).filter(Boolean);
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return [];
    return s.split(/[,;|]/g).map((x) => x.trim()).filter(Boolean);
  }
  return [String(v).trim()].filter(Boolean);
}

function collectEspecialidadColumns(row: any, max = 12): any[] {
  const out: any[] = [];
  const pushKey = (k: string) => {
    const v = row?.[k];
    if (!isEmptyValue(v)) out.push(v);
  };

  for (let i = 1; i <= max; i++) {
    pushKey(`especialidad${i}`);
    pushKey(`ESPECIALIDAD${i}`);
    pushKey(`especialidad_${i}`);
    pushKey(`ESPECIALIDAD_${i}`);
    pushKey(`especialidad${i}_nombre`);
    pushKey(`ESPECIALIDAD${i}_NOMBRE`);
    pushKey(`especialidad_${i}_nombre`);
    pushKey(`ESPECIALIDAD_${i}_NOMBRE`);
  }
  return out;
}

export function getEspecialidadesTokens(row: any): string[] {
  const tokensRaw: string[] = [];

  const cols = collectEspecialidadColumns(row, 12);
  for (const v of cols) tokensRaw.push(...splitTokens(v));

  const rawCombined =
    (row as any)?.ESPECIALIDADES ??
    (row as any)?.especialidades ??
    (row as any)?.ESPECIALIDAD ??
    (row as any)?.especialidad ??
    (row as any)?.ESPECIALIDAD_NOMBRE ??
    (row as any)?.especialidad_nombre ??
    null;

  for (const v of splitTokens(rawCombined)) tokensRaw.push(v);

  const seen = new Set<string>();
  const out: string[] = [];

  for (const t0 of tokensRaw) {
    const t = String(t0 ?? "").trim();
    if (!t) continue;
    if (t === "0") continue;

    const n = normalizeText(t);
    if (!n) continue;
    if (n === "sin especialidad" || n === "sinespecialidad") continue;

    if (seen.has(n)) continue;
    seen.add(n);
    out.push(t);
  }

  const hasMedico = out.some((x) => normalizeText(x) === "medico");
  if (hasMedico && out.length > 1) {
    return out.filter((x) => normalizeText(x) !== "medico");
  }

  return out;
}

export function matchEspecialidad(row: any, selected: string): boolean {
  if (!selected) return true;

  const sel = normalizeText(selected);
  const tokens = getEspecialidadesTokens(row);

  return tokens.some((t) => {
    const nt = normalizeText(t);
    return nt === sel || nt.includes(sel) || sel.includes(nt);
  });
}

/* ================================
   Fechas + vencimientos
================================ */
export function parseDateAny(v: any): Date | null {
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

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function inRange(d: Date, from?: Date | null, to?: Date | null): boolean {
  const t = d.getTime();
  if (from && t < from.getTime()) return false;
  if (to && t > to.getTime()) return false;
  return true;
}

const VENC_KEYS = {
  malapraxis: [
    "malapraxis_vencimiento",
    "malapraxis_vto",
    "vto_malapraxis",
    "fecha_venc_malapraxis",
    "MALAPRAXIS_VENCIMIENTO",
    "MALAPRAXIS_VTO",
    "VTO_MALAPRAXIS",
  ],
  anssal: [
    "anssal_vencimiento",
    "anssal_vto",
    "vto_anssal",
    "fecha_venc_anssal",
    "ANSSAL_VENCIMIENTO",
    "ANSSAL_VTO",
    "VTO_ANSSAL",
  ],
  cobertura: [
    "cobertura_vencimiento",
    "cobertura_vto",
    "vto_cobertura",
    "fecha_venc_cobertura",
    "COBERTURA_VENCIMIENTO",
    "COBERTURA_VTO",
    "VTO_COBERTURA",
  ],
} as const;

export function getVencDate(row: MedicoRow, kind: keyof typeof VENC_KEYS): Date | null {
  const raw = pickFirst(row, [...VENC_KEYS[kind]]);
  return parseDateAny(raw);
}

function formatDateYYYYMMDD(d: Date | null): string {
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/* ================================
   Activo / adherente / faltantes
================================ */
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
  if (typeof (row as any)?.activo !== "undefined") return Boolean(Number((row as any).activo));
  const ex = ((row as any)?.EXISTE ?? (row as any)?.existe ?? "").toString().trim().toUpperCase();
  return ex === "S";
}

export function normalizeAdherente(row: any): boolean | null {
  const raw = (row as any)?.adherente ?? (row as any)?.ES_ADHERENTE ?? (row as any)?.es_adherente;
  if (raw === null || typeof raw === "undefined" || raw === "") return null;
  return normalizeBool(raw);
}

const MISSING_FIELD_KEYS: Record<MissingFieldKey, string[]> = {
  telefono_consulta: ["telefono_consulta", "TELEFONO_CONSULTA", "tel_consulta", "TEL_CONSULTA"],
  domicilio_consulta: ["domicilio_consulta", "DOMICILIO_CONSULTA"],
  mail_particular: ["mail_particular", "MAIL_PARTICULAR", "email", "EMAIL"],
  tele_particular: ["tele_particular", "TELE_PARTICULAR", "telefono", "TELEFONO"],
  celular_particular: ["celular_particular", "CELULAR_PARTICULAR", "celular", "CELULAR"],
  matricula_prov: ["matricula_prov", "MATRICULA_PROV"],
  matricula_nac: ["matricula_nac", "MATRICULA_NAC"],
  provincia: ["provincia", "PROVINCIA"],
  categoria: ["categoria", "CATEGORIA"],
  especialidad: ["especialidad", "ESPECIALIDAD", "especialidades", "ESPECIALIDADES", "especialidad1", "ESPECIALIDAD1"],
  condicion_impositiva: ["condicion_impositiva", "CONDICION_IMPOSITIVA", "condicionImpositiva"],
  malapraxis: ["MALAPRAXIS", "malapraxis", "MALAPRAXIS_EMPRESA", "malapraxis_empresa"],
};

export function isMissingField(row: MedicoRow, field: MissingFieldKey): boolean {
  if (field === "especialidad") {
    return getEspecialidadesTokens(row).length === 0;
  }
  const raw = pickFirst(row, MISSING_FIELD_KEYS[field]);
  return isEmptyValue(raw);
}

/* ================================
   ✅ getCellValue for presets/export
================================ */
export function getCellValue(row: MedicoRow, key: string): string {
  const k = key as ExportColumnKey;

  if (k === "especialidad") {
    return getEspecialidadesTokens(row).join(" | ");
  }

  if (k === "vencimiento_malapraxis") return formatDateYYYYMMDD(getVencDate(row, "malapraxis"));
  if (k === "vencimiento_anssal") return formatDateYYYYMMDD(getVencDate(row, "anssal"));
  if (k === "vencimiento_cobertura") return formatDateYYYYMMDD(getVencDate(row, "cobertura"));

  if (k === "activo") return isActiveRow(row) ? "activo" : "inactivo";

  if (k === "adherente") {
    const a = normalizeAdherente(row);
    if (a === null) return "";
    return a ? "si" : "no";
  }

  // default: keymap-based
  return pickValue(row, k);
}

/* ================================
   ✅ Export filters -> backend query
   NOTE: faltantes / especialidad / conMalapraxis are applied client-side in the hook.
================================ */
export function mapUIToQuery(filters: FilterSelection) {
  const otros = filters?.otros ?? ({} as FilterSelection["otros"]);
  const v = filters?.vencimientos ?? ({} as FilterSelection["vencimientos"]);

  return {
    // "otros"
    sexo: otros.sexo || undefined,
    estado: otros.estado || undefined,
    adherente: otros.adherente || undefined,
    provincia: otros.provincia || undefined,
    categoria: otros.categoria || undefined,
    condicion_impositiva: otros.condicionImpositiva || undefined,

    fecha_ingreso_desde: otros.fechaIngresoDesde || undefined,
    fecha_ingreso_hasta: otros.fechaIngresoHasta || undefined,

    // vencimientos flags
    malapraxis_vencida: v.malapraxisVencida ? "1" : undefined,
    malapraxis_por_vencer: v.malapraxisPorVencer ? "1" : undefined,

    anssal_vencido: v.anssalVencido ? "1" : undefined,
    anssal_por_vencer: v.anssalPorVencer ? "1" : undefined,

    cobertura_vencida: v.coberturaVencida ? "1" : undefined,
    cobertura_por_vencer: v.coberturaPorVencer ? "1" : undefined,

    // vencimientos global range + days window
    por_vencer_dias: v.dias && v.dias > 0 ? String(v.dias) : undefined,
    vencimientos_desde: v.fechaDesde || undefined,
    vencimientos_hasta: v.fechaHasta || undefined,
  };
}

/**
 * Build URLSearchParams skipping undefined / null / empty.
 */
export function buildQS(params: Record<string, unknown>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  return sp.toString();
}

/* ================================
   ✅ Client-side filter (for export)
   So export matches the same UI filters,
   even if backend doesn’t support some filters.
================================ */
export function filterRowsForExport(rows: MedicoRow[], filters: FilterSelection): MedicoRow[] {
  const o = filters.otros;
  const v = filters.vencimientos;

  const today = startOfDay(new Date());

  const fromIngreso = o.fechaIngresoDesde ? parseDateAny(o.fechaIngresoDesde) : null;
  const toIngreso = o.fechaIngresoHasta ? parseDateAny(o.fechaIngresoHasta) : null;

  const fromVto = v.fechaDesde ? parseDateAny(v.fechaDesde) : null;
  const toVtoByDate = v.fechaHasta ? parseDateAny(v.fechaHasta) : null;
  const toVto = v.dias > 0 ? addDays(today, v.dias) : toVtoByDate;

  const wantAnyVencCheckbox =
    v.malapraxisVencida ||
    v.malapraxisPorVencer ||
    v.anssalVencido ||
    v.anssalPorVencer ||
    v.coberturaVencida ||
    v.coberturaPorVencer;

  const wantsAnyVtoWindow = Boolean(v.fechaDesde || v.fechaHasta || v.dias > 0);

  const sexoNorm = normalizeText(o.sexo);
  const provNorm = normalizeText(o.provincia);
  const catNorm = normalizeText(o.categoria);
  const ciNorm = normalizeText(o.condicionImpositiva);

  return rows.filter((row) => {
    // faltantes
    if (filters.faltantes?.enabled) {
      const missing = isMissingField(row, filters.faltantes.field);
      if (filters.faltantes.mode === "missing" && !missing) return false;
      if (filters.faltantes.mode === "present" && missing) return false;
    }

    // conMalapraxis (presencia)
    if ((o as any).conMalapraxis) {
      const mp = pickFirst(row, ["MALAPRAXIS", "malapraxis", "MALAPRAXIS_EMPRESA", "malapraxis_empresa"]);
      if (String(mp ?? "").trim() === "") return false;
    }

    if (o.sexo) {
      const sx = normalizeText(pickFirst(row, ["sexo", "SEXO"]));
      if (sx !== sexoNorm) return false;
    }

    if (o.provincia) {
      const pv = normalizeText(pickFirst(row, ["provincia", "PROVINCIA"]));
      if (!pv.includes(provNorm)) return false;
    }

    if (o.categoria) {
      const cat = normalizeText(pickFirst(row, ["categoria", "CATEGORIA"]));
      if (cat !== catNorm) return false;
    }

    if (o.condicionImpositiva) {
      const ci = normalizeText(
        pickFirst(row, ["condicion_impositiva", "CONDICION_IMPOSITIVA", "condicionImpositiva"])
      );
      if (ci !== ciNorm) return false;
    }

    // especialidad (UI stores "id:123" or string)
    const esp = (o as any).especialidad as string | undefined;
    if (esp) {
      const normalizedSelected = esp.startsWith("id:") ? esp.slice(3) : esp;
      if (!matchEspecialidad(row, normalizedSelected)) return false;
    }

    if (o.estado === "activo" && !isActiveRow(row)) return false;
    if (o.estado === "inactivo" && isActiveRow(row)) return false;

    if (o.adherente) {
      const adh = normalizeAdherente(row);
      if (o.adherente === "si" && adh !== true) return false;
      if (o.adherente === "no" && adh !== false) return false;
    }

    if (o.fechaIngresoDesde || o.fechaIngresoHasta) {
      const rawIng = pickFirst(row, ["fecha_ingreso", "FECHA_INGRESO", "fechaIngreso", "FECHAINGRESO"]);
      const dIng = parseDateAny(rawIng);
      if (!dIng) return false;
      if (!inRange(startOfDay(dIng), fromIngreso, toIngreso)) return false;
    }

    if (wantAnyVencCheckbox || wantsAnyVtoWindow) {
      const evalVenc = (d: Date | null, wantExpired: boolean, wantSoon: boolean) => {
        if (!d) return false;
        const sd = startOfDay(d);
        const expired = sd.getTime() < today.getTime();

        const windowFrom = fromVto ?? today;
        const windowTo = toVto ?? null;

        const inWindow = windowTo ? inRange(sd, windowFrom, windowTo) : inRange(sd, windowFrom, null);

        const okExpired = wantExpired ? (wantsAnyVtoWindow ? inWindow : expired) : false;
        const okSoon = wantSoon ? (!expired && inWindow) : false;

        return okExpired || okSoon;
      };

      const mp = getVencDate(row, "malapraxis");
      const an = getVencDate(row, "anssal");
      const cb = getVencDate(row, "cobertura");

      const matchesByCheckbox =
        evalVenc(mp, v.malapraxisVencida, v.malapraxisPorVencer) ||
        evalVenc(an, v.anssalVencido, v.anssalPorVencer) ||
        evalVenc(cb, v.coberturaVencida, v.coberturaPorVencer);

      if (wantAnyVencCheckbox) {
        if (!matchesByCheckbox) return false;
      } else if (wantsAnyVtoWindow) {
        const windowFrom = fromVto ?? today;
        const windowTo = toVto ?? null;

        const anyInWindow =
          (mp && (windowTo ? inRange(startOfDay(mp), windowFrom, windowTo) : inRange(startOfDay(mp), windowFrom, null))) ||
          (an && (windowTo ? inRange(startOfDay(an), windowFrom, windowTo) : inRange(startOfDay(an), windowFrom, null))) ||
          (cb && (windowTo ? inRange(startOfDay(cb), windowFrom, windowTo) : inRange(startOfDay(cb), windowFrom, null)));

        if (!anyInWindow) return false;
      }
    }

    return true;
  });
}
