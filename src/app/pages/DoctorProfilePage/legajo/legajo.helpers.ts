import { UPDATE_WHITELIST } from "../api";
import { formatFecha } from "@/app/shared/lib/fechas";

/* ===================== helpers labels ===================== */
export const ATTACH_PRETTY: Record<string, string> = {
  attach_titulo: "Título",
  attach_matricula_nac: "Matrícula nacional",
  attach_matricula_prov: "Matrícula provincial",
  attach_resolucion: "Resolución",
  attach_habilitacion_municipal: "Habilitación municipal",
  attach_cuit: "CUIT",
  attach_condicion_impositiva: "Condición impositiva",
  attach_anssal: "ANSSAL",
  attach_malapraxis: "Malapraxis",
  attach_cbu: "CBU",
  attach_dni: "Documento",
};

export const ATTACH_KEYS = Object.keys(ATTACH_PRETTY);

export const stripAttach = (k: string) => k.replace(/^attach_/, "").toLowerCase();

export function prettyFromAnyLabel(label: string) {
  if (label.startsWith("attach_")) return ATTACH_PRETTY[label] ?? label;
  const words = label.replace(/_/g, " ").toLowerCase().split(" ");
  const cap = words
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
  return cap.replace(/\bDni\b/, "Documento").replace(/\bCuit\b/, "CUIT");
}

export const formatOption = (opt: string) =>
  opt === "otro" ? "Otro" : ATTACH_PRETTY[opt] ?? opt;

export const normalizeForCompare = (label: string) => stripAttach(label);

export const getFechaIngreso = (obj: unknown): string | null => {
  const o = obj as Record<string, string | null | undefined> | null | undefined;
  const v =
    o?.fecha_ingreso ??
    o?.fechaIngreso ??
    o?.FECHA_INGRESO ??
    o?.fec_ingreso ??
    o?.FEC_INGRESO ??
    null;
  return v === undefined ? null : v;
};

/** El texto de un error capturado (axios, Error o lo que sea). */
export const mensajeDe = (e: unknown): string | undefined =>
  (e as { message?: string } | null)?.message;

const WL = new Set<string>(UPDATE_WHITELIST as unknown as string[]);
WL.add("fecha_ingreso");

const DATE_FIELDS = new Set([
  "fecha_nac",
  "fecha_recibido",
  "fecha_matricula",
  "fecha_resolucion",
  "vencimiento_anssal",
  "vencimiento_malapraxis",
  "vencimiento_cobertura",
  "fecha_ingreso",
]);

const INT_FIELDS = new Set([
  "anssal",
  "cobertura",
  "nro_socio",
  "matricula_prov",
  "matricula_nac",
]);

export const isBlankish = (v: unknown) =>
  v === undefined || v === null || (typeof v === "string" && v.trim() === "");
export const isDashish = (v: unknown) => typeof v === "string" && /^-+$/.test(v.trim());

const toYmd2 = (v: unknown): string | null => {
  if (!v) return null;
  if (v instanceof Date && !isNaN(v.getTime())) {
    const d = v as Date;
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  }
  const s = String(v).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s;
};

export function normalizePatch(input: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, raw] of Object.entries(input || {})) {
    if (!WL.has(k)) continue;
    if (isBlankish(raw) || isDashish(raw)) {
      out[k] = null;
      continue;
    }
    if (DATE_FIELDS.has(k)) {
      out[k] = toYmd2(raw);
      continue;
    }
    if (INT_FIELDS.has(k)) {
      const s = String(raw).replace(/\./g, "").replace(/,/g, "").trim();
      out[k] = /^\d+$/.test(s) ? Number(s) : null;
      continue;
    }
    out[k] = raw;
  }
  return out;
}

export function toYmd(d?: Date | null): string | null {
  if (!d) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Parse a YYYY-MM-DD string as LOCAL midnight (not UTC). new Date("2024-01-15") parses as UTC midnight which in AR (UTC-3) becomes Jan 14 at 21:00.
export function parseLocalDate(s: string): Date {
  const parts = s.split("-");
  if (parts.length === 3) {
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);
    if (y && m && d) return new Date(y, m - 1, d);
  }
  return new Date(s);
}

export const fmt = (v: unknown) =>
  v === undefined || v === null || v === "" ? "—" : String(v);
// Fecha de nacimiento e ingreso son fechas de calendario: con `new Date(s)` el parser las lee como UTC y mostraba el día anterior.
export const fmtDate = (s?: string | null) => (s ? formatFecha(s) : "—");

export const soloDigitos = (v: unknown) => (v == null ? "" : String(v).replace(/\D/g, ""));

export const DEFAULT_LABELS = [...ATTACH_KEYS, "otro"];
