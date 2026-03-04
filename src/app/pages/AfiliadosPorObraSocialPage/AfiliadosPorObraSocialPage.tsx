"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
  Building2,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  Search,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import styles from "./AfiliadosPorObraSocialPage.module.scss";

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
  estado?: string | null;
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
  medicosByOS: (nroOS: number) =>
    `${API_BASE}/api/padrones/obras-sociales/${nroOS}/medicos`,
  prestadorDetailCandidates: (id: string) => [
    `${API_BASE}/api/prestadores/${id}`,
    `${API_BASE}/api/medicos/${id}`,
    `${API_BASE}/api/doctores/${id}`,
  ],
};

const MAX_IDLE_OS_RESULTS = 80;
const PDF_REQ_TIMEOUT_MS = 12_000;
const PDF_CONTACT_CONCURRENCY = 4;
const PDF_ENRICH_MAX = 700;
const CONTACT_CACHE_MAX = 5000;

type ExportingPdfMode = null | "pdf" | "pdf_by_especialidad";
type ContactoPayload = Pick<Prestador, "domicilio_consulta" | "mail_particular">;

const contactoCache = new Map<string, ContactoPayload>();

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

function buildOsCode(os: Pick<ObraSocial, "CODIGO" | "NRO_OBRA_SOCIAL">) {
  return os.CODIGO ?? `OS${String(os.NRO_OBRA_SOCIAL).padStart(3, "0")}`;
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
    if (!t || t === "0") continue;

    const key = normalize(t);
    if (!key || seen.has(key)) continue;

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

function pickEspecialidadesList(p: Prestador): string[] {
  const list = Array.isArray(p.especialidades) ? p.especialidades : [];
  const cleaned = cleanEspecialidades(list);

  if (cleaned.length) return stripMedicoWhenMultiple(cleaned);

  const single = safeStr(p.especialidad).trim();
  const singleClean = single ? cleanEspecialidades([single]) : [];
  return stripMedicoWhenMultiple(singleClean);
}

function pickEspecialidadesAll(p: Prestador) {
  return pickEspecialidadesList(p).join(", ");
}

function pickEspecialidad(p: Prestador) {
  const list = pickEspecialidadesList(p);
  return list.slice(0, 3).join(", ");
}

function pickDomicilioConsulta(p: Prestador) {
  return p.domicilio_consulta ?? "";
}

function pickMailParticular(p: Prestador) {
  return p.mail_particular ?? "";
}

function shouldShowMailForOS(os: ObraSocial | null) {
  const name = safeStr(os?.NOMBRE);
  if (!name) return false;
  const n = normalize(name);
  return (
    n.includes("unne") ||
    n.includes("swiss medical") ||
    n.includes("swissmedical")
  );
}

function mapObraSocialRawToOS(raw: any): ObraSocial {
  const nro =
    raw?.NRO_OBRA_SOCIAL ??
    raw?.NRO_OBRASOCIAL ??
    raw?.nro_obra_social ??
    raw?.nro_obrasocial ??
    0;

  const nombre =
    raw?.NOMBRE ?? raw?.OBRA_SOCIAL ?? raw?.obra_social ?? raw?.nombre ?? "";

  const codigo =
    raw?.CODIGO ??
    (Number.isFinite(Number(nro))
      ? `OS${String(Number(nro)).padStart(3, "0")}`
      : null);

  const activa = raw?.ACTIVA ?? raw?.MARCA ?? undefined;

  return {
    NRO_OBRA_SOCIAL: Number(nro),
    NOMBRE: String(nombre),
    CODIGO: codigo,
    ACTIVA: activa,
  };
}

async function fetchObrasSociales(signal?: AbortSignal): Promise<ObraSocial[]> {
  const { data } = await axios.get(ENDPOINTS.obrasSociales, {
    signal,
    timeout: 20_000,
  } as any);

  const arr = Array.isArray(data) ? data : [];
  return arr
    .map(mapObraSocialRawToOS)
    .sort((a, b) => a.NOMBRE.localeCompare(b.NOMBRE, "es"));
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

  const nombre =
    src?.NOMBRE ?? src?.nombre ?? it?.NOMBRE ?? it?.nombre ?? null;

  const matricula_prov =
    src?.MATRICULA_PROV ??
    src?.matricula_prov ??
    it?.MATRICULA_PROV ??
    it?.matricula_prov ??
    null;

  const telefono_consulta =
    src?.TELEFONO_CONSULTA ??
    src?.telefono_consulta ??
    it?.TELEFONO_CONSULTA ??
    it?.telefono_consulta ??
    null;

  const especialidadesRaw =
    src?.ESPECIALIDADES ??
    src?.especialidades ??
    it?.ESPECIALIDADES ??
    it?.especialidades ??
    null;

  const especialidadSingle =
    src?.ESPECIALIDAD ??
    src?.especialidad ??
    it?.ESPECIALIDAD ??
    it?.especialidad ??
    null;

  const especialidades = cleanEspecialidades(coerceToStringArray(especialidadesRaw));
  const especialidad =
    especialidades[0] ?? (especialidadSingle ? safeStr(especialidadSingle) : null);

  const domicilio_consulta =
    src?.DOMICILIO_CONSULTA ??
    src?.domicilio_consulta ??
    it?.DOMICILIO_CONSULTA ??
    it?.domicilio_consulta ??
    null;

  const mail_particular =
    src?.MAIL_PARTICULAR ??
    src?.mail_particular ??
    it?.MAIL_PARTICULAR ??
    it?.mail_particular ??
    null;

  return {
    id,
    nro_socio: nro,
    socio: nro,
    apellido_nombre: nombre,
    nombre,
    matricula_prov,
    telefono_consulta,
    especialidades,
    especialidad,
    domicilio_consulta,
    mail_particular,
  };
}

async function fetchPrestadoresAllPages(
  nroOS: number,
  signal?: AbortSignal
): Promise<Prestador[]> {
  const PAGE_SIZE = 200;
  let page = 1;
  const out: Prestador[] = [];
  let total: number | null = null;

  while (true) {
    if (signal?.aborted) break;

    const { data } = await axios.get(ENDPOINTS.medicosByOS(nroOS), {
      params: { page, size: PAGE_SIZE },
      timeout: 25_000,
      signal,
    } as any);

    if (Array.isArray(data)) return data.map(mapItemToPrestador);

    const items = Array.isArray(data?.items) ? data.items : [];
    total = Number.isFinite(data?.total) ? Number(data.total) : total;

    for (const it of items) out.push(mapItemToPrestador(it));

    if (items.length === 0) break;
    if (total !== null && out.length >= total) break;

    page += 1;
    if (page > 10_000) break;
  }

  return out;
}

async function loadPdfLibs(): Promise<{ JsPDF: any; autoTable: any }> {
  const jspdfMod: any = await import("jspdf");
  const autotableMod: any = await import("jspdf-autotable");

  const JsPDF = jspdfMod?.jsPDF ?? jspdfMod?.default ?? jspdfMod;
  const autoTable = autotableMod?.default ?? autotableMod;

  return { JsPDF, autoTable };
}

function cacheSetContacto(id: string, payload: ContactoPayload) {
  if (contactoCache.size > CONTACT_CACHE_MAX) contactoCache.clear();
  contactoCache.set(id, payload);
}

async function fetchContactoById(
  id: string,
  signal?: AbortSignal
): Promise<ContactoPayload> {
  const cached = contactoCache.get(id);
  if (cached) return cached;

  const urls = ENDPOINTS.prestadorDetailCandidates(id);

  for (const url of urls) {
    try {
      const { data } = await axios.get(
        url,
        {
          signal,
          timeout: PDF_REQ_TIMEOUT_MS,
        } as any
      );

      const src = unwrapPrestadorSource(data);

      const domicilio_consulta =
        src?.DOMICILIO_CONSULTA ??
        src?.domicilio_consulta ??
        data?.DOMICILIO_CONSULTA ??
        data?.domicilio_consulta ??
        null;

      const mail_particular =
        src?.MAIL_PARTICULAR ??
        src?.mail_particular ??
        data?.MAIL_PARTICULAR ??
        data?.mail_particular ??
        null;

      const payload: ContactoPayload = { domicilio_consulta, mail_particular };
      cacheSetContacto(id, payload);
      return payload;
    } catch (e: any) {
      if (signal?.aborted) throw e;
    }
  }

  const payload: ContactoPayload = {
    domicilio_consulta: null,
    mail_particular: null,
  };
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
      } catch (e: any) {
        if (signal?.aborted) return;
        results[idx] = null as any;
      }
    }
  }

  const workers = Array.from({ length: Math.max(1, limit) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function enrichForPdf(
  rows: Prestador[],
  showMail: boolean,
  signal?: AbortSignal
): Promise<Prestador[]> {
  const needAll = rows
    .map((p, idx) => ({ p, idx }))
    .filter(({ p }) => {
      const missAddr = !safeStr(p.domicilio_consulta).trim();
      const missMail = showMail && !safeStr(p.mail_particular).trim();
      return (missAddr || missMail) && !!p.id;
    });

  if (needAll.length === 0) return rows;
  if (signal?.aborted) return rows;

  const need = needAll.slice(0, PDF_ENRICH_MAX);
  const skipped = needAll.length - need.length;

  if (skipped > 0) {
    console.warn(
      `[PDF] Enriquecimiento limitado a ${PDF_ENRICH_MAX}. Se omiten ${skipped} contactos para evitar sobrecarga.`
    );
  }

  const fetched = await mapWithConcurrency(
    need,
    PDF_CONTACT_CONCURRENCY,
    signal,
    async ({ p, idx }) => {
      const id = String(p.id);
      const c = await fetchContactoById(id, signal);
      return { idx, c };
    }
  );

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
      mail_particular: safeStr(prev.mail_particular).trim()
        ? prev.mail_particular
        : c.mail_particular,
    };
  }

  return out;
}

