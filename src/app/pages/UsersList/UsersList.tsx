"use client";

import type React from "react";
import { useEffect, useMemo, useState, useRef } from "react";
import styles from "./UsersList.module.scss";
import { getJSON } from "../../lib/http";
import Button from "../../components/atoms/Button/Button";
import BackButton from "../../components/atoms/BackButton/BackButton";
import Modal from "../../components/atoms/Modal/Modal";
import FilterModal from "../../components/molecules/FilterModal/FilterModal";
import { useNavigate } from "react-router-dom";
import type { FilterSelection, MissingFieldKey } from "../../types/filters";
import { initialFilters } from "../../types/filters";

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
    id: m?.ID ?? m?.id ?? m?.NRO_SOCIO ?? Math.random().toString(36).slice(2),
    nro_socio: m?.NRO_SOCIO ?? m?.nro_socio ?? null,
    name: m?.NOMBRE ?? m?.nombre ?? "—",
    email: m?.mail_particular ?? m?.email ?? "—",
    phone: m?.tele_particular ?? "—",
    joinDate: (m?.fecha_ingreso ?? m?.joinDate) ?? null,
    status,
    matriculaProv: m?.MATRICULA_PROV ?? m?.matricula_prov ?? "—",
    adherente: a,
    obraSocial: os ? os : "—",
  };
}

type UserRow = ReturnType<typeof toUserRow>;

/* ================================
   Especialidades múltiples (reglas)
================================ */
function getEspecialidadesTokens(row: any): string[] {
  const raw =
    row?.ESPECIALIDADES ??
    row?.especialidades ??
    row?.ESPECIALIDAD ??
    row?.especialidad ??
    row?.ESPECIALIDAD_NOMBRE ??
    row?.especialidad_nombre;

  let tokens: string[] = [];

  if (Array.isArray(raw) && raw.length && typeof raw[0] === "object") {
    for (const x of raw) {
      const name =
        x?.nombre ?? x?.NOMBRE ?? x?.label ?? x?.descripcion ?? x?.DESCRIPCION;
      if (!isEmptyValue(name)) tokens.push(String(name));
    }
  } else if (Array.isArray(raw)) {
    tokens = raw.map((x) => String(x ?? "").trim()).filter(Boolean);
  } else if (!isEmptyValue(raw)) {
    if (typeof raw === "string") {
      tokens.push(...raw.split(/[,;|]/).map((s) => s.trim()).filter(Boolean));
    } else {
      tokens.push(String(raw));
    }
  }

  const norm = (s: string) => normalizeText(s);

  const hasSin = tokens.some((t) => {
    const n = norm(t);
    return n === "sin especialidad" || n === "sinespecialidad";
  });

  if (hasSin || tokens.length === 0) tokens = ["médico"];

  // dedup
  const seen = new Set<string>();
  const dedup: string[] = [];
  for (const t of tokens) {
    const n = norm(t);
    if (!seen.has(n)) {
      seen.add(n);
      dedup.push(t);
    }
  }
  tokens = dedup;

  const hasMedico = tokens.some((t) => norm(t) === "medico");
  if (hasMedico && tokens.length > 1) {
    tokens = tokens.filter((t) => norm(t) !== "medico");
  }

  return tokens;
}

function matchEspecialidad(row: any, selected: string): boolean {
  if (!selected) return true;

  const sel = normalizeText(selected);

  // match por id o por texto: si selected es "12" y tokens tienen "12" o "cardiologia"
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
  especialidad: ["especialidad", "ESPECIALIDAD", "especialidades", "ESPECIALIDADES"],
  condicion_impositiva: ["condicion_impositiva", "CONDICION_IMPOSITIVA", "condicionImpositiva"],
  malapraxis: ["MALAPRAXIS", "malapraxis", "MALAPRAXIS_EMPRESA", "malapraxis_empresa"],
};

