import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { saveAs } from "file-saver";
import { FileSpreadsheet } from "lucide-react";
import ExcelJS from "exceljs";

import styles from "./PadronSucio.module.scss";
import Button from "../../components/atoms/Button/Button";
import Logo from "../../assets/logoCMC.png";

type ObraSocial = {
  NRO_OBRA_SOCIAL: number;
  NOMBRE: string;
  CODIGO?: string | null;
  ACTIVA?: "S" | "N" | string;
};

type Prestador = {
  id?: number | string | null;
  nro_socio?: string | number | null;
  socio?: string | number | null;
  nombre?: string | null;
  apellido_nombre?: string | null;
  ape_nom?: string | null;
  matricula_prov?: string | number | null;
  telefono_consulta?: any;

  especialidades?: string[] | null;
  especialidad?: string | null;

  domicilio_consulta?: string | null;
  mail_particular?: string | null;
};

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.toString?.() ||
  (import.meta as any).env?.VITE_API_BASE?.toString?.() ||
  "/api";

const ENDPOINTS = {
  obrasSociales: `${API_BASE}/api/obras_social/`,
  medicosByOS: (nroOS: number) =>
    `${API_BASE}/api/padrones/obras-sociales/${nroOS}/medicos`,
  prestadorDetailCandidates: (id: string) => [
    `${API_BASE}/api/prestadores/${id}`,
    `${API_BASE}/api/medicos/${id}`,
    `${API_BASE}/api/doctores/${id}`,
  ],
  prestadorByNroSocioCandidates: (nro: string) => [
    `${API_BASE}/api/medicos?nro_socio=${encodeURIComponent(nro)}`,
    `${API_BASE}/api/medicos?NRO_SOCIO=${encodeURIComponent(nro)}`,
    `${API_BASE}/api/medicos/${encodeURIComponent(nro)}`,
  ],
};

// Fuente de padrón (NO se muestra)
const SOURCE_OS_ID = Number((import.meta as any).env?.VITE_PADRON_SOURCE_OS_ID ?? 0);
const SOURCE_OS_NAME_KEY = "asociacion mutual sancor";

function fmtDate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

function safeStr(v: unknown) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function cleanText(v: unknown) {
  return safeStr(v)
    .replace(/^'+/, "")
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function digitsOnly(v: unknown) {
  const s = cleanText(v);
  return s.replace(/\D+/g, "");
}

// ✅ Heurística: detectar teléfono “malo/truncado”
function isBadPhone(raw: unknown) {
  const d = digitsOnly(raw);
  if (!d) return true;
  if (d === "0") return true;
  if (d === "2147483647") return true; // int32 max (dato roto/casteado)
  if (d.length <= 4) return true; // típico truncado (ej "3794")
  return false;
}

function pickNombre(p: Prestador) {
  return p.apellido_nombre ?? p.ape_nom ?? p.nombre ?? "";
}
function pickNroPrestador(p: Prestador) {
  return p.nro_socio ?? p.socio ?? "";
}
function pickMatriculaProv(p: Prestador) {
  return p.matricula_prov ?? "";
}
function pickTelefonoConsulta(p: Prestador) {
  return p.telefono_consulta ?? "";
}
function pickDomicilioConsulta(p: Prestador) {
  return p.domicilio_consulta ?? "";
}

// ==========================
// ESPECIALIDADES
// ==========================
function coerceToStringArray(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => safeStr(x));
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return [];
    if (/[;,|]/.test(s)) return s.split(/[;,|]/g).map((x) => x.trim());
    return [s];
  }
  return [];
}

function cleanEspecialidades(arr: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of arr) {
    const t = safeStr(raw).trim();
    if (!t) continue;
    if (t === "0") continue;

    const key = normalize(t);
    if (!key) continue;
    if (seen.has(key)) continue;

    seen.add(key);
    out.push(t);
  }
  return out;
}

function stripMedicoWhenMultiple(list: string[]): string[] {
  if (list.length <= 1) return list;
  const filtered = list.filter((x) => normalize(x) !== "medico");
  return filtered.length ? filtered : list;
}