const AfiliadosPorObraSocialPage = () => {
  const [obras, setObras] = useState<ObraSocial[]>([]);
  const [loadingObras, setLoadingObras] = useState(true);
  const [errorObras, setErrorObras] = useState<string | null>(null);

  const [selectedOS, setSelectedOS] = useState<ObraSocial | null>(null);

  const [prestadores, setPrestadores] = useState<Prestador[]>([]);
  const [loadingPrestadores, setLoadingPrestadores] = useState(false);
  const [errorPrestadores, setErrorPrestadores] = useState<string | null>(null);

  const [osQuery, setOsQuery] = useState("");
  const [tableQuery, setTableQuery] = useState("");
  const deferredOsQuery = useDeferredValue(osQuery);
  const deferredTableQuery = useDeferredValue(tableQuery);

  const [osDropdownOpen, setOsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const [exportingPdf, setExportingPdf] = useState<ExportingPdfMode>(null);
  const pdfAbortRef = useRef<AbortController | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const closeDropdown = useCallback(() => setOsDropdownOpen(false), []);

  const openDropdown = useCallback(() => {
    if (!loadingObras) setOsDropdownOpen(true);
  }, [loadingObras]);

  const toggleDropdown = useCallback(() => {
    if (!loadingObras) setOsDropdownOpen((prev) => !prev);
  }, [loadingObras]);

  const goToDoctorPadrones = useCallback(
    (id: unknown) => {
      const v = String(id ?? "").trim();

      if (!v) {
        window.alert("Falta ID del prestador.");
        return;
      }

      sessionStorage.setItem("cmc_open_padrones_next", "1");
      navigate(`/panel/doctors/${encodeURIComponent(v)}`, {
        state: { fromPath: location.pathname },
      });
    },
    [location.pathname, navigate]
  );

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        setLoadingObras(true);
        setErrorObras(null);

        const rows = await fetchObrasSociales(controller.signal);
        if (controller.signal.aborted) return;
        setObras(rows);
      } catch {
        if (controller.signal.aborted) return;
        setErrorObras("No se pudieron cargar las obras sociales.");
      } finally {
        if (controller.signal.aborted) return;
        setLoadingObras(false);
      }
    })();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!osDropdownOpen) return;
      if (!dropdownRef.current) return;
      const t = e.target as Node;
      if (!dropdownRef.current.contains(t)) closeDropdown();
    }

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [closeDropdown, osDropdownOpen]);

  useEffect(() => {
    if (!selectedOS?.NRO_OBRA_SOCIAL) {
      setPrestadores([]);
      setErrorPrestadores(null);
      return;
    }

    const controller = new AbortController();

    (async () => {
      try {
        setLoadingPrestadores(true);
        setErrorPrestadores(null);
        setTableQuery("");

        const rows = await fetchPrestadoresAllPages(
          selectedOS.NRO_OBRA_SOCIAL,
          controller.signal
        );

        if (controller.signal.aborted) return;
        setPrestadores(rows);
      } catch (e: any) {
        if (controller.signal.aborted) return;

        let extra = "";
        if (axios.isAxiosError(e)) {
          const status = e.response?.status;
          const url = e.config?.url;
          extra = ` (HTTP ${status ?? "?"}${url ? ` • ${url}` : ""})`;
        }

        setErrorPrestadores(
          `No se pudieron cargar los prestadores de esta obra social.${extra}`
        );
        setPrestadores([]);
      } finally {
        if (controller.signal.aborted) return;
        setLoadingPrestadores(false);
      }
    })();

    return () => controller.abort();
  }, [selectedOS?.NRO_OBRA_SOCIAL]);

  useEffect(() => {
    return () => {
      pdfAbortRef.current?.abort();
    };
  }, []);

  const filteredOS = useMemo(() => {
    const q = normalize(deferredOsQuery);

    if (!q) {
      return obras.slice(0, MAX_IDLE_OS_RESULTS);
    }

    return obras.filter((os) => {
      const name = normalize(os.NOMBRE ?? "");
      const code = normalize(buildOsCode(os));
      return name.includes(q) || code.includes(q);
    });
  }, [deferredOsQuery, obras]);

  const hiddenOsCount = useMemo(() => {
    const q = normalize(deferredOsQuery);
    if (q) return 0;
    return Math.max(0, obras.length - filteredOS.length);
  }, [deferredOsQuery, filteredOS.length, obras.length]);

  const filteredPrestadores = useMemo(() => {
    const q = normalize(deferredTableQuery);
    if (!q) return prestadores;

    return prestadores.filter((p) => {
      const nro = normalize(safeStr(pickNroPrestador(p)));
      const nom = normalize(safeStr(pickNombre(p)));
      const mat = normalize(safeStr(pickMatriculaProv(p)));
      const tel = normalize(safeStr(pickTelefonoConsulta(p)));
      const espAll = normalize(safeStr(pickEspecialidadesAll(p)));

      return (
        nro.includes(q) ||
        nom.includes(q) ||
        mat.includes(q) ||
        tel.includes(q) ||
        espAll.includes(q)
      );
    });
  }, [deferredTableQuery, prestadores]);

  const selectedCode = selectedOS ? buildOsCode(selectedOS) : "";
  const isExportingAnyPdf = exportingPdf !== null;
  const canExport =
    !!selectedOS &&
    !loadingPrestadores &&
    !isExportingAnyPdf &&
    filteredPrestadores.length > 0;

  function getExportRows() {
    return filteredPrestadores.map((p) => ({
      nro_socio: safeStr(pickNroPrestador(p)),
      nombre: safeStr(pickNombre(p)),
      matricula_prov: safeStr(pickMatriculaProv(p)),
      telefono_consulta: safeStr(pickTelefonoConsulta(p)),
      especialidad: safeStr(pickEspecialidad(p)),
    }));
  }

  async function downloadExcel() {
    if (!selectedOS) return;
    if (filteredPrestadores.length === 0) {
      window.alert("No hay datos para exportar con el filtro actual.");
      return;
    }

    const rows = getExportRows();
    const wb = new ExcelJS.Workbook();
    wb.creator = "CMC";
    wb.created = new Date();

    const ws = wb.addWorksheet("Prestadores", {
      views: [{ state: "frozen", ySplit: 6 }],
      pageSetup: { fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    const C = {
      titleBlue: "FF0B1F3A",
      black: "FF111111",
      white: "FFFFFFFF",
      gray100: "FFF7F7F7",
    };

    ws.columns = [
      { header: "N° Socio", key: "nro_socio", width: 14 },
      { header: "Prestador", key: "nombre", width: 42 },
      { header: "Matricula Prov", key: "matricula_prov", width: 16 },
      { header: "Telefono", key: "telefono_consulta", width: 18 },
      { header: "Especialidades", key: "especialidad", width: 34 },
    ];

    ws.mergeCells("A2:E2");
    ws.getCell("A2").value = "Prestadores por Obra Social";
    ws.getCell("A2").font = {
      name: "Calibri",
      size: 16,
      bold: true,
      color: { argb: C.titleBlue },
    };
    ws.getCell("A2").alignment = {
      vertical: "middle",
      horizontal: "left",
    };

    ws.mergeCells("A3:E3");
    ws.getCell("A3").value = `${selectedOS.NOMBRE} (${selectedCode}) • Generado: ${fmtDate(
      new Date()
    )} • Filas: ${rows.length}`;
    ws.getCell("A3").font = {
      name: "Calibri",
      size: 11,
      color: { argb: C.black },
    };
    ws.getCell("A3").alignment = {
      vertical: "middle",
      horizontal: "left",
    };

    ws.getRow(4).height = 6;

    const headerRow = 6;
    ws.getRow(headerRow).values = [
      "N° Socio",
      "Prestador",
      "Matricula Prov",
      "Telefono",
      "Especialidades",
    ];
    ws.getRow(headerRow).height = 20;

    const tableBorder = {
      top: { style: "thin" as const, color: { argb: C.black } },
      left: { style: "thin" as const, color: { argb: C.black } },
      bottom: { style: "thin" as const, color: { argb: C.black } },
      right: { style: "thin" as const, color: { argb: C.black } },
    };

    ws.getRow(headerRow).eachCell((cell) => {
      cell.font = {
        name: "Calibri",
        size: 11,
        bold: true,
        color: { argb: C.white },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: C.black },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      cell.border = tableBorder;
    });

    rows.forEach((r, idx) => {
      const row = ws.addRow(r);
      row.height = 18;
      const zebraFill = idx % 2 === 0 ? C.white : C.gray100;

      row.eachCell((cell, col) => {
        cell.font = {
          name: "Calibri",
          size: 11,
          color: { argb: C.black },
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: zebraFill },
        };
        cell.border = tableBorder;

        if (col === 2 || col === 5) {
          cell.alignment = {
            vertical: "middle",
            horizontal: "left",
            wrapText: true,
          };
        } else {
          cell.alignment = {
            vertical: "middle",
            horizontal: "center",
          };
        }
      });
    });

    const endRow = ws.lastRow?.number ?? headerRow + 1;
    ws.autoFilter = {
      from: { row: headerRow, column: 1 },
      to: { row: endRow, column: 5 },
    };

    ws.getRow(1).height = 6;

    const buf = await wb.xlsx.writeBuffer();
    saveAs(
      new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `prestadores_${selectedCode}_${fmtDate(new Date())}.xlsx`
    );
  }

  async function downloadPdf() {
    if (!selectedOS) return;
    if (filteredPrestadores.length === 0) {
      window.alert("No hay datos para exportar con el filtro actual.");
      return;
    }

    const showMail = shouldShowMailForOS(selectedOS);

    pdfAbortRef.current?.abort();
    const controller = new AbortController();
    pdfAbortRef.current = controller;

    try {
      setExportingPdf("pdf");

      const { JsPDF, autoTable } = await loadPdfLibs();
      if (controller.signal.aborted) return;

      const enriched = await enrichForPdf(
        filteredPrestadores,
        showMail,
        controller.signal
      );
      if (controller.signal.aborted) return;

      const head = [[
        "N° Socio",
        "Prestador",
        "Matricula Prov",
        "Telefono",
        "Especialidades",
        "Dirección consultorio",
        ...(showMail ? ["Correo electrónico"] : []),
      ]];

      const body = enriched.map((p) => {
        const row = [
          safeStr(pickNroPrestador(p)),
          safeStr(pickNombre(p)),
          safeStr(pickMatriculaProv(p)),
          safeStr(pickTelefonoConsulta(p)),
          safeStr(pickEspecialidad(p)),
          safeStr(pickDomicilioConsulta(p)),
        ];
        if (showMail) row.push(safeStr(pickMailParticular(p)));
        return row;
      });

      const doc = new JsPDF({ orientation: "landscape", compress: true });

      const drawHeader = () => {
        doc.setFontSize(14);
        doc.text("Prestadores por Obra Social", 14, 14);
        doc.setFontSize(11);
        doc.text(
          `${selectedOS.NOMBRE} (${selectedCode}) • ${fmtDate(
            new Date()
          )} • Filas: ${body.length}`,
          14,
          22
        );
      };

      autoTable(doc, {
        head,
        body,
        startY: 28,
        margin: { top: 26 },
        didDrawPage: drawHeader,
        styles: {
          fontSize: 7,
          cellPadding: 2,
          valign: "middle",
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [17, 17, 17],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: [247, 247, 247] },
        columnStyles: showMail
          ? {
              0: { cellWidth: 18 },
              1: { cellWidth: 55 },
              2: { cellWidth: 22 },
              3: { cellWidth: 24 },
              4: { cellWidth: 52 },
              5: { cellWidth: 62 },
              6: { cellWidth: 32 },
            }
          : {
              0: { cellWidth: 20 },
              1: { cellWidth: 60 },
              2: { cellWidth: 24 },
              3: { cellWidth: 26 },
              4: { cellWidth: 60 },
              5: { cellWidth: 95 },
            },
      });

      if (controller.signal.aborted) return;

      saveAs(
        doc.output("blob"),
        `prestadores_${selectedCode}_${fmtDate(new Date())}.pdf`
      );
    } catch (e: any) {
      if (controller.signal.aborted) return;
      console.error(e);
      window.alert("No se pudo generar el PDF. Probá filtrar más o exportar Excel.");
    } finally {
      if (pdfAbortRef.current === controller) pdfAbortRef.current = null;
      setExportingPdf(null);
    }
  }

  async function downloadPdfByEspecialidad() {
    if (!selectedOS) return;
    if (filteredPrestadores.length === 0) {
      window.alert("No hay datos para exportar con el filtro actual.");
      return;
    }

    const showMail = shouldShowMailForOS(selectedOS);

    pdfAbortRef.current?.abort();
    const controller = new AbortController();
    pdfAbortRef.current = controller;

    try {
      setExportingPdf("pdf_by_especialidad");

      const { JsPDF, autoTable } = await loadPdfLibs();
      if (controller.signal.aborted) return;

      const enrichedAll = await enrichForPdf(
        filteredPrestadores,
        showMail,
        controller.signal
      );
      if (controller.signal.aborted) return;

      const groups = new Map<string, Prestador[]>();
      const labelByKey = new Map<string, string>();

      const sinKey = normalize("Sin especialidad");
      labelByKey.set(sinKey, "Sin especialidad");

      for (const p of enrichedAll) {
        const list = pickEspecialidadesList(p);

        if (list.length === 0) {
          const arr = groups.get(sinKey) ?? [];
          arr.push(p);
          groups.set(sinKey, arr);
          continue;
        }

        for (const esp of list) {
          const label = safeStr(esp).trim();
          if (!label) continue;

          const key = normalize(label);
          if (!key) continue;

          if (!labelByKey.has(key)) labelByKey.set(key, label);

          const arr = groups.get(key) ?? [];
          arr.push(p);
          groups.set(key, arr);
        }
      }

      const keys = Array.from(groups.keys()).sort((a, b) =>
        safeStr(labelByKey.get(a)).localeCompare(safeStr(labelByKey.get(b)), "es")
      );

      for (const k of keys) {
        const arr = groups.get(k)!;
        arr.sort((a, b) =>
          safeStr(pickNombre(a)).localeCompare(safeStr(pickNombre(b)), "es")
        );
      }

      const doc = new JsPDF({ orientation: "landscape", compress: true });

      keys.forEach((k, idx) => {
        if (idx > 0) doc.addPage();

        const arr = groups.get(k)!;
        const espLabel = safeStr(labelByKey.get(k));

        const drawHeader = () => {
          doc.setFontSize(14);
          doc.text("Prestadores por Obra Social", 14, 14);

          doc.setFontSize(11);
          doc.text(
            `${selectedOS.NOMBRE} (${selectedCode}) • ${fmtDate(new Date())} • ${
              arr.length
            } ${arr.length === 1 ? "prestador" : "prestadores"}`,
            14,
            22
          );

          doc.setFontSize(11);
          doc.text(`Especialidad: ${espLabel}`, 14, 28);
        };

        const head = [[
          "N° Socio",
          "Prestador",
          "Matricula Prov",
          "Telefono",
          "Especialidades",
          "Dirección consultorio",
          ...(showMail ? ["Correo electrónico"] : []),
        ]];

        const body = arr.map((p) => {
          const row = [
            safeStr(pickNroPrestador(p)),
            safeStr(pickNombre(p)),
            safeStr(pickMatriculaProv(p)),
            safeStr(pickTelefonoConsulta(p)),
            safeStr(pickEspecialidad(p)),
            safeStr(pickDomicilioConsulta(p)),
          ];
          if (showMail) row.push(safeStr(pickMailParticular(p)));
          return row;
        });

        autoTable(doc, {
          head,
          body,
          startY: 34,
          margin: { top: 32 },
          didDrawPage: drawHeader,
          styles: {
            fontSize: 7,
            cellPadding: 2,
            valign: "middle",
            overflow: "linebreak",
          },
          headStyles: {
            fillColor: [17, 17, 17],
            textColor: [255, 255, 255],
            fontStyle: "bold",
          },
          alternateRowStyles: { fillColor: [247, 247, 247] },
          columnStyles: showMail
            ? {
                0: { cellWidth: 18 },
                1: { cellWidth: 62 },
                2: { cellWidth: 24 },
                3: { cellWidth: 26 },
                4: { cellWidth: 55 },
                5: { cellWidth: 88 },
                6: { cellWidth: 32 },
              }
            : {
                0: { cellWidth: 20 },
                1: { cellWidth: 78 },
                2: { cellWidth: 26 },
                3: { cellWidth: 30 },
                4: { cellWidth: 60 },
                5: { cellWidth: 104 },
              },
        });
      });

      if (controller.signal.aborted) return;

      saveAs(
        doc.output("blob"),
        `prestadores_${selectedCode}_por_especialidad_${fmtDate(new Date())}.pdf`
      );
    } catch (e: any) {
      if (controller.signal.aborted) return;
      console.error(e);
      window.alert(
        "No se pudo generar el PDF por especialidad. Probá filtrar más o exportar Excel."
      );
    } finally {
      if (pdfAbortRef.current === controller) pdfAbortRef.current = null;
      setExportingPdf(null);
    }
  }

  const selectOS = useCallback((os: ObraSocial) => {
    setSelectedOS(os);
    setOsQuery("");
    setOsDropdownOpen(false);
  }, []);

  const clearOS = useCallback(() => {
    pdfAbortRef.current?.abort();
    setSelectedOS(null);
    setPrestadores([]);
    setErrorPrestadores(null);
    setTableQuery("");
    setOsQuery("");
    setOsDropdownOpen(false);
    setExportingPdf(null);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <section className={styles.hero}>
          <div className={styles.heroMain}>
            <span className={styles.heroEyebrow}>Padrones</span>
            <h1 className={styles.title}>Prestadores por Obra Social</h1>
            <p className={styles.subtitle}>
              Seleccioná una obra social, filtrá prestadores y exportá el
              resultado en PDF o Excel con una interfaz más clara y rápida.
            </p>
          </div>

          <div className={styles.heroStats}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Obra social</span>
              <strong className={styles.statValue}>
                {selectedOS ? selectedCode : "Sin seleccionar"}
              </strong>
            </div>

            <div className={styles.statCard}>
              <span className={styles.statLabel}>Prestadores</span>
              <strong className={styles.statValue}>{filteredPrestadores.length}</strong>
            </div>

            <div className={styles.statCard}>
              <span className={styles.statLabel}>Exportación</span>
              <strong className={styles.statValue}>
                {isExportingAnyPdf ? "Procesando…" : "Disponible"}
              </strong>
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderContent}>
              <div>
                <h2 className={styles.cardTitle}>Consulta de prestadores</h2>
                <p className={styles.cardDescription}>
                  Elegí la obra social desde el buscador, refiná resultados y
                  trabajá con exportaciones optimizadas.
                </p>
              </div>

              {selectedOS ? (
                <div className={styles.selectedBadge}>
                  <Sparkles size={14} />
                  <span>
                    {selectedOS.NOMBRE} ({selectedCode})
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          <div className={styles.cardContent}>
            <div className={styles.topRow}>
              <div className={styles.osPicker} ref={dropdownRef}>
                <button
                  type="button"
                  className={styles.osButton}
                  onClick={toggleDropdown}
                  aria-expanded={osDropdownOpen}
                  disabled={loadingObras}
                >
                  <div className={styles.osButtonContent}>
                    <span className={styles.osButtonLabel}>Obra social</span>
                    <span className={styles.osButtonValue}>
                      {loadingObras
                        ? "Cargando obras sociales…"
                        : selectedOS
                        ? `${selectedOS.NOMBRE} (${selectedCode})`
                        : "Seleccioná una obra social"}
                    </span>
                  </div>

                  <ChevronDown
                    className={`${styles.chevron} ${
                      osDropdownOpen ? styles.chevronOpen : ""
                    }`}
                  />
                </button>

                {osDropdownOpen && (
                  <div className={styles.dropdown}>
                    <div className={styles.dropdownSearch}>
                      <Search className={styles.searchIconSmall} />
                      <input
                        className={styles.dropdownInput}
                        value={osQuery}
                        onChange={(e) => setOsQuery(e.target.value)}
                        onFocus={openDropdown}
                        placeholder="Buscar por nombre o código…"
                        aria-label="Buscar obra social"
                        autoFocus
                      />

                      {(osQuery.trim() || selectedOS) && (
                        <button
                          className={styles.clearBtn}
                          type="button"
                          onClick={clearOS}
                          title="Limpiar selección"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>

                    <div className={styles.dropdownMeta}>
                      {loadingObras ? (
                        <span>Cargando…</span>
                      ) : errorObras ? (
                        <span>Error al cargar</span>
                      ) : hiddenOsCount > 0 ? (
                        <span>
                          Mostrando {filteredOS.length} de {obras.length}. Escribí
                          para filtrar más.
                        </span>
                      ) : (
                        <span>{filteredOS.length} resultado(s)</span>
                      )}
                    </div>

                    <div className={styles.dropdownList}>
                      {loadingObras ? (
                        <div className={styles.emptyMessage}>
                          Cargando obras sociales…
                        </div>
                      ) : errorObras ? (
                        <div className={styles.errorMessage}>{errorObras}</div>
                      ) : filteredOS.length === 0 ? (
                        <div className={styles.emptyMessage}>
                          Sin resultados para "{osQuery}"
                        </div>
                      ) : (
                        filteredOS.map((os) => {
                          const code = buildOsCode(os);
                          const active =
                            selectedOS?.NRO_OBRA_SOCIAL === os.NRO_OBRA_SOCIAL;

                          return (
                            <button
                              key={os.NRO_OBRA_SOCIAL}
                              type="button"
                              className={`${styles.dropdownItem} ${
                                active ? styles.dropdownItemActive : ""
                              }`}
                              onClick={() => selectOS(os)}
                            >
                              <span className={styles.dropdownItemName}>
                                {os.NOMBRE}
                              </span>
                              <span className={styles.dropdownItemCode}>
                                {code}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={downloadPdf}
                  disabled={!canExport}
                >
                  <FileText size={18} />
                  <span>{exportingPdf === "pdf" ? "Generando…" : "Descargar PDF"}</span>
                </button>

                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={downloadPdfByEspecialidad}
                  disabled={!canExport}
                >
                  <FileText size={18} />
                  <span>
                    {exportingPdf === "pdf_by_especialidad"
                      ? "Generando…"
                      : "PDF por especialidad"}
                  </span>
                </button>

                <button
                  type="button"
                  className={styles.actionBtnPrimary}
                  onClick={downloadExcel}
                  disabled={!canExport}
                >
                  <FileSpreadsheet size={18} />
                  <span>Descargar Excel</span>
                </button>
              </div>
            </div>

            {selectedOS && (
              <div className={styles.searchWrapper}>
                <Search className={styles.searchIcon} />
                <input
                  className={styles.searchInput}
                  value={tableQuery}
                  onChange={(e) => setTableQuery(e.target.value)}
                  placeholder="Buscar por nombre, N° socio, matrícula, teléfono o especialidad…"
                  disabled={loadingPrestadores}
                  aria-label="Buscar prestador"
                />
                {tableQuery.trim() && (
                  <button
                    className={styles.clearBtn}
                    type="button"
                    onClick={() => setTableQuery("")}
                    title="Limpiar búsqueda"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            )}

            {!selectedOS ? (
              <div className={styles.emptyState}>
                <Building2 size={46} className={styles.emptyIcon} />
                <h3 className={styles.emptyTitle}>Seleccioná una obra social</h3>
                <p className={styles.emptyMessage}>
                  Abrí el selector superior, buscá por nombre o código y accedé
                  al listado completo de prestadores.
                </p>
              </div>
            ) : loadingPrestadores ? (
              <div className={styles.loadingState}>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} />
                </div>
                <p className={styles.loadingText}>Cargando prestadores…</p>
              </div>
            ) : errorPrestadores ? (
              <div className={styles.errorMessage}>{errorPrestadores}</div>
            ) : (
              <>
                <div className={styles.resultsHeader}>
                  <p className={styles.resultsCount}>
                    Mostrando <strong>{filteredPrestadores.length}</strong> de{" "}
                    <strong>{prestadores.length}</strong> prestadores
                  </p>

                 
                </div>

                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>N° Socio</th>
                        <th>Nombre Completo</th>
                        <th>Matricula Prov</th>
                        <th>Telefono</th>
                        <th>Especialidades</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredPrestadores.length === 0 ? (
                        <tr>
                          <td colSpan={6} className={styles.noResults}>
                            No se encontraron prestadores que coincidan con "
                            {tableQuery}"
                          </td>
                        </tr>
                      ) : (
                        filteredPrestadores.map((p, idx) => {
                          const nro = safeStr(pickNroPrestador(p));
                          const nom = safeStr(pickNombre(p));
                          const mat = safeStr(pickMatriculaProv(p));
                          const tel = safeStr(pickTelefonoConsulta(p));
                          const esp = safeStr(pickEspecialidad(p));

                          return (
                            <tr key={String(p.id ?? `${nro}-${mat}-${idx}`)}>
                              <td>{nro}</td>
                              <td className={styles.tdName}>{nom}</td>
                              <td>{mat}</td>
                              <td>{tel}</td>
                              <td>{esp || "—"}</td>
                              <td>
                                <button
                                  type="button"
                                  className={styles.rowButton}
                                  onClick={() => goToDoctorPadrones(p.id)}
                                  disabled={!p.id}
                                >
                                  Editar
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AfiliadosPorObraSocialPage;