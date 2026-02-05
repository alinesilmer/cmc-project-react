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
function isServiceLabel(label: string) {
  const key = normalize(label);
  if (!key) return false;

  // excluir ecografista(s)
  if (key.includes("ecografista")) return false;
  if (key.includes("ecografistas")) return false;

  if (key.includes("diagnostico por imagen")) return true;
  if (key.includes("ecodoppler")) return true;

  if (key.includes("doppler")) return true;
  if (key.includes("ecografia")) return true;

  return false;
}

function splitEspecialidadesYServicios(p: Prestador) {
  const raw = pickEspecialidadesRawList(p);

  const especialidades: string[] = [];
  const servicios: string[] = [];

  for (const lab of raw) {
    if (isServiceLabel(lab)) servicios.push(lab);
    else especialidades.push(lab);
  }

  return {
    especialidades,
    servicios: cleanEspecialidades(servicios),
  };
}

// Para PDF/table: top 3 sin servicios, si vacío => Médico
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

// ==========================
// PDF libs lazy
// ==========================
async function loadPdfLibs(): Promise<{ JsPDF: any; autoTable: any }> {
  const jspdfMod: any = await import("jspdf");
  const autotableMod: any = await import("jspdf-autotable");
  const JsPDF = jspdfMod?.jsPDF ?? jspdfMod?.default ?? jspdfMod;
  const autoTable = autotableMod?.default ?? autotableMod;
  return { JsPDF, autoTable };
}

// ==========================
// Enriquecimiento SOLO PDF
// ==========================
const PDF_REQ_TIMEOUT_MS = 12_000;
const PDF_CONTACT_CONCURRENCY = 4;
const PDF_ENRICH_MAX = 700;

type ContactoPayload = Pick<Prestador, "domicilio_consulta">;
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

      const payload: ContactoPayload = { domicilio_consulta };
      contactoCache.set(id, payload);
      return payload;
    } catch (e: any) {
      if (signal?.aborted) throw e;
    }
  }

  const payload: ContactoPayload = { domicilio_consulta: null };
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
    .filter(({ p }) => !safeStr(p.domicilio_consulta).trim() && !!p.id);

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
    out[idx] = {
      ...prev,
      domicilio_consulta: safeStr(prev.domicilio_consulta).trim()
        ? prev.domicilio_consulta
        : c.domicilio_consulta,
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
// ✅ LOGO: convertir import a dataURL (lo que necesita jsPDF)
// ======================================================
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
  } catch (e) {
    console.warn("No se pudo dibujar el logo en el PDF:", e);
  }
}

type ExportingPdfMode = null | "pdf";

const PadronSucio = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [prestadores, setPrestadores] = useState<Prestador[]>([]);
  const [exportingPdf, setExportingPdf] = useState<ExportingPdfMode>(null);
  const pdfAbortRef = useRef<AbortController | null>(null);

  // ✅ logo listo para jsPDF
  const [logoDataUrl, setLogoDataUrl] = useState<string>("");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // Cargar logo (no bloquea si falla)
        try {
          const d = await toDataURL(Logo as unknown as string);
          if (alive) setLogoDataUrl(d);
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
        serviceGroups.get(k)!.sort((a, b) => safeStr(pickNombre(a)).localeCompare(safeStr(pickNombre(b)), "es"));
      }

      const doc = new JsPDF({ orientation: "landscape", compress: true });

      const head = [[
        "N° Socio",
        "Prestador",
        "Matricula Prov",
        "Telefono",
        "Especialidades",
        "Dirección consultorio",
      ]];

      const drawHeaderCommon = (subtitle: string) => {
        // ✅ Logo en TODAS las páginas (didDrawPage lo llama en cada página)
        drawLogo(doc, logoDataUrl);

        doc.setFontSize(16);
        doc.text("Padrón Sucio", 14, 14);

        doc.setFontSize(11);
        doc.text("Prestadores del Colegio Médico de Corrientes", 14, 22);

        doc.setFontSize(10);
        doc.text(`${fmtDate(new Date())} • ${subtitle}`, 14, 28);
      };

      keys.forEach((k, idx) => {
        if (idx > 0) doc.addPage();

        const arr = groups.get(k)!;
        const espLabel = safeStr(labelByKey.get(k));

        const body = arr.map((p) => [
          safeStr(pickNroPrestador(p)),
          safeStr(pickNombre(p)),
          safeStr(pickMatriculaProv(p)),
          safeStr(pickTelefonoConsulta(p)),
          pickEspecialidadTop3WithoutServicesOrMedico(p),
          safeStr(pickDomicilioConsulta(p)),
        ]);

        autoTable(doc, {
          head,
          body,
          startY: 34,
          margin: { top: 32 },
          didDrawPage: () => {
            drawHeaderCommon(
              `${arr.length} ${arr.length === 1 ? "prestador" : "prestadores"} • Especialidad: ${espLabel}`
            );
          },
          styles: { fontSize: 7, cellPadding: 2, valign: "middle", overflow: "linebreak" },
          headStyles: { fillColor: [17, 17, 17], textColor: [255, 255, 255], fontStyle: "bold" },
          alternateRowStyles: { fillColor: [247, 247, 247] },
          columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 78 },
            2: { cellWidth: 26 },
            3: { cellWidth: 30 },
            4: { cellWidth: 60 },
            5: { cellWidth: 104 },
          },
        });
      });

      doc.addPage();

      const servicesHead = [[
        "N° Socio",
        "Prestador",
        "Matricula Prov",
        "Telefono",
        "Servicio",
        "Dirección consultorio",
      ]];

      const servicesBody: any[] = [];

      for (const k of serviceKeys) {
        const label = safeStr(serviceLabelByKey.get(k));
        const arr = serviceGroups.get(k) ?? [];
        if (arr.length === 0) continue;

        servicesBody.push(["", "", "", "", `SERVICIO: ${label}`, ""]);

        for (const p of arr) {
          servicesBody.push([
            safeStr(pickNroPrestador(p)),
            safeStr(pickNombre(p)),
            safeStr(pickMatriculaProv(p)),
            safeStr(pickTelefonoConsulta(p)),
            label,
            safeStr(pickDomicilioConsulta(p)),
          ]);
        }
      }

      if (servicesBody.length === 0) {
        servicesBody.push(["", "", "", "", "Sin servicios asociados", ""]);
      }

      autoTable(doc, {
        head: servicesHead,
        body: servicesBody,
        startY: 34,
        margin: { top: 32 },
        didDrawPage: () => {
          drawHeaderCommon("Servicios asociados a Colegio Médico de Corrientes");
        },
        styles: { fontSize: 7, cellPadding: 2, valign: "middle", overflow: "linebreak" },
        headStyles: { fillColor: [17, 17, 17], textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [247, 247, 247] },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 78 },
          2: { cellWidth: 26 },
          3: { cellWidth: 30 },
          4: { cellWidth: 70 },
          5: { cellWidth: 84 },
        },
        didParseCell: (data: any) => {
          const raw = data.row?.raw;
          if (data.section === "body" && Array.isArray(raw) && safeStr(raw[4]).startsWith("SERVICIO: ")) {
            data.cell.styles.fontStyle = "bold";
            data.cell.colSpan = 6;
          }
        },
      });

      if (controller.signal.aborted) return;

      saveAs(doc.output("blob"), `padron_sucio_${fmtDate(new Date())}.pdf`);
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