function pickEspecialidadesRawList(p: Prestador): string[] {
  const list = Array.isArray(p.especialidades) ? p.especialidades : [];
  const cleaned = cleanEspecialidades(list);

  if (cleaned.length) return stripMedicoWhenMultiple(cleaned);

  const single = safeStr(p.especialidad).trim();
  const singleClean = single ? cleanEspecialidades([single]) : [];
  return stripMedicoWhenMultiple(singleClean);
}

// ==========================
// Servicios detection
// ==========================
const DIAG_IMG_SERVICE_ONLY_NRO_SOCIO = new Set(["9975", "9761", "9727", "9674"]);

function pickNroSocioAsKey(p: Prestador): string {
  const v = pickNroPrestador(p);
  const s = safeStr(v).trim();
  return s.replace(/\.0$/, "");
}

function canonicalLabel(label: string) {
  const k = normalize(label);
  if (k.includes("diagnostico por imagen")) return "Diagnóstico por Imagen";
  if (k.includes("ecografia")) return "Ecografía";
  return safeStr(label).trim();
}

function isServiceLabelForPrestador(p: Prestador, label: string) {
  const key = normalize(label);
  if (!key) return false;

  if (key.includes("ecografista")) return false;
  if (key.includes("ecografistas")) return false;

  if (key.includes("diagnostico por imagen")) {
    const nro = pickNroSocioAsKey(p);
    return DIAG_IMG_SERVICE_ONLY_NRO_SOCIO.has(nro);
  }

  if (key.includes("ecografia")) return true;

  return false;
}

function splitEspecialidadesYServicios(p: Prestador) {
  const raw = pickEspecialidadesRawList(p);

  const especialidades: string[] = [];
  const servicios: string[] = [];

  for (const lab of raw) {
    const canon = canonicalLabel(lab);
    if (isServiceLabelForPrestador(p, canon)) servicios.push(canon);
    else especialidades.push(canon);
  }

  return {
    especialidades: cleanEspecialidades(especialidades),
    servicios: cleanEspecialidades(servicios),
  };
}

function pickEspecialidadTop3WithoutServicesOrMedico(p: Prestador) {
  const { especialidades } = splitEspecialidadesYServicios(p);
  const top = especialidades.slice(0, 3).join(", ");
  return top.trim() ? top : "Médico";
}

// ===================================
// Backend → UI
// ===================================
function mapObraSocialRawToOS(raw: any): ObraSocial {
  const nro =
    raw?.NRO_OBRA_SOCIAL ??
    raw?.NRO_OBRASOCIAL ??
    raw?.nro_obra_social ??
    raw?.nro_obrasocial ??
    0;

  const nombre = raw?.NOMBRE ?? raw?.OBRA_SOCIAL ?? raw?.obra_social ?? raw?.nombre ?? "";

  const codigo =
    raw?.CODIGO ??
    (Number.isFinite(Number(nro)) ? `OS${String(Number(nro)).padStart(3, "0")}` : null);

  const activa = raw?.ACTIVA ?? raw?.MARCA ?? undefined;

  return {
    NRO_OBRA_SOCIAL: Number(nro),
    NOMBRE: String(nombre),
    CODIGO: codigo,
    ACTIVA: activa,
  };
}

async function fetchObrasSociales(): Promise<ObraSocial[]> {
  const { data } = await axios.get(ENDPOINTS.obrasSociales);
  const arr = Array.isArray(data) ? data : [];
  return arr.map(mapObraSocialRawToOS);
}

function unwrapPrestadorSource(it: any) {
  return it?.prestador ?? it?.medico ?? it?.doctor ?? it?.data ?? it?.item ?? it;
}

