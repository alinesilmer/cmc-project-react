import type { FilterSelection } from "../types/filters";

export type PrestadorRow = Record<string, any>;

function normalize(v: any) {
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function pickFirst(row: any, keys: string[]) {
  for (const k of keys) {
    const v = row?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
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

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function inRange(d: Date, from?: Date | null, to?: Date | null) {
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

function getVencDate(row: PrestadorRow, kind: keyof typeof VENC_KEYS) {
  const raw = pickFirst(row, [...VENC_KEYS[kind]]);
  return parseDateAny(raw);
}

function isActivo(row: PrestadorRow) {
  const v = pickFirst(row, ["estado", "ESTADO", "activo", "ACTIVO", "habilitado", "HABILITADO"]);
  const s = normalize(v);

  if (typeof v === "boolean") return v;
  if (s === "activo" || s === "act" || s === "a" || s === "true" || s === "1" || s === "si" || s === "s")
    return true;
  if (s === "inactivo" || s === "ina" || s === "i" || s === "false" || s === "0" || s === "no" || s === "n")
    return false;

  // fallback: si no sabemos, no lo descartamos
  return true;
}

function isAdherente(row: PrestadorRow) {
  const v = pickFirst(row, ["adherente", "ADHERENTE", "es_adherente", "ES_ADHERENTE"]);
  if (typeof v === "boolean") return v;
  const s = normalize(v);
  if (s === "si" || s === "s" || s === "true" || s === "1") return true;
  if (s === "no" || s === "n" || s === "false" || s === "0") return false;
  // unknown -> null/false: acá lo dejamos como false para no “romper” filtros
  return false;
}

function getEspecialidadValue(row: PrestadorRow) {
  return (
    row?.especialidad ??
    row?.especialidad_id ??
    row?.ESPECIALIDAD ??
    row?.ESPECIALIDAD_ID ??
    row?.especialidades ??
    row?.ESPECIALIDADES
  );
}

function matchEspecialidad(row: PrestadorRow, selected: string) {
  if (!selected) return true;

  const sel = normalize(selected);
  const v = getEspecialidadValue(row);

  if (Array.isArray(v)) {
    return v.some((x) => {
      const id = (x as any)?.id ?? (x as any)?.ID ?? (x as any)?.value ?? x;
      const nid = normalize(id);
      return nid === sel || nid.includes(sel);
    });
  }

  const nv = normalize(v);
  return nv === sel || nv.includes(sel);
}

export function applyPrestadoresFilters(rows: PrestadorRow[], filters: FilterSelection) {
  const today = startOfDay(new Date());

  // Pre-normalizamos (mejor rendimiento)
  const fSexo = normalize(filters.otros.sexo);
  const fProv = normalize(filters.otros.provincia);
  const fLoc = normalize(filters.otros.localidad);
  const fCat = normalize(filters.otros.categoria);
  const fCI = normalize(filters.otros.condicionImpositiva);
  const fEsp = String(filters.otros.especialidad || "");

  const fromIngreso = filters.otros.fechaIngresoDesde ? parseDateAny(filters.otros.fechaIngresoDesde) : null;
  const toIngreso = filters.otros.fechaIngresoHasta ? parseDateAny(filters.otros.fechaIngresoHasta) : null;

  const fromVto = filters.vencimientos.fechaDesde ? parseDateAny(filters.vencimientos.fechaDesde) : null;
  const toVtoByDate = filters.vencimientos.fechaHasta ? parseDateAny(filters.vencimientos.fechaHasta) : null;
  const toVto = filters.vencimientos.dias > 0 ? addDays(today, filters.vencimientos.dias) : toVtoByDate;

  const wantCheckboxVenc =
    filters.vencimientos.malapraxisVencida ||
    filters.vencimientos.malapraxisPorVencer ||
    filters.vencimientos.anssalVencido ||
    filters.vencimientos.anssalPorVencer ||
    filters.vencimientos.coberturaVencida ||
    filters.vencimientos.coberturaPorVencer;

  const wantsWindow = Boolean(filters.vencimientos.fechaDesde || filters.vencimientos.fechaHasta || filters.vencimientos.dias > 0);
  const windowFrom = fromVto ?? today;
  const windowTo = toVto ?? null;

  return rows.filter((row) => {
    // -----------------------------
    // OTROS (según tu tipo actual)
    // -----------------------------
    if (fSexo && !normalize(pickFirst(row, ["sexo", "SEXO"])).includes(fSexo)) return false;

    if (fProv && !normalize(pickFirst(row, ["provincia", "PROVINCIA"])).includes(fProv)) return false;
    if (fLoc && !normalize(pickFirst(row, ["localidad", "LOCALIDAD"])).includes(fLoc)) return false;

    if (filters.otros.categoria) {
      const cat = normalize(pickFirst(row, ["categoria", "CATEGORIA"]));
      if (cat !== fCat) return false;
    }

    if (filters.otros.condicionImpositiva) {
      const ci = normalize(
        pickFirst(row, ["condicion_impositiva", "CONDICION_IMPOSITIVA", "condicionImpositiva"])
      );
      if (ci !== fCI) return false;
    }

    if (filters.otros.especialidad && !matchEspecialidad(row, fEsp)) return false;

    // -----------------------------
    // ESTADO / ADHERENTE
    // -----------------------------
    if (filters.otros.estado === "activo" && !isActivo(row)) return false;
    if (filters.otros.estado === "inactivo" && isActivo(row)) return false;

    if (filters.otros.adherente === "si" && !isAdherente(row)) return false;
    if (filters.otros.adherente === "no" && isAdherente(row)) return false;

    // -----------------------------
    // FECHA INGRESO
    // -----------------------------
    if (filters.otros.fechaIngresoDesde || filters.otros.fechaIngresoHasta) {
      const fechaIng = parseDateAny(
        pickFirst(row, ["fecha_ingreso", "FECHA_INGRESO", "fechaIngreso", "FECHAINGRESO"])
      );
      if (!fechaIng) return false;
      if (!inRange(startOfDay(fechaIng), fromIngreso, toIngreso)) return false;
    }

    // -----------------------------
    // VENCIMIENTOS
    // -----------------------------
    if (wantCheckboxVenc || wantsWindow) {
      const evalVenc = (d: Date | null, wantVencida: boolean, wantPorVencer: boolean) => {
        if (!d) return false;
        const sd = startOfDay(d);

        const expired = sd.getTime() < today.getTime();
        const inWindow = inRange(sd, windowFrom, windowTo);

        const okVencida = wantVencida ? (expired && (wantsWindow ? inWindow : true)) : false;
        const okPorVencer = wantPorVencer ? (!expired && inWindow) : false;

        return okVencida || okPorVencer;
      };

      const mp = getVencDate(row, "malapraxis");
      const an = getVencDate(row, "anssal");
      const cb = getVencDate(row, "cobertura");

      const matchesByCheckbox =
        evalVenc(mp, filters.vencimientos.malapraxisVencida, filters.vencimientos.malapraxisPorVencer) ||
        evalVenc(an, filters.vencimientos.anssalVencido, filters.vencimientos.anssalPorVencer) ||
        evalVenc(cb, filters.vencimientos.coberturaVencida, filters.vencimientos.coberturaPorVencer);

      if (wantCheckboxVenc) {
        if (!matchesByCheckbox) return false;
      } else {
        // ventana sin checkbox: cualquiera en ventana (vencida o futura)
        const anyIn =
          (mp && inRange(startOfDay(mp), windowFrom, windowTo)) ||
          (an && inRange(startOfDay(an), windowFrom, windowTo)) ||
          (cb && inRange(startOfDay(cb), windowFrom, windowTo));
        if (!anyIn) return false;
      }
    }

    return true;
  });
}
