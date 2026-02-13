// src/app/pages/UsersList/medicosExport.ts
// Helpers + mapping for Medicos export (/api/medicos/all)

export type ExportColumnKey =
  | "id"
  | "nro_socio"
  | "nombre"
  | "sexo"
  | "documento"
  | "mail_particular"
  | "tele_particular"
  | "celular_particular"
  | "telefono_consulta"
  | "domicilio_consulta"
  | "matricula_prov"
  | "matricula_nac"
  | "provincia"
  | "categoria"
  | "especialidad"
  | "adherente"
  | "condicion_impositiva"
  | "fecha_ingreso"
  | "malapraxis"
  | "vencimiento_malapraxis"
  | "vencimiento_anssal"
  | "vencimiento_cobertura"
  | "anssal"
  | "cobertura"
  | "activo";

export type ExportColumn = { key: ExportColumnKey | string; header: string };
export type MedicoRow = Record<string, unknown>;

/**
 * KEYMAP: tries multiple possible keys for each "canonical" export key
 */
export const KEYMAP: Record<string, string[]> = {
  id: ["id", "ID", "Id"],

  nro_socio: ["nro_socio", "NRO_SOCIO", "socio", "SOCIO"],
  nombre: ["nombre", "NOMBRE", "ape_nom", "apellido_nombre", "APELLIDO_NOMBRE", "APE_NOM"],

  sexo: ["sexo", "SEXO"],
  documento: ["documento", "DOCUMENTO", "dni", "DNI"],

  mail_particular: ["mail_particular", "MAIL_PARTICULAR", "email", "EMAIL", "mail", "MAIL"],

  tele_particular: ["tele_particular", "TELE_PARTICULAR", "telefono_particular", "TELEFONO_PARTICULAR"],
  celular_particular: ["celular_particular", "CELULAR_PARTICULAR", "celular", "CELULAR"],

  telefono_consulta: [
    "telefono_consulta",
    "TELEFONO_CONSULTA",
    "tel_consulta",
    "TEL_CONSULTA",
    "telefonoConsulta",
    "TELEFONOCONSULTA",
  ],
  domicilio_consulta: ["domicilio_consulta", "DOMICILIO_CONSULTA"],

  matricula_prov: ["matricula_prov", "MATRICULA_PROV", "matricula", "MATRICULA"],
  matricula_nac: ["matricula_nac", "MATRICULA_NAC"],

  provincia: ["provincia", "PROVINCIA"],
  categoria: ["categoria", "CATEGORIA"],
  adherente: ["adherente", "ADHERENTE", "ES_ADHERENTE", "es_adherente"],

  condicion_impositiva: ["condicion_impositiva", "CONDICION_IMPOSITIVA", "condicionImpositiva"],

  fecha_ingreso: ["fecha_ingreso", "FECHA_INGRESO", "fechaIngreso", "FECHAINGRESO"],

  // especialidades (compat)
  especialidad: [
    "especialidad",
    "ESPECIALIDAD",
    "especialidades",
    "ESPECIALIDADES",
    "especialidad_nombre",
    "ESPECIALIDAD_NOMBRE",
    "especialidad1",
    "especialidad2",
    "especialidad3",
    "ESPECIALIDAD1",
    "ESPECIALIDAD2",
    "ESPECIALIDAD3",
  ],

  // vencimientos (compat)
  vencimiento_malapraxis: [
    "vencimiento_malapraxis",
    "VENCIMIENTO_MALAPRAXIS",
    "malapraxis_vencimiento",
    "malapraxis_vto",
    "MALAPRAXIS_VENCIMIENTO",
    "MALAPRAXIS_VTO",
    "vto_malapraxis",
    "VTO_MALAPRAXIS",
  ],
  vencimiento_anssal: [
    "vencimiento_anssal",
    "VENCIMIENTO_ANSSAL",
    "anssal_vencimiento",
    "anssal_vto",
    "ANSSAL_VENCIMIENTO",
    "ANSSAL_VTO",
    "vto_anssal",
    "VTO_ANSSAL",
  ],
  vencimiento_cobertura: [
    "vencimiento_cobertura",
    "VENCIMIENTO_COBERTURA",
    "cobertura_vencimiento",
    "cobertura_vto",
    "COBERTURA_VENCIMIENTO",
    "COBERTURA_VTO",
    "vto_cobertura",
    "VTO_COBERTURA",
  ],

  malapraxis: ["malapraxis", "MALAPRAXIS", "malapraxis_empresa", "MALAPRAXIS_EMPRESA"],
  anssal: ["anssal", "ANSSAL", "anssal_vto", "ANSSAL_VTO", "anssalVto"],
  cobertura: ["cobertura", "COBERTURA", "cobertura_vto", "COBERTURA_VTO", "coberturaVto"],

  activo: ["activo", "ACTIVO", "estado", "ESTADO", "EXISTE", "existe"],
};