function isMissingField(row: MedicoRow, field: MissingFieldKey): boolean {
  if (field === "especialidad") {
    const tokens = getEspecialidadesTokens(row);
    const joined = normalizeText(tokens.join(", "));
    return joined === "" || joined === "sin especialidad" || joined === "sinespecialidad";
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

    // checkbox malapraxis (presencia)
    if (o.conMalapraxis) {
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

const UsersList: React.FC = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [rawUsers, setRawUsers] = useState<MedicoRow[]>([]);
  const [basePage, setBasePage] = useState<MedicoRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [remoteMode, setRemoteMode] = useState(false);
  const navigate = useNavigate();

  const [error, setError] = useState<string | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const { exportLoading, exportError, setExportError, onExportWithFilters } = useMedicosExport();

  const [filters, setFilters] = useState<FilterSelection>(initialFilters);

  // ✅ Cache del logo en File (solo 1 fetch)
  const logoFilePromiseRef = useRef<Promise<File | null> | null>(null);
  const getFixedLogoFile = async (): Promise<File | null> => {
    if (logoFilePromiseRef.current) return logoFilePromiseRef.current;

    logoFilePromiseRef.current = (async () => {
      try {
        const res = await fetch(LogoCMCUrl);
        const blob = await res.blob();

        const type = blob.type || "image/png";
        const ext =
          type.includes("png") ? "png" : type.includes("jpeg") || type.includes("jpg") ? "jpg" : "img";

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

  const resetFilters = () => {
    setFilters({
      columns: ["nombre", "documento", "mail_particular", "matricula_prov", "especialidad"],
      vencimientos: {
        malapraxisVencida: false,
        malapraxisPorVencer: false,
        anssalVencido: false,
        anssalPorVencer: false,
        coberturaVencida: false,
        coberturaPorVencer: false,
        fechaDesde: "",
        fechaHasta: "",
        dias: 0,
      },
      otros: {
        sexo: "",
        estado: "",
        adherente: "",
        provincia: "",
        especialidad: "",
        categoria: "",
        condicionImpositiva: "",
        fechaIngresoDesde: "",
        fechaIngresoHasta: "",
        conMalapraxis: false,
      },
      faltantes: {
        enabled: false,
        field: "telefono_consulta",
        mode: "missing",
      },
    });
    setExportError(null);
  };

  // --------- Carga inicial (página base sin q) ----------
  useEffect(() => {
    let ignore = false;

    async function loadBase() {
      setLoading(true);
      setError(null);

      try {
        const data = await getJSON<MedicoRow[]>("/api/medicos?limit=200");
        if (ignore) return;
        setBasePage(data);
        setRawUsers(data);
        setUsers(data.map(toUserRow));
      } catch (err: any) {
        if (ignore) return;
        setError(err?.message || "Error al cargar los datos");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadBase();
    return () => {
      ignore = true;
    };
  }, []);

  // --------- BÚSQUEDA REMOTA con debounce ----------
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    const q = searchTerm.trim();

    if (!q) {
      setRemoteMode(false);
      setRawUsers(basePage);
      setUsers(basePage.map(toUserRow));
      return;
    }

    const MIN_CHARS = 2;
    if (q.length < MIN_CHARS) {
      setRemoteMode(false);
      setRawUsers(basePage);
      setUsers(basePage.map(toUserRow));
      return;
    }

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const url = `/api/medicos?q=${encodeURIComponent(q)}&limit=200`;
        const data = await getJSON<MedicoRow[]>(url);
        setRemoteMode(true);
        setRawUsers(data);
        setUsers(data.map(toUserRow));
      } catch {
        setRemoteMode(false);
        setRawUsers(basePage);
        setUsers(basePage.map(toUserRow));
      }
    }, 300);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, basePage]);

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim();
    let rows = rawUsers;

    if (!remoteMode && q) {
      rows = rows.filter((r: any) => matchesQuickSearch(r, q));
    }

    rows = applyMedicosFilters(rows, filters);
    return rows.map(toUserRow);
  }, [rawUsers, searchTerm, remoteMode, filters]);

  const visibleUsers = filteredUsers;

  async function handleExportWithFilters(format: "xlsx" | "csv", _ignoredLogo: File | null) {
    if (!filters.columns || filters.columns.length === 0) {
      setExportError("Seleccioná al menos una columna");
      return;
    }

    // ✅ nro_socio siempre primero
    const cols = ["nro_socio", ...filters.columns.filter((c) => c !== "nro_socio")];
    const fixed: FilterSelection = { ...filters, columns: cols };

    // ✅ LOGO FIJO SIEMPRE
    const fixedLogo = await getFixedLogoFile();

    const ok = await onExportWithFilters(format, fixed, fixedLogo);
    if (ok) setIsExportOpen(false);
  }

  const missingLabelByKey: Record<MissingFieldKey, string> = {
    telefono_consulta: "Teléfono consultorio",
    domicilio_consulta: "Domicilio consultorio",
    mail_particular: "Mail",
    tele_particular: "Teléfono particular",
    celular_particular: "Celular",
    matricula_prov: "Matrícula provincial",
    matricula_nac: "Matrícula nacional",
    provincia: "Provincia",
    categoria: "Categoría",
    especialidad: "Especialidad",
    condicion_impositiva: "Condición impositiva",
    malapraxis: "Mala praxis",
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p>Cargando socios...</p>
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
          <div className={styles.statValue}>{users.length}</div>
          <div className={styles.statLabel}>Total de socios</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{users.filter((u) => u.status === "activo").length}</div>
          <div className={styles.statLabel}>Activos</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{filteredUsers.length}</div>
          <div className={styles.statLabel}>Filtrados</div>
        </div>
      </div>

      <div className={styles.searchBar}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Buscar por nombre, email, matrícula o número de socio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1 }}
          />

        
        </div>

      </div>

      
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
  {visibleUsers.length === 0 ? (
    <tr>
      <td colSpan={7} style={{ padding: 16, textAlign: "center" }}>
        No hay resultados con los filtros actuales.
      </td>
    </tr>
  ) : (
    visibleUsers.map((user) => (
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
