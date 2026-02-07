"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { saveAs } from "file-saver";
import { FileText } from "lucide-react";

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
  telefono_consulta?: string | null;

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
  medicosByOS: (nroOS: number) => `${API_BASE}/api/padrones/obras-sociales/${nroOS}/medicos`,
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

function normalizePhoneRaw(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = String(v).trim();
  if (!s) return "";
  s = s.replace(/\.0$/, "");
  s = s.replace(/[^\d+\/\-\s]/g, "");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function isTruncatedPhone(s: unknown): boolean {
  const p = normalizePhoneRaw(s);
  const digits = p.replace(/\D/g, "");
  if (!digits) return false;
  return digits.length > 0 && digits.length <= 4;
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
    src?.MATRICULA_PROV ?? src?.matricula_prov ?? it?.MATRICULA_PROV ?? it?.matricula_prov ?? null;

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
    } catch {}
  }

  console.warn(`[EXTRA] No se encontró prestador para nro_socio=${nro} en api/medicos.`);
  return null;
}

async function loadPdfLibs(): Promise<{ JsPDF: any; autoTable: any }> {
  const jspdfMod: any = await import("jspdf");
  const autotableMod: any = await import("jspdf-autotable");
  const JsPDF = jspdfMod?.jsPDF ?? jspdfMod?.default ?? jspdfMod;
  const autoTable = autotableMod?.default ?? autotableMod;
  return { JsPDF, autoTable };
}

const PDF_REQ_TIMEOUT_MS = 12_000;
const PDF_CONTACT_CONCURRENCY = 4;
const PDF_ENRICH_MAX = 700;

type ContactoPayload = Pick<Prestador, "domicilio_consulta" | "telefono_consulta">;
const contactoCache = new Map<string, ContactoPayload>();