function mapItemToPrestador(it: any): Prestador {
  const src = unwrapPrestadorSource(it);

  const id = src?.ID ?? src?.id ?? it?.ID ?? it?.id ?? null;

  const nro =
    src?.NRO_SOCIO ??
    src?.nro_socio ??
    src?.SOCIO ??
    src?.socio ??
    it?.NRO_SOCIO ??
    it?.nro_socio ??
    it?.SOCIO ??
    it?.socio ??
    null;

  const nombre = src?.NOMBRE ?? src?.nombre ?? it?.NOMBRE ?? it?.nombre ?? null;

  const matricula_prov =
    src?.MATRICULA_PROV ??
    src?.matricula_prov ??
    it?.MATRICULA_PROV ??
    it?.matricula_prov ??
    null;

  // 👇 ojo: esto puede venir truncado. Lo arreglamos por enrichment.
  const telefono_consulta =
    src?.TELEFONO_CONSULTA ??
    src?.telefono_consulta ??
    it?.TELEFONO_CONSULTA ??
    it?.telefono_consulta ??
    null;

  const especialidadesRaw =
    src?.ESPECIALIDADES ?? src?.especialidades ?? it?.ESPECIALIDADES ?? it?.especialidades ?? null;

  const especialidadSingle =
    src?.ESPECIALIDAD ?? src?.especialidad ?? it?.ESPECIALIDAD ?? it?.especialidad ?? null;

  const especialidades = cleanEspecialidades(coerceToStringArray(especialidadesRaw));
  const especialidad = especialidades[0] ?? (especialidadSingle ? safeStr(especialidadSingle) : null);

  const domicilio_consulta =
    src?.DOMICILIO_CONSULTA ??
    src?.domicilio_consulta ??
    it?.DOMICILIO_CONSULTA ??
    it?.domicilio_consulta ??
    null;

  return {
    id,
    nro_socio: nro,
    socio: nro,
    apellido_nombre: nombre,
    nombre: nombre,
    matricula_prov,
    telefono_consulta,
    especialidades,
    especialidad,
    domicilio_consulta,
  };
}

async function fetchPrestadoresAllPages(nroOS: number): Promise<Prestador[]> {
  const PAGE_SIZE = 200;
  let page = 1;
  const out: Prestador[] = [];
  let total: number | null = null;

  while (true) {
    const { data } = await axios.get(ENDPOINTS.medicosByOS(nroOS), {
      params: { page, size: PAGE_SIZE },
      timeout: 25_000,
    });

    if (Array.isArray(data)) return data.map(mapItemToPrestador);

    const items = Array.isArray(data?.items) ? data.items : [];
    total = Number.isFinite(data?.total) ? Number(data.total) : total;

    for (const it of items) out.push(mapItemToPrestador(it));

    if (items.length === 0) break;
    if (total !== null && out.length >= total) break;

    page += 1;
    if (page > 10000) break;
  }

  return out;
}

async function fetchPrestadorByNroSocio(nro: string): Promise<Prestador | null> {
  const urls = ENDPOINTS.prestadorByNroSocioCandidates(nro);

  for (const url of urls) {
    try {
      const { data } = await axios.get(url, { timeout: 15_000 });

      if (Array.isArray(data)) {
        const first = data[0];
        if (first) return mapItemToPrestador(first);
        continue;
      }

      if (Array.isArray(data?.items)) {
        const first = data.items[0];
        if (first) return mapItemToPrestador(first);
        continue;
      }

      if (data) return mapItemToPrestador(data);
    } catch {
      // next
    }
  }

  console.warn(`[EXTRA] No se encontró prestador para nro_socio=${nro} en api/medicos.`);
  return null;
}

// ==========================
// Enriquecimiento SOLO EXCEL
// ✅ AHORA TRAE TAMBIÉN TELEFONO (para arreglar truncados)
// ==========================
const XLSX_REQ_TIMEOUT_MS = 12_000;
const XLSX_CONTACT_CONCURRENCY = 4;
const XLSX_ENRICH_MAX = 700;
const CONTACT_CACHE_MAX = 5000;

type ContactoPayload = Pick<Prestador, "domicilio_consulta" | "telefono_consulta">;
const contactoCache = new Map<string, ContactoPayload>();

function cacheSetContacto(id: string, payload: ContactoPayload) {
  if (contactoCache.size > CONTACT_CACHE_MAX) contactoCache.clear();
  contactoCache.set(id, payload);
}