export const DEFAULT_HEADERS: Record<string, string> = {
  id: "ID",
  nro_socio: "N° Socio",
  nombre: "Nombre completo",
  sexo: "Sexo",
  documento: "Documento",
  mail_particular: "Mail",
  tele_particular: "Teléfono",
  celular_particular: "Celular",
  telefono_consulta: "Teléfono Consultorio",
  domicilio_consulta: "Domicilio Consultorio",
  matricula_prov: "Matrícula Provincial",
  matricula_nac: "Matrícula Nacional",
  provincia: "Provincia",
  categoria: "Categoría",
  especialidad: "Especialidad",
  condicion_impositiva: "Condición Impositiva",
  adherente: "Adherente",
  fecha_ingreso: "Fecha de Ingreso",
  malapraxis: "Mala Praxis",
  vencimiento_malapraxis: "Venc. Mala Praxis",
  vencimiento_anssal: "Venc. ANSSAL",
  vencimiento_cobertura: "Venc. Cobertura",
  anssal: "ANSSAL",
  cobertura: "Cobertura",
  activo: "Activo",
};

function isNil(v: unknown) {
  return v === null || v === undefined || v === "";
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

/**
 * Return best value for a key (supports canonical keymap)
 */
export function pickValue(row: MedicoRow, key: string): string {
  const candidates = KEYMAP[key] ?? [key];
  for (const k of candidates) {
    const v = (row as any)?.[k];
    if (!isNil(v)) return toCleanString(v);
  }
  return "";
}

/**
 * For presets + other modules: return raw best value (not stringified)
 */
export function getCellValue(row: MedicoRow, key: string): any {
  const candidates = KEYMAP[key] ?? [key];
  for (const k of candidates) {
    const v = (row as any)?.[k];
    if (!isNil(v)) return v;
  }
  return "";
}

/* ===== Date helpers (used by presets) ===== */
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

/**
 * Map UI filters -> backend query params for GET /api/medicos/all
 * (only includes params that are safe to send; backend may ignore unknowns)
 */
export function mapUIToQuery(filters: any) {
  const otros = filters?.otros ?? {};
  const v = filters?.vencimientos ?? {};

  return {
    sexo: otros.sexo || undefined,
    estado: otros.estado || undefined,
    adherente: otros.adherente || undefined,
    provincia: otros.provincia || undefined,
    categoria: otros.categoria || undefined,
    condicion_impositiva: otros.condicionImpositiva || undefined,

    fecha_ingreso_desde: otros.fechaIngresoDesde || undefined,
    fecha_ingreso_hasta: otros.fechaIngresoHasta || undefined,

    malapraxis_vencida: v.malapraxisVencida ? "1" : undefined,
    malapraxis_por_vencer: v.malapraxisPorVencer ? "1" : undefined,

    anssal_vencido: v.anssalVencido ? "1" : undefined,
    anssal_por_vencer: v.anssalPorVencer ? "1" : undefined,

    cobertura_vencida: v.coberturaVencida ? "1" : undefined,
    cobertura_por_vencer: v.coberturaPorVencer ? "1" : undefined,

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