async function fetchContactoById(id: string, signal?: AbortSignal): Promise<ContactoPayload> {
  const cached = contactoCache.get(id);
  if (cached) return cached;

  const urls = ENDPOINTS.prestadorDetailCandidates(id);

  for (const url of urls) {
    try {
      const { data } = await axios.get(url, { signal, timeout: PDF_REQ_TIMEOUT_MS } as any);
      const src = unwrapPrestadorSource(data);

      const domicilio_consulta =
        src?.DOMICILIO_CONSULTA ??
        src?.domicilio_consulta ??
        data?.DOMICILIO_CONSULTA ??
        data?.domicilio_consulta ??
        null;

      const telefono_consulta =
        src?.TELEFONO_CONSULTA ??
        src?.telefono_consulta ??
        data?.TELEFONO_CONSULTA ??
        data?.telefono_consulta ??
        null;

      const payload: ContactoPayload = { domicilio_consulta, telefono_consulta };
      contactoCache.set(id, payload);
      return payload;
    } catch (e: any) {
      if (signal?.aborted) throw e;
    }
  }

  const payload: ContactoPayload = { domicilio_consulta: null, telefono_consulta: null };
  contactoCache.set(id, payload);
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

async function enrichForPdf(rows: Prestador[], signal?: AbortSignal): Promise<Prestador[]> {
  const needAll = rows
    .map((p, idx) => ({ p, idx }))
    .filter(({ p }) => {
      const needDom = !safeStr(p.domicilio_consulta).trim();
      const needTel = !safeStr(p.telefono_consulta).trim() || isTruncatedPhone(p.telefono_consulta);
      return (!!p.id && (needDom || needTel));
    });

  if (needAll.length === 0) return rows;
  if (signal?.aborted) return rows;

  const need = needAll.slice(0, PDF_ENRICH_MAX);
  const fetched = await mapWithConcurrency(need, PDF_CONTACT_CONCURRENCY, signal, async ({ p, idx }) => {
    const c = await fetchContactoById(String(p.id), signal);
    return { idx, c };
  });

  const out = rows.slice();
  for (const item of fetched) {
    if (!item) continue;
    const { idx, c } = item as any;
    const prev = out[idx];

    const prevTel = safeStr(prev.telefono_consulta).trim();
    const canReplaceTel = !prevTel || isTruncatedPhone(prevTel);

    out[idx] = {
      ...prev,
      domicilio_consulta: safeStr(prev.domicilio_consulta).trim()
        ? prev.domicilio_consulta
        : c.domicilio_consulta,
      telefono_consulta: canReplaceTel && safeStr(c.telefono_consulta).trim()
        ? c.telefono_consulta
        : prev.telefono_consulta,
    };
  }
  return out;
}

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

async function toDataURL(assetUrl: string): Promise<string> {
  const res = await fetch(assetUrl);
  const blob = await res.blob();

  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function guessImageFormat(dataUrl: string): "PNG" | "JPEG" {
  const s = dataUrl.toLowerCase();
  if (s.startsWith("data:image/jpeg") || s.startsWith("data:image/jpg")) return "JPEG";
  return "PNG";
}

function drawLogo(doc: any, logoDataUrl: string) {
  const logo = safeStr(logoDataUrl).trim();
  if (!logo) return;

  try {
    const pageW = doc.internal.pageSize.getWidth?.() ?? 297;

    const w = 28;
    const h = 28;
    const x = pageW - 14 - w;
    const y = 8;

    doc.addImage(logo, guessImageFormat(logo), x, y, w, h);
  } catch {}
}

function drawPageNumber(doc: any, totalPages: number) {
  try {
    const pageW = doc.internal.pageSize.getWidth?.() ?? 297;
    const pageH = doc.internal.pageSize.getHeight?.() ?? 210;

    const current =
      doc.internal.getCurrentPageInfo?.().pageNumber ??
      doc.getCurrentPageInfo?.().pageNumber ??
      1;

    const text = `Página ${current} / ${totalPages}`;

    doc.setFillColor(255, 255, 255);
    doc.rect(pageW - 80, pageH - 14, 70, 10, "F");

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(text, pageW - 14, pageH - 8, { align: "right" });
  } catch {}
}

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
  {
    nro_socio: "9696",
    prestador: "CARDIOCOR - AVALOS VICTOR",
    matricula: "3572",
    direccion: "San Juan 975 3 piso y Junin 824 1 piso",
    telefono: "2147483647",
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

type ExportingPdfMode = null | "pdf";

const PadronSucio = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [prestadores, setPrestadores] = useState<Prestador[]>([]);
  const [exportingPdf, setExportingPdf] = useState<ExportingPdfMode>(null);
  const pdfAbortRef = useRef<AbortController | null>(null);

  const [logoDataUrl, setLogoDataUrl] = useState<string>("");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        try {
          const d = await toDataURL(Logo as unknown as string);
          if (alive) setLogoDataUrl(d);
        } catch {}

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

  async function downloadPdfPadronGeneral() {
    if (prestadores.length === 0) {
      window.alert("No hay datos para exportar.");
      return;
    }

    pdfAbortRef.current?.abort();
    const controller = new AbortController();
    pdfAbortRef.current = controller;

    try {
      setExportingPdf("pdf");

      const { JsPDF, autoTable } = await loadPdfLibs();
      if (controller.signal.aborted) return;

      const enrichedAll = await enrichForPdf(prestadores, controller.signal);
      if (controller.signal.aborted) return;

      const enrichedDedup = dedupPrestadoresKeepMostEspecialidades(enrichedAll);

      const groups = new Map<string, Prestador[]>();
      const labelByKey = new Map<string, string>();

      const medicoKey = normalize("Médico");
      labelByKey.set(medicoKey, "Médico");

      const serviceGroups = new Map<string, Prestador[]>();
      const serviceLabelByKey = new Map<string, string>();

      for (const p of enrichedDedup) {
        const { especialidades, servicios } = splitEspecialidadesYServicios(p);

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

      const diagServiceLabel = "Diagnóstico por Imagen";
      const diagKey = normalize(diagServiceLabel);
      if (!serviceLabelByKey.has(diagKey)) serviceLabelByKey.set(diagKey, diagServiceLabel);
      const diagArr = serviceGroups.get(diagKey) ?? [];
      for (const m of MANUAL_SERVICES) {
        diagArr.push(manualToPrestador(m));
      }
      serviceGroups.set(diagKey, diagArr);

      for (const nro of EXTRA_SERVICE_NROS_FROM_API) {
        const found = await fetchPrestadorByNroSocio(nro);
        if (found) {
          const enrichedOne = await enrichForPdf([found], controller.signal);
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

      const keys = Array.from(groups.keys()).sort((a, b) =>
        safeStr(labelByKey.get(a)).localeCompare(safeStr(labelByKey.get(b)), "es")
      );
      for (const k of keys) {
        groups.get(k)!.sort((a, b) => safeStr(pickNombre(a)).localeCompare(safeStr(pickNombre(b)), "es"));
      }

      const serviceKeys = Array.from(serviceGroups.keys()).sort((a, b) =>
        safeStr(serviceLabelByKey.get(a)).localeCompare(safeStr(serviceLabelByKey.get(b)), "es")
      );
      for (const k of serviceKeys) {
        serviceGroups.set(k, dedupByNro(serviceGroups.get(k) ?? []));
        serviceGroups
          .get(k)!
          .sort((a, b) => safeStr(pickNombre(a)).localeCompare(safeStr(pickNombre(b)), "es"));
      }

      const doc = new JsPDF({ orientation: "landscape", compress: true });

      const headEspecialidades = [
        ["N° Socio", "Prestador", "Matricula Prov", "Telefono", "Especialidades", "Dirección consultorio"],
      ];

      const drawHeaderCommon = (subtitle: string) => {
        drawLogo(doc, logoDataUrl);

        doc.setFontSize(16);
        doc.text("Padrón", 14, 14);

        doc.setFontSize(11);
        doc.text("Prestadores del Colegio Médico de Corrientes", 14, 22);

        doc.setFontSize(10);
        doc.text(`${fmtDate(new Date())} • ${subtitle}`, 14, 28);
      };

      const BODY: any[] = [];

      for (const k of keys) {
        const label = safeStr(labelByKey.get(k));
        const arr = groups.get(k) ?? [];
        if (arr.length === 0) continue;

        BODY.push(["", "", "", "", `Especialidad: ${label}`, ""]);

        for (const p of arr) {
          BODY.push([
            safeStr(pickNroPrestador(p)),
            safeStr(pickNombre(p)),
            safeStr(pickMatriculaProv(p)),
            normalizePhoneRaw(pickTelefonoConsulta(p)),
            pickEspecialidadTop3WithoutServicesOrMedico(p),
            safeStr(pickDomicilioConsulta(p)),
          ]);
        }

        BODY.push(["", "", "", "", "", ""]);
      }

      console.log("TEL BODY SAMPLE", BODY.slice(0, 20).map((r) => r[3]));

      autoTable(doc, {
        head: headEspecialidades,
        body: BODY,
        startY: 34,
        margin: { top: 32 },
        didDrawPage: () => {
          drawHeaderCommon("Listado por especialidad");
        },
        styles: { fontSize: 7, cellPadding: 2, valign: "middle", overflow: "linebreak" },
        headStyles: { fillColor: [17, 17, 17], textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [247, 247, 247] },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 78 },
          2: { cellWidth: 26 },
          3: { cellWidth: 35 },
          4: { cellWidth: 60 },
          5: { cellWidth: 99 },
        },
        didParseCell: (data: any) => {
          const raw = data.row?.raw;

          const isSectionRow =
            data.section === "body" &&
            Array.isArray(raw) &&
            typeof raw[4] === "string" &&
            raw[4].startsWith("Especialidad: ");

          const isSpacerRow =
            data.section === "body" &&
            Array.isArray(raw) &&
            raw.every((x: any) => safeStr(x) === "");

          if (isSectionRow) {
            if (data.column.index === 0) {
              data.cell.colSpan = 6;
              data.cell.text = [safeStr(raw[4])];
              data.cell.styles.fontStyle = "normal";
              data.cell.styles.fontSize = 10;
              data.cell.styles.fillColor = [255, 255, 255];
              data.cell.styles.textColor = [0, 0, 0];
              data.cell.styles.cellPadding = { top: 3, right: 2, bottom: 3, left: 2 };
            } else {
              data.cell.text = [""];
              data.cell.styles.fillColor = [255, 255, 255];
              data.cell.styles.lineWidth = 0;
            }
            return;
          }

          if (isSpacerRow) {
            data.cell.styles.fillColor = [255, 255, 255];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.lineWidth = 0;
            data.cell.styles.minCellHeight = 4;
            return;
          }

          if (data.section === "body" && data.column.index === 3) {
            data.cell.text = [""];
          }
        },
        didDrawCell: (data: any) => {
          if (data.section !== "body") return;
          if (data.column.index !== 3) return;

          const raw = data.row?.raw;
          if (!Array.isArray(raw)) return;

          const tel = safeStr(raw[3]).trim();
          if (!tel) return;

          const pad = 1.5;
          const x = data.cell.x + pad;
          const w = data.cell.width - pad * 2;

          doc.setFontSize(7);
          const lines = doc.splitTextToSize(tel, w);

          const lineH = 3.2;
          const totalH = lines.length * lineH;
          let y = data.cell.y + (data.cell.height - totalH) / 2 + lineH * 0.8;

          if (y < data.cell.y + 2) y = data.cell.y + 2;

          for (const line of lines) {
            doc.text(String(line), x, y);
            y += lineH;
          }
        },
      });

      doc.addPage();

      const servicesHead = [
        ["N° Socio", "Prestador", "Matricula Prov", "Telefono", "Servicio", "Dirección consultorio"],
      ];

      const servicesBody: any[] = [];

      for (const k of serviceKeys) {
        const label = safeStr(serviceLabelByKey.get(k));
        const arr = serviceGroups.get(k) ?? [];
        if (arr.length === 0) continue;

        servicesBody.push(["", "", "", "", `Servicio: ${label}`, ""]);

        for (const p of arr) {
          servicesBody.push([
            safeStr(pickNroPrestador(p)),
            safeStr(pickNombre(p)),
            safeStr(pickMatriculaProv(p)),
            normalizePhoneRaw(pickTelefonoConsulta(p)),
            label,
            safeStr(pickDomicilioConsulta(p)),
          ]);
        }

        servicesBody.push(["", "", "", "", "", ""]);
      }

      autoTable(doc, {
        head: servicesHead,
        body: servicesBody,
        startY: 34,
        margin: { top: 32 },
        didDrawPage: () => {
          drawHeaderCommon("Servicios asociados");
        },
        styles: { fontSize: 7, cellPadding: 2, valign: "middle", overflow: "linebreak" },
        headStyles: { fillColor: [17, 17, 17], textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [247, 247, 247] },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 78 },
          2: { cellWidth: 26 },
          3: { cellWidth: 35 },
          4: { cellWidth: 70 },
          5: { cellWidth: 89 },
        },
        didParseCell: (data: any) => {
          const raw = data.row?.raw;

          const isSectionRow =
            data.section === "body" &&
            Array.isArray(raw) &&
            typeof raw[4] === "string" &&
            raw[4].startsWith("Servicio: ");

          const isSpacerRow =
            data.section === "body" &&
            Array.isArray(raw) &&
            raw.every((x: any) => safeStr(x) === "");

          if (isSectionRow) {
            if (data.column.index === 0) {
              data.cell.colSpan = 6;
              data.cell.text = [safeStr(raw[4])];
              data.cell.styles.fontStyle = "normal";
              data.cell.styles.fontSize = 10;
              data.cell.styles.fillColor = [255, 255, 255];
              data.cell.styles.textColor = [0, 0, 0];
              data.cell.styles.cellPadding = { top: 3, right: 2, bottom: 3, left: 2 };
            } else {
              data.cell.text = [""];
              data.cell.styles.fillColor = [255, 255, 255];
              data.cell.styles.lineWidth = 0;
            }
            return;
          }

          if (isSpacerRow) {
            data.cell.styles.fillColor = [255, 255, 255];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.lineWidth = 0;
            data.cell.styles.minCellHeight = 4;
            return;
          }

          if (data.section === "body" && data.column.index === 3) {
            data.cell.text = [""];
          }
        },
        didDrawCell: (data: any) => {
          if (data.section !== "body") return;
          if (data.column.index !== 3) return;

          const raw = data.row?.raw;
          if (!Array.isArray(raw)) return;

          const tel = safeStr(raw[3]).trim();
          if (!tel) return;

          const pad = 1.5;
          const x = data.cell.x + pad;
          const w = data.cell.width - pad * 2;

          doc.setFontSize(7);
          const lines = doc.splitTextToSize(tel, w);

          const lineH = 3.2;
          const totalH = lines.length * lineH;
          let y = data.cell.y + (data.cell.height - totalH) / 2 + lineH * 0.8;

          if (y < data.cell.y + 2) y = data.cell.y + 2;

          for (const line of lines) {
            doc.text(String(line), x, y);
            y += lineH;
          }
        },
      });

      if (controller.signal.aborted) return;

      const totalPages = doc.getNumberOfPages?.() ?? 1;
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        drawPageNumber(doc, totalPages);
      }

      saveAs(doc.output("blob"), `padron_${fmtDate(new Date())}.pdf`);
    } catch (e: any) {
      if (controller.signal.aborted) return;
      console.error(e);
      window.alert("No se pudo generar el PDF.");
    } finally {
      if (pdfAbortRef.current === controller) pdfAbortRef.current = null;
      setExportingPdf(null);
    }
  }

  const isExporting = exportingPdf !== null;

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <Button
          type="button"
          variant="primary"
          onClick={downloadPdfPadronGeneral}
          disabled={loading || !!error || isExporting || prestadores.length === 0}
        >
          <FileText size={18} />
          <span>{exportingPdf === "pdf" ? "Generando…" : "Generar PDF"}</span>
        </Button>

        {error ? <p className={styles.errorMessage}>{error}</p> : null}
      </div>
    </div>
  );
};

export default PadronSucio;