async function fetchContactoById(id: string, signal?: AbortSignal): Promise<ContactoPayload> {
  const cached = contactoCache.get(id);
  if (cached) return cached;

  const urls = ENDPOINTS.prestadorDetailCandidates(id);

  for (const url of urls) {
    try {
      const { data } = await axios.get(url, { signal, timeout: XLSX_REQ_TIMEOUT_MS } as any);
      const src = unwrapPrestadorSource(data);

      const domicilio_consulta =
        src?.DOMICILIO_CONSULTA ??
        src?.domicilio_consulta ??
        data?.DOMICILIO_CONSULTA ??
        data?.domicilio_consulta ??
        null;

      // ✅ IMPORTANTE: traer teléfono del endpoint detalle (puede venir como TELEFONO_CONSULTA o TELE_PARTICULAR)
      const telefono_consulta =
        src?.TELEFONO_CONSULTA ??
        src?.telefono_consulta ??
        src?.TELE_PARTICULAR ??
        src?.tele_particular ??
        data?.TELEFONO_CONSULTA ??
        data?.telefono_consulta ??
        data?.TELE_PARTICULAR ??
        data?.tele_particular ??
        null;

      const payload: ContactoPayload = { domicilio_consulta, telefono_consulta };
      cacheSetContacto(id, payload);
      return payload;
    } catch (e: any) {
      if (signal?.aborted) throw e;
    }
  }

  const payload: ContactoPayload = { domicilio_consulta: null, telefono_consulta: null };
  cacheSetContacto(id, payload);
  return payload;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  signal: AbortSignal | undefined,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length) as any;
  let i = 0;

  async function worker() {
    while (true) {
      if (signal?.aborted) return;
      const idx = i++;
      if (idx >= items.length) return;
      try {
        results[idx] = await fn(items[idx]);
      } catch {
        if (signal?.aborted) return;
        results[idx] = null as any;
      }
    }
  }

  const workers = Array.from({ length: Math.max(1, limit) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function enrichForExcel(rows: Prestador[], signal?: AbortSignal): Promise<Prestador[]> {
  const needAll = rows
    .map((p, idx) => ({ p, idx }))
    .filter(({ p }) => {
      const missAddr = !cleanText(p.domicilio_consulta).trim() && !!p.id;
      const badTel = isBadPhone(p.telefono_consulta) && !!p.id;
      return missAddr || badTel;
    });

  if (needAll.length === 0) return rows;
  if (signal?.aborted) return rows;

  const need = needAll.slice(0, XLSX_ENRICH_MAX);

  const fetched = await mapWithConcurrency(
    need,
    XLSX_CONTACT_CONCURRENCY,
    signal,
    async ({ p, idx }) => {
      const c = await fetchContactoById(String(p.id), signal);
      return { idx, c };
    }
  );

  const out = rows.slice();
  for (const item of fetched) {
    if (!item) continue;
    const { idx, c } = item as any;
    const prev = out[idx];

    const prevTelBad = isBadPhone(prev.telefono_consulta);
    const newTelBad = isBadPhone(c.telefono_consulta);

    out[idx] = {
      ...prev,
      domicilio_consulta: cleanText(prev.domicilio_consulta)
        ? prev.domicilio_consulta
        : c.domicilio_consulta,
      // ✅ si el tel del listado está truncado/roto, reemplazalo por el del detalle
      telefono_consulta: prevTelBad && !newTelBad ? c.telefono_consulta : prev.telefono_consulta,
    };
  }

  return out;
}

// ======================================================
// DEDUP
// ======================================================
function dedupPrestadoresKeepMostEspecialidades(rows: Prestador[]): Prestador[] {
  const bestByKey = new Map<string, Prestador>();

  const makeKey = (p: Prestador) => {
    const id = safeStr(p.id).trim();
    if (id) return `id:${id}`;
    const nro = normalize(safeStr(pickNroPrestador(p)));
    const mat = normalize(safeStr(pickMatriculaProv(p)));
    const nom = normalize(safeStr(pickNombre(p)));
    return `mix:${nro}|${mat}|${nom}`;
  };

  const score = (p: Prestador) => {
    const { especialidades } = splitEspecialidadesYServicios(p);
    return Math.max(1, especialidades.length);
  };

  for (const p of rows) {
    const key = makeKey(p);
    const prev = bestByKey.get(key);
    if (!prev) {
      bestByKey.set(key, p);
      continue;
    }
    if (score(p) > score(prev)) bestByKey.set(key, p);
  }

  return Array.from(bestByKey.values());
}

// ======================================================
// LOGO: convertir import a base64 para ExcelJS
// ======================================================
async function toPngBase64(assetUrl: string): Promise<string> {
  const res = await fetch(assetUrl);
  const blob = await res.blob();

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const idx = dataUrl.indexOf("base64,");
  return idx >= 0 ? dataUrl.slice(idx + "base64,".length) : dataUrl;
}

function tryImageTypeFromDataUrl(dataUrl: string): "png" | "jpeg" {
  const s = dataUrl.toLowerCase();
  if (s.startsWith("data:image/jpeg") || s.startsWith("data:image/jpg")) return "jpeg";
  return "png";
}

// ======================================================
// ✅ SERVICIOS MANUALES
// ======================================================
type ManualServiceRow = {
  nro_socio: string;
  prestador: string;
  matricula: string;
  direccion: string;
  telefono: string;
  servicio: string;
};

const MANUAL_SERVICES: ManualServiceRow[] = [
  {
    nro_socio: "9931",
    prestador: "CENTRO RADIOLOGICO(COLLANTES)",
    matricula: "159",
    direccion: "SAN MARTIN 1656",
    telefono: "4463973",
    servicio: "Servicio",
  },
  {
    nro_socio: "9951",
    prestador: "SERV.ECODIAG.DRAS VAZQUEZ/BLAN",
    matricula: "1013",
    direccion: "3 DE ABRIL 869,CTRO.MEDICO",
    telefono: "4230508",
    servicio: "Servicio",
  },
  {
    nro_socio: "9901",
    prestador: "INST.HEMOTERAPIA",
    matricula: "1780",
    direccion: "CORDOBA 666",
    telefono: "4430078",
    servicio: "Servicio",
  },
];

const EXTRA_SERVICE_NROS_FROM_API = ["9696"];

function manualToPrestador(m: ManualServiceRow): Prestador {
  return {
    id: null,
    nro_socio: m.nro_socio,
    socio: m.nro_socio,
    apellido_nombre: m.prestador,
    nombre: m.prestador,
    matricula_prov: m.matricula,
    telefono_consulta: m.telefono,
    domicilio_consulta: m.direccion,
    especialidades: null,
    especialidad: null,
  };
}

type ExportingMode = null | "excel";

const PadronSucio = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [prestadores, setPrestadores] = useState<Prestador[]>([]);
  const [exporting, setExporting] = useState<ExportingMode>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [logoType, setLogoType] = useState<"png" | "jpeg">("png");
  const [logoBase64, setLogoBase64] = useState<string>("");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // logo
        try {
          const res = await fetch(Logo as unknown as string);
          const blob = await res.blob();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          if (alive) {
            setLogoType(tryImageTypeFromDataUrl(dataUrl));
            setLogoBase64(await toPngBase64(Logo as unknown as string));
          }
        } catch (e) {
          console.warn("No se pudo cargar logo:", e);
        }

        setLoading(true);
        setError(null);

        const obras = await fetchObrasSociales();
        if (!alive) return;

        let os: ObraSocial | undefined;

        if (Number.isFinite(SOURCE_OS_ID) && SOURCE_OS_ID > 0) {
          os = obras.find((x) => Number(x.NRO_OBRA_SOCIAL) === Number(SOURCE_OS_ID));
        }
        if (!os) {
          os = obras.find((x) => normalize(x.NOMBRE ?? "").includes(SOURCE_OS_NAME_KEY));
        }
        if (!os) {
          throw new Error("No se encontró la obra social fuente del padrón. Definí VITE_PADRON_SOURCE_OS_ID.");
        }

        const rows = await fetchPrestadoresAllPages(os.NRO_OBRA_SOCIAL);
        if (!alive) return;

        setPrestadores(dedupPrestadoresKeepMostEspecialidades(rows));
      } catch (e: any) {
        if (!alive) return;
        setError(safeStr(e?.message) || "No se pudieron cargar los datos.");
        setPrestadores([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  async function generarExcel() {
    if (prestadores.length === 0) {
      window.alert("No hay datos para exportar.");
      return;
    }

    // ✅ LOG pedido (tal cual)
    console.log(
      "[TEL RAW SAMPLE]",
      prestadores.slice(0, 10).map((p) => ({
        raw: p.telefono_consulta,
        str: String(p.telefono_consulta),
        digits: String(p.telefono_consulta ?? "").replace(/\D+/g, ""),
      }))
    );

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setExporting("excel");

      // ✅ CLAVE: re-enriquecer trayendo teléfono real desde endpoint detalle
      const enrichedAll = await enrichForExcel(prestadores, controller.signal);
      if (controller.signal.aborted) return;

      // 🔎 debug post-enrichment (para comprobar que el truncado se corrige)
      console.log(
        "[TEL AFTER ENRICH SAMPLE]",
        enrichedAll.slice(0, 10).map((p) => ({
          id: p.id,
          raw: p.telefono_consulta,
          digits: String(p.telefono_consulta ?? "").replace(/\D+/g, ""),
        }))
      );

      const enrichedDedup = dedupPrestadoresKeepMostEspecialidades(enrichedAll);

      // -----------------------
      // Agrupación (igual que antes)
      // -----------------------
      const groups = new Map<string, Prestador[]>();
      const labelByKey = new Map<string, string>();

      const medicoKey = normalize("Médico");
      labelByKey.set(medicoKey, "Médico");

      const serviceGroups = new Map<string, Prestador[]>();
      const serviceLabelByKey = new Map<string, string>();

      for (const p of enrichedDedup) {
        const { especialidades, servicios } = splitEspecialidadesYServicios(p);

        // Especialidades
        if (especialidades.length === 0) {
          (groups.get(medicoKey) ?? groups.set(medicoKey, []).get(medicoKey)!).push(p);
        } else {
          for (const esp of especialidades) {
            const label = safeStr(esp).trim();
            if (!label) continue;
            const key = normalize(label);
            if (!labelByKey.has(key)) labelByKey.set(key, label);
            (groups.get(key) ?? groups.set(key, []).get(key)!).push(p);
          }
        }

        // Servicios
        if (servicios.length) {
          for (const serv of servicios) {
            const label = safeStr(serv).trim();
            if (!label) continue;
            const key = normalize(label);
            if (!serviceLabelByKey.has(key)) serviceLabelByKey.set(key, label);
            (serviceGroups.get(key) ?? serviceGroups.set(key, []).get(key)!).push(p);
          }
        }
      }

      // Manuales dentro de Diagnóstico por Imagen
      const diagServiceLabel = "Diagnóstico por Imagen";
      const diagKey = normalize(diagServiceLabel);
      if (!serviceLabelByKey.has(diagKey)) serviceLabelByKey.set(diagKey, diagServiceLabel);

      const diagArr = serviceGroups.get(diagKey) ?? [];
      for (const m of MANUAL_SERVICES) diagArr.push(manualToPrestador(m));
      serviceGroups.set(diagKey, diagArr);

      // Traer 9696 y meterlo en Diagnóstico por Imagen
      for (const nro of EXTRA_SERVICE_NROS_FROM_API) {
        const found = await fetchPrestadorByNroSocio(nro);
        if (found) {
          const enrichedOne = await enrichForExcel([found], controller.signal);
          const finalOne = enrichedOne[0] ?? found;

          const list = serviceGroups.get(diagKey) ?? [];
          list.push(finalOne);
          serviceGroups.set(diagKey, list);
        }
      }

      const dedupByNro = (arr: Prestador[]) => {
        const seen = new Set<string>();
        const out: Prestador[] = [];
        for (const p of arr) {
          const k = pickNroSocioAsKey(p);
          if (!k) continue;
          if (seen.has(k)) continue;
          seen.add(k);
          out.push(p);
        }
        return out;
      };

      // Ordenar
      const keys = Array.from(groups.keys()).sort((a, b) =>
        safeStr(labelByKey.get(a)).localeCompare(safeStr(labelByKey.get(b)), "es")
      );
      for (const k of keys) {
        groups.get(k)!.sort((a, b) =>
          safeStr(pickNombre(a)).localeCompare(safeStr(pickNombre(b)), "es")
        );
      }

      const serviceKeys = Array.from(serviceGroups.keys()).sort((a, b) =>
        safeStr(serviceLabelByKey.get(a)).localeCompare(safeStr(serviceLabelByKey.get(b)), "es")
      );
      for (const k of serviceKeys) {
        serviceGroups.set(k, dedupByNro(serviceGroups.get(k) ?? []));
        serviceGroups.get(k)!.sort((a, b) =>
          safeStr(pickNombre(a)).localeCompare(safeStr(pickNombre(b)), "es")
        );
      }

      // -----------------------
      // Excel
      // -----------------------
      const wb = new ExcelJS.Workbook();
      wb.creator = "CMC";
      wb.created = new Date();

      const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111111" } } as const;
      const headerFont = { bold: true, color: { argb: "FFFFFFFF" } } as const;

      function setRichText(cell: ExcelJS.Cell, text: string) {
        cell.value = { richText: [{ text }] } as any;
      }

      function setTextCell(cell: ExcelJS.Cell, raw: unknown, align: "center" | "left" = "center") {
        const v = cleanText(raw);
        setRichText(cell, v);
        cell.numFmt = "@";
        cell.alignment = { vertical: "middle", horizontal: align, wrapText: true } as any;
      }

      function setPhoneCell(cell: ExcelJS.Cell, raw: unknown) {
        const d = digitsOnly(raw);
        const v = d || cleanText(raw);
        setRichText(cell, v);
        cell.numFmt = "@";
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: false } as any;
      }

      const tableBorder = {
        top: { style: "thin" as const, color: { argb: "FFDDDDDD" } },
        left: { style: "thin" as const, color: { argb: "FFDDDDDD" } },
        bottom: { style: "thin" as const, color: { argb: "FFDDDDDD" } },
        right: { style: "thin" as const, color: { argb: "FFDDDDDD" } },
      };

      function styleDataRow(row: ExcelJS.Row, idx: number) {
        row.height = 18;
        const zebra = idx % 2 === 0 ? "FFFFFFFF" : "FFF7F7F7";
        row.eachCell((cell) => {
          cell.font = { size: 11 };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: zebra } };
          cell.border = tableBorder;
        });
      }

      function setupSheet(ws: ExcelJS.Worksheet, subtitle: string) {
        ws.pageSetup = {
          orientation: "landscape",
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
          margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
        };

        ws.columns = [
          { width: 14 },
          { width: 42 },
          { width: 16 },
          { width: 24 },
          { width: 34 },
          { width: 52 },
        ];

        [1, 3, 4].forEach((c) => {
          ws.getColumn(c).numFmt = "@";
        });

        try {
          if (logoBase64) {
            const imgId = wb.addImage({ base64: logoBase64, extension: logoType });
            ws.addImage(imgId, { tl: { col: 5.35, row: 0.1 }, ext: { width: 110, height: 110 } });
          }
        } catch {}

        ws.mergeCells("A1:F1");
        ws.getCell("A1").value = "Padrón";
        ws.getCell("A1").font = { size: 16, bold: true };

        ws.mergeCells("A2:F2");
        ws.getCell("A2").value = "Prestadores del Colegio Médico de Corrientes";
        ws.getCell("A2").font = { size: 11 };

        ws.mergeCells("A3:F3");
        ws.getCell("A3").value = `${fmtDate(new Date())} • ${subtitle}`;
        ws.getCell("A3").font = { size: 10 };

        const headerRow = ws.addRow([
          "N° Socio",
          "Prestador",
          "Matricula Prov",
          "Telefono",
          subtitle.includes("Servicios") ? "Servicio" : "Especialidades",
          "Dirección consultorio",
        ]);
        headerRow.height = 20;

        headerRow.eachCell((cell) => {
          cell.fill = headerFill as any;
          cell.font = headerFont as any;
          cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
          cell.border = {
            top: { style: "thin", color: { argb: "FF111111" } },
            left: { style: "thin", color: { argb: "FF111111" } },
            bottom: { style: "thin", color: { argb: "FF111111" } },
            right: { style: "thin", color: { argb: "FF111111" } },
          };
        });

        ws.views = [{ state: "frozen", ySplit: 4 }];
        ws.headerFooter.oddFooter = "&R&P / &N";
      }

      const ws1 = wb.addWorksheet("Especialidades");
      setupSheet(ws1, "Listado por especialidad");

      let zebraIdx = 0;

      for (const k of keys) {
        const label = safeStr(labelByKey.get(k));
        const arr = groups.get(k) ?? [];
        if (arr.length === 0) continue;

        const sectionRow = ws1.addRow([`Especialidad: ${label}`]);
        ws1.mergeCells(sectionRow.number, 1, sectionRow.number, 6);
        sectionRow.font = { size: 10 };
        sectionRow.alignment = { vertical: "middle", horizontal: "left", wrapText: true } as any;

        for (const p of arr) {
          const row = ws1.addRow(["", "", "", "", "", ""]);

          setTextCell(row.getCell(1), pickNroPrestador(p), "center");
          setTextCell(row.getCell(2), pickNombre(p), "left");
          setTextCell(row.getCell(3), pickMatriculaProv(p), "center");

          // ✅ ahora ya viene del enrichment con el tel completo
          setPhoneCell(row.getCell(4), pickTelefonoConsulta(p));

          setTextCell(row.getCell(5), pickEspecialidadTop3WithoutServicesOrMedico(p), "left");
          setTextCell(row.getCell(6), pickDomicilioConsulta(p), "left");

          styleDataRow(row, zebraIdx++);
        }

        ws1.addRow([""]);
      }

      const ws2 = wb.addWorksheet("Servicios");
      setupSheet(ws2, "Servicios asociados");

      zebraIdx = 0;

      for (const k of serviceKeys) {
        const label = safeStr(serviceLabelByKey.get(k));
        const arr = serviceGroups.get(k) ?? [];
        if (arr.length === 0) continue;

        const sectionRow = ws2.addRow([`Servicio: ${label}`]);
        ws2.mergeCells(sectionRow.number, 1, sectionRow.number, 6);
        sectionRow.font = { size: 10 };
        sectionRow.alignment = { vertical: "middle", horizontal: "left", wrapText: true } as any;

        for (const p of arr) {
          const row = ws2.addRow(["", "", "", "", "", ""]);

          setTextCell(row.getCell(1), pickNroPrestador(p), "center");
          setTextCell(row.getCell(2), pickNombre(p), "left");
          setTextCell(row.getCell(3), pickMatriculaProv(p), "center");

          setPhoneCell(row.getCell(4), pickTelefonoConsulta(p));

          setTextCell(row.getCell(5), label, "left");
          setTextCell(row.getCell(6), pickDomicilioConsulta(p), "left");

          styleDataRow(row, zebraIdx++);
        }

        ws2.addRow([""]);
      }

      const buffer = await wb.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `padron_${fmtDate(new Date())}.xlsx`
      );
    } catch (e: any) {
      if (controller.signal.aborted) return;
      console.error(e);
      window.alert("No se pudo generar el Excel.");
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setExporting(null);
    }
  }

  const isExporting = exporting !== null;

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <Button
          type="button"
          variant="primary"
          onClick={generarExcel}
          disabled={loading || !!error || isExporting || prestadores.length === 0}
        >
          <FileSpreadsheet size={18} />
          <span>{exporting === "excel" ? "Generando…" : "Generar Excel"}</span>
        </Button>

        {error ? <p className={styles.errorMessage}>{error}</p> : null}
      </div>
    </div>
  );
};

export default PadronSucio;
