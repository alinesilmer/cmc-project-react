"use client";

import type React from "react";
import { useEffect, useMemo, useState, useRef } from "react";
import styles from "./UsersList.module.scss";
import { http } from "../../lib/http";
import Button from "../../components/atoms/Button/Button";
import BackButton from "../../components/atoms/BackButton/BackButton";
import Modal from "../../components/atoms/Modal/Modal";
import FilterModal from "../../components/molecules/FilterModal/FilterModal";
import { useNavigate } from "react-router-dom";
import type { FilterSelection, MissingFieldKey } from "../../types/filters";
import { initialFilters } from "../../types/filters";
import { mapUIToQuery } from "./medicosExport";
import { getEspecialidadNameById } from "../../lib/especialidadesCatalog";

import { useMedicosExport } from "./useMedicosExport";

// ✅ LOGO FIJO DESDE ASSETS
import LogoCMCUrl from "../../assets/logoCMC.png";

type MedicoRow = Record<string, unknown>;

function normalizeBool(v: any): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const t = v.trim().toUpperCase();
    return ["1", "S", "SI", "TRUE", "T", "Y", "YES"].includes(t);
  }
  return false;
}

function normalizeText(v: any): string {
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function isEmptyValue(v: any): boolean {
  if (v === null || typeof v === "undefined") return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

function pickFirst(row: any, keys: string[]): any {
  for (const k of keys) {
    const v = row?.[k];
    if (!isEmptyValue(v)) return v;
  }
  return "";
}

function isActiveRow(row: any): boolean {
  if (typeof (row as any)?.activo !== "undefined") return Boolean(Number((row as any).activo));
  const ex = ((row as any)?.EXISTE ?? (row as any)?.existe ?? "").toString().trim().toUpperCase();
  return ex === "S";
}

function normalizeAdherente(row: any): boolean | null {
  const raw = (row as any)?.adherente ?? (row as any)?.ES_ADHERENTE ?? (row as any)?.es_adherente;
  if (raw === null || typeof raw === "undefined" || raw === "") return null;
  return normalizeBool(raw);
}

function toUserRow(m: any) {
  const status = isActiveRow(m) ? "activo" : "inactivo";
  const a = normalizeAdherente(m);
  const os = String(m?.obra_social ?? m?.OBRA_SOCIAL ?? "").trim();

  return {
    id: m?.id ?? m?.ID ?? null,
    nro_socio: m?.nro_socio ?? m?.NRO_SOCIO ?? null,
    name: m?.nombre ?? m?.NOMBRE ?? "—",
    email: m?.mail_particular ?? m?.MAIL_PARTICULAR ?? m?.email ?? "—",
    phone: m?.tele_particular ?? m?.TELE_PARTICULAR ?? "—",
    joinDate: (m?.fecha_ingreso ?? m?.FECHA_INGRESO ?? m?.joinDate) ?? null,
    status,
    matriculaProv: m?.MATRICULA_PROV ?? m?.matricula_prov ?? "—",
    adherente: a,
    obraSocial: os ? os : "—",
  };
}

type UserRow = ReturnType<typeof toUserRow>;

/* ================================
   ✅ Especialidades múltiples (FIX REAL)
   - Lee especialidad1..especialidadN
   - Dedup
   - Quita "médico" si hay otras
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
    // especialidad1 / ESPECIALIDAD1
    pushKey(`especialidad${i}`);
    pushKey(`ESPECIALIDAD${i}`);

    // especialidad_1 / ESPECIALIDAD_1
    pushKey(`especialidad_${i}`);
    pushKey(`ESPECIALIDAD_${i}`);

    // especialidad1_nombre / ESPECIALIDAD1_NOMBRE
    pushKey(`especialidad${i}_nombre`);
    pushKey(`ESPECIALIDAD${i}_NOMBRE`);

    // especialidad_1_nombre / ESPECIALIDAD_1_NOMBRE
    pushKey(`especialidad_${i}_nombre`);
    pushKey(`ESPECIALIDAD_${i}_NOMBRE`);
  }

  return out;
}

function getEspecialidadesTokens(row: any): string[] {
  const tokensRaw: string[] = [];

  // ✅ 1) columnas especialidad1..N (tu caso real)
  const cols = collectEspecialidadColumns(row, 12);
  for (const v of cols) tokensRaw.push(...splitTokens(v));

  // ✅ 2) compat: si backend manda "ESPECIALIDADES" como string/array
  const rawCombined =
    (row as any)?.ESPECIALIDADES ??
    (row as any)?.especialidades ??
    (row as any)?.ESPECIALIDAD ??
    (row as any)?.especialidad ??
    (row as any)?.ESPECIALIDAD_NOMBRE ??
    (row as any)?.especialidad_nombre ??
    null;

  for (const v of splitTokens(rawCombined)) tokensRaw.push(v);

  // limpiar + dedup
  const seen = new Set<string>();
  const out: string[] = [];

  for (const t0 of tokensRaw) {
    const t = String(t0 ?? "").trim();
    if (!t) continue;
    if (t === "0") continue;

    const n = normalizeText(t);
    if (!n) continue;

    // ✅ NO queremos que "Sin especialidad" cuente como especialidad
    if (n === "sin especialidad" || n === "sinespecialidad") continue;

    if (seen.has(n)) continue;
    seen.add(n);
    out.push(t);
  }

  // ✅ regla: si hay más de 1 y existe "médico", se elimina
  const hasMedico = out.some((x) => normalizeText(x) === "medico");
  if (hasMedico && out.length > 1) {
    return out.filter((x) => normalizeText(x) !== "medico");
  }

  return out;
}

function matchEspecialidad(row: any, selected: string): boolean {
  if (!selected) return true;

  // Cuando viene "id:X" del selector, comparar directamente contra nro_especialidad
  if (selected.startsWith("id:")) {
    const numId = Number(selected.slice(3));
    if (!isNaN(numId) && numId > 0) {
      const nroKeys = [
        "nro_especialidad",
        "nro_especialidad2",
        "nro_especialidad3",
        "nro_especialidad4",
        "nro_especialidad5",
        "nro_especialidad6",
      ];
      return nroKeys.some((k) => Number(row?.[k]) === numId);
    }
    return false;
  }

  // Fallback texto libre
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

const VENC_KEYS = {
  malapraxis: [
    "vencimiento_malapraxis",  // nombre real de la API
    "VENCIMIENTO_MALAPRAXIS",
    "malapraxis_vencimiento",
    "malapraxis_vto",
    "vto_malapraxis",
    "fecha_venc_malapraxis",
    "MALAPRAXIS_VENCIMIENTO",
    "MALAPRAXIS_VTO",
    "VTO_MALAPRAXIS",
  ],
  anssal: [
    "vencimiento_anssal",      // nombre real de la API
    "VENCIMIENTO_ANSSAL",
    "anssal_vencimiento",
    "anssal_vto",
    "vto_anssal",
    "fecha_venc_anssal",
    "ANSSAL_VENCIMIENTO",
    "ANSSAL_VTO",
    "VTO_ANSSAL",
  ],
  cobertura: [
    "vencimiento_cobertura",   // nombre real de la API
    "VENCIMIENTO_COBERTURA",
    "cobertura_vencimiento",
    "cobertura_vto",
    "vto_cobertura",
    "fecha_venc_cobertura",
    "COBERTURA_VENCIMIENTO",
    "COBERTURA_VTO",
    "VTO_COBERTURA",
  ],
} as const;

function getVencDate(row: MedicoRow, kind: keyof typeof VENC_KEYS): Date | null {
  const raw = pickFirst(row, [...VENC_KEYS[kind]]);
  return parseDateAny(raw);
}

/* ================================
   Faltantes
================================ */
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

  // ✅ incluimos variantes, pero igual la lógica principal está en getEspecialidadesTokens()
  especialidad: [
    "especialidad",
    "ESPECIALIDAD",
    "especialidades",
    "ESPECIALIDADES",
    "especialidad1",
    "especialidad2",
    "especialidad3",
    "ESPECIALIDAD1",
    "ESPECIALIDAD2",
    "ESPECIALIDAD3",
  ],

  condicion_impositiva: ["condicion_impositiva", "CONDICION_IMPOSITIVA", "condicionImpositiva"],
  malapraxis: ["MALAPRAXIS", "malapraxis", "MALAPRAXIS_EMPRESA", "malapraxis_empresa"],
};

function isMissingField(row: MedicoRow, field: MissingFieldKey): boolean {
  if (field === "especialidad") {
    // Chequear tokens por nombre
    if (getEspecialidadesTokens(row).length > 0) return false;
    // También chequear campos nro_especialidad numéricos (formato API)
    const nroKeys = [
      "nro_especialidad",
      "nro_especialidad2",
      "nro_especialidad3",
      "nro_especialidad4",
      "nro_especialidad5",
      "nro_especialidad6",
    ];
    return !nroKeys.some((k) => {
      const v = (row as any)?.[k];
      return v !== null && v !== undefined && v !== 0 && v !== "0" && v !== "";
    });
  }
  const raw = pickFirst(row, MISSING_FIELD_KEYS[field]);
  return isEmptyValue(raw);
}

/* ================================
   Aplica filtros (tabla)
================================ */
function applyMedicosFilters(rows: MedicoRow[], filters: FilterSelection): MedicoRow[] {
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

    // tiene_malapraxis
    if (o.tieneMalapraxis === "true") {
      const mp = String(pickFirst(row, ["malapraxis", "MALAPRAXIS"]) ?? "").trim();
      if (mp === "" || mp.toUpperCase() === "A") return false;
    }
    if (o.tieneMalapraxis === "false") {
      const mp = String(pickFirst(row, ["malapraxis", "MALAPRAXIS"]) ?? "").trim();
      if (mp !== "" && mp.toUpperCase() !== "A") return false;
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

    // ✅ filtro por especialidad contra TODAS las especialidades del médico
    if (o.especialidad && !matchEspecialidad(row, o.especialidad)) return false;

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

function matchesQuickSearch(row: any, q: string) {
  const s = normalizeText(q);
  if (!s) return true;

  const name = pickFirst(row, ["NOMBRE", "nombre", "apellido_nombre", "APELLIDO_NOMBRE", "ape_nom", "APE_NOM"]);
  const email = pickFirst(row, ["mail_particular", "MAIL_PARTICULAR", "email", "EMAIL"]);
  const nroSocio = pickFirst(row, ["NRO_SOCIO", "nro_socio"]);
  const matProv = pickFirst(row, ["MATRICULA_PROV", "matricula_prov"]);

  return (
    normalizeText(name).includes(s) ||
    normalizeText(email).includes(s) ||
    normalizeText(nroSocio).includes(s) ||
    normalizeText(matProv).includes(s)
  );
}

const PAGE_SIZE = 50;

const UsersList: React.FC = () => {
  const [rawUsers, setRawUsers] = useState<MedicoRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [initialized, setInitialized] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [isLastPage, setIsLastPage] = useState(false);
  const navigate = useNavigate();

  const [error, setError] = useState<string | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const { exportLoading, exportError, setExportError, onExportWithFilters } = useMedicosExport();

  // draft: lo que hay en el modal (no aplicado todavía)
  const [filters, setFilters] = useState<FilterSelection>(initialFilters);
  // committed: lo que se envió al servidor al clickear "Filtrar"
  const [committedFilters, setCommittedFilters] = useState<FilterSelection>(initialFilters);

  // ✅ Cache del logo en File (solo 1 fetch)
  const logoFilePromiseRef = useRef<Promise<File | null> | null>(null);
  const getFixedLogoFile = async (): Promise<File | null> => {
    if (logoFilePromiseRef.current) return logoFilePromiseRef.current;

    logoFilePromiseRef.current = (async () => {
      try {
        const res = await fetch(LogoCMCUrl);
        const blob = await res.blob();
        const type = blob.type || "image/png";
        const ext = type.includes("png") ? "png" : type.includes("jpeg") || type.includes("jpg") ? "jpg" : "img";
        return new File([blob], `logo.${ext}`, { type });
      } catch {
        return null;
      }
    })();

    return logoFilePromiseRef.current;
  };

  useEffect(() => {
    void getFixedLogoFile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleApplyFilters() {
    setPage(0);
    setCommittedFilters(filters);
    setIsExportOpen(false);
  }

  const resetFilters = () => {
    setFilters(initialFilters);
    setCommittedFilters(initialFilters);
    setPage(0);
    setExportError(null);
  };

  // --------- Fetch server-side: se dispara al cambiar committedFilters, searchTerm o page ----------
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    let cancelled = false;

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      if (cancelled) return;

      setLoading(true);
      setError(null);

      const q = searchTerm.trim();
      const filterParams = mapUIToQuery(committedFilters as any);
      const params: Record<string, unknown> = {
        ...filterParams,
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
      };
      if (q.length >= 2) params.q = q;

      try {
        const { data } = await http.get<MedicoRow[]>("/api/medicos/all", {
          baseURL: "",
          params,
          withCredentials: true,
        });
        if (cancelled) return;
        const rows: MedicoRow[] = Array.isArray(data) ? data : [];
        if (rows.length > 0) console.log("[DEBUG] primer row keys:", Object.keys(rows[0]), "\n[DEBUG] primer row:", JSON.stringify(rows[0]));
        setRawUsers(rows);
        setIsLastPage(rows.length < PAGE_SIZE);
        setInitialized(true);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || "Error al cargar los datos");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [committedFilters, searchTerm, page]);

  // El servidor ya aplica la mayoría de los filtros; client-only: adherente, tieneMalapraxis (belt-and-suspenders)
  const filteredUsers = useMemo(() => {
    return applyMedicosFilters(rawUsers, committedFilters).map(toUserRow);
  }, [rawUsers, committedFilters]);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchTerm(e.target.value);
    setPage(0);
  }

  async function handleExportWithFilters(format: "xlsx" | "csv", _ignoredLogo: File | null) {
    if (!filters.columns || filters.columns.length === 0) {
      setExportError("Seleccioná al menos una columna");
      return;
    }
    const cols = ["nro_socio", ...filters.columns.filter((c) => c !== "nro_socio")];
    const fixed: FilterSelection = { ...filters, columns: cols };
    const fixedLogo = await getFixedLogoFile();
    const ok = await onExportWithFilters(format, fixed, fixedLogo);
    if (ok) setIsExportOpen(false);
  }

  // ---- Chips de filtros activos ----
  type FilterChip = { key: string; label: string };

  const activeChips = useMemo((): FilterChip[] => {
    const chips: FilterChip[] = [];
    const o = committedFilters.otros;
    const v = committedFilters.vencimientos;
    const f = committedFilters.faltantes;

    if (o.estado) chips.push({ key: "estado", label: `Estado: ${o.estado === "activo" ? "Activo" : "Inactivo"}` });
    if (o.sexo) chips.push({ key: "sexo", label: `Sexo: ${o.sexo.toUpperCase()}` });
    if (o.provincia) chips.push({ key: "provincia", label: `Provincia: ${o.provincia}` });
    if (o.especialidad) {
      const id = o.especialidad.startsWith("id:") ? o.especialidad.slice(3) : null;
      const name = id ? (getEspecialidadNameById(id) ?? id) : o.especialidad;
      chips.push({ key: "especialidad", label: `Especialidad: ${name}` });
    }
    if (o.categoria) chips.push({ key: "categoria", label: `Categoría: ${o.categoria}` });
    if (o.condicionImpositiva) chips.push({ key: "condicionImpositiva", label: `Cond. imp.: ${o.condicionImpositiva}` });
    if (o.tieneMalapraxis) chips.push({ key: "tieneMalapraxis", label: o.tieneMalapraxis === "true" ? "Con mala praxis" : "Sin mala praxis" });
    if (o.adherente) chips.push({ key: "adherente", label: `Adherente: ${o.adherente === "si" ? "Sí" : "No"}` });
    if (o.fechaIngresoDesde || o.fechaIngresoHasta) {
      const label = [o.fechaIngresoDesde && `desde ${o.fechaIngresoDesde}`, o.fechaIngresoHasta && `hasta ${o.fechaIngresoHasta}`].filter(Boolean).join(" ");
      chips.push({ key: "fechaIngreso", label: `Ingreso: ${label}` });
    }

    if (v.malapraxisVencida) chips.push({ key: "malapraxisVencida", label: "Mala praxis vencida" });
    if (v.malapraxisPorVencer) chips.push({ key: "malapraxisPorVencer", label: "Mala praxis por vencer" });
    if (v.anssalVencido) chips.push({ key: "anssalVencido", label: "ANSSAL vencida" });
    if (v.anssalPorVencer) chips.push({ key: "anssalPorVencer", label: "ANSSAL por vencer" });
    if (v.coberturaVencida) chips.push({ key: "coberturaVencida", label: "Cobertura vencida" });
    if (v.coberturaPorVencer) chips.push({ key: "coberturaPorVencer", label: "Cobertura por vencer" });
    if (v.dias > 0) chips.push({ key: "dias", label: `Próximos ${v.dias} días` });
    if (v.fechaDesde || v.fechaHasta) {
      const label = [v.fechaDesde && `desde ${v.fechaDesde}`, v.fechaHasta && `hasta ${v.fechaHasta}`].filter(Boolean).join(" ");
      chips.push({ key: "fechaVenc", label: `Venc.: ${label}` });
    }

    if (f.enabled) {
      const fieldLabels: Record<string, string> = {
        telefono_consulta: "Tel. consultorio", domicilio_consulta: "Domicilio cons.",
        mail_particular: "Mail", tele_particular: "Tel. particular",
        celular_particular: "Celular", matricula_prov: "Matrícula prov.",
        matricula_nac: "Matrícula nac.", provincia: "Provincia",
        categoria: "Categoría", especialidad: "Especialidad",
        condicion_impositiva: "Cond. imp.", malapraxis: "Mala praxis",
      };
      chips.push({ key: "faltantes", label: `${f.mode === "missing" ? "Sin" : "Con"} ${fieldLabels[f.field] ?? f.field}` });
    }

    return chips;
  }, [committedFilters]);

  function removeFilterChip(chipKey: string) {
    const patchOtros = (patch: Partial<typeof initialFilters.otros>) =>
      (prev: FilterSelection): FilterSelection => ({
        ...prev,
        otros: { ...prev.otros, ...patch },
      });
    const patchVenc = (patch: Partial<typeof initialFilters.vencimientos>) =>
      (prev: FilterSelection): FilterSelection => ({
        ...prev,
        vencimientos: { ...prev.vencimientos, ...patch },
      });

    const updates: Record<string, (prev: FilterSelection) => FilterSelection> = {
      estado: patchOtros({ estado: "" }),
      sexo: patchOtros({ sexo: "" }),
      provincia: patchOtros({ provincia: "" }),
      especialidad: patchOtros({ especialidad: "" }),
      categoria: patchOtros({ categoria: "" }),
      condicionImpositiva: patchOtros({ condicionImpositiva: "" }),
      tieneMalapraxis: patchOtros({ tieneMalapraxis: "" }),
      adherente: patchOtros({ adherente: "" }),
      fechaIngreso: patchOtros({ fechaIngresoDesde: "", fechaIngresoHasta: "" }),
      malapraxisVencida: patchVenc({ malapraxisVencida: false }),
      malapraxisPorVencer: patchVenc({ malapraxisPorVencer: false }),
      anssalVencido: patchVenc({ anssalVencido: false }),
      anssalPorVencer: patchVenc({ anssalPorVencer: false }),
      coberturaVencida: patchVenc({ coberturaVencida: false }),
      coberturaPorVencer: patchVenc({ coberturaPorVencer: false }),
      dias: patchVenc({ dias: 0 }),
      fechaVenc: patchVenc({ fechaDesde: "", fechaHasta: "" }),
      faltantes: (prev) => ({ ...prev, faltantes: { ...prev.faltantes, enabled: false } }),
    };

    const updater = updates[chipKey];
    if (!updater) return;

    setFilters(updater);
    setCommittedFilters(updater);
    setPage(0);
  }

  if (loading && !initialized) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p>Cargando socios...</p>
        </div>
      </div>
    );
  }

  if (error && !initialized) {
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
          <h1 className={styles.title}>Socios</h1>
          <p className={styles.subtitle}>Gestión de médicos asociados</p>
        </div>
        <div className={styles.headerActions}>
          <BackButton />
          <Button variant="primary" onClick={() => navigate("/panel/register-socio")}>
            Agregar socio
          </Button>
          <Button onClick={() => setIsExportOpen(true)}>Filtrar y Exportar</Button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{filteredUsers.filter((u) => u.status === "activo").length}</div>
          <div className={styles.statLabel}>Activos (pág.)</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{filteredUsers.length}</div>
          <div className={styles.statLabel}>En esta página</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>
            {page + 1}{isLastPage ? "" : "+"}
          </div>
          <div className={styles.statLabel}>Página</div>
        </div>
      </div>

      <div className={styles.searchBar}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Buscar por nombre, matrícula o número de socio..."
          value={searchTerm}
          onChange={handleSearchChange}
        />
      </div>

      {activeChips.length > 0 && (
        <div className={styles.chipsRow}>
          {activeChips.map((chip) => (
            <span key={chip.key} className={styles.chip}>
              {chip.label}
              <button
                className={styles.chipRemove}
                onClick={() => removeFilterChip(chip.key)}
                aria-label={`Quitar filtro ${chip.label}`}
              >
                ×
              </button>
            </span>
          ))}
          <button className={styles.chipClearAll} onClick={resetFilters}>
            Limpiar todo
          </button>
        </div>
      )}

      {loading && initialized && (
        <div style={{ textAlign: "center", padding: "8px 0", opacity: 0.6, fontSize: 13 }}>
          Cargando...
        </div>
      )}

      {error && initialized && (
        <div style={{ textAlign: "center", padding: "8px 0", color: "red", fontSize: 13 }}>
          {error}
        </div>
      )}

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
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 16, textAlign: "center" }}>
                  No hay resultados con los filtros actuales.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.nro_socio ?? "—"}</td>
                  <td className={styles.nameCell}>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.phone}</td>
                  <td>{user.matriculaProv}</td>
                  <td>
                    <span className={user.status === "activo" ? styles.statusActive : styles.statusInactive}>
                      {user.status}
                    </span>
                  </td>
                  <td>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => navigate(`/panel/doctors/${user.id}`)}
                      aria-label={`Ver más de ${user.name}`}
                    >
                      Ver más
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.pagination}>
        <button
          className={styles.pageBtn}
          onClick={() => setPage(0)}
          disabled={page === 0 || loading}
          aria-label="Primera página"
        >
          ««
        </button>
        <button
          className={styles.pageBtn}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0 || loading}
        >
          ‹ Anterior
        </button>
        <span className={styles.pageInfo}>Página {page + 1}</span>
        <button
          className={styles.pageBtn}
          onClick={() => setPage((p) => p + 1)}
          disabled={isLastPage || loading}
        >
          Siguiente ›
        </button>
      </div>

      <Modal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} title="Filtrar y descargar" size="large">
        <FilterModal
          filters={filters}
          setFilters={setFilters}
          exportError={exportError}
          exportLoading={exportLoading}
          onExport={handleExportWithFilters}
          onApply={handleApplyFilters}
          onClose={() => setIsExportOpen(false)}
          resetFilters={resetFilters}
        />
      </Modal>
    </div>
  );
};

export default UsersList;
