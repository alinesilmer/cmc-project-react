import axios from "axios";
import type { ObraSocial, Prestador, ContactoPayload, ExportOptions } from "./types";
import {
  safeStr,
  sanitizePhone,
  cleanEspecialidades,
  coerceToStringArray,
} from "./helpers";

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

const PDF_REQ_TIMEOUT_MS = 12_000;
const PDF_CONTACT_CONCURRENCY = 4;
const PDF_ENRICH_MAX = 700;
const CONTACT_CACHE_MAX = 5_000;

const contactoCache = new Map<string, ContactoPayload>();

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

function unwrapPrestadorSource(it: any) {
  return it?.prestador ?? it?.medico ?? it?.doctor ?? it?.data ?? it?.item ?? it;
}

function mapItemToPrestador(it: any): Prestador {
  const src = unwrapPrestadorSource(it);

  const id = src?.ID ?? src?.id ?? it?.ID ?? it?.id ?? null;
  const nro =
    src?.NRO_SOCIO ?? src?.nro_socio ?? src?.SOCIO ?? src?.socio ??
    it?.NRO_SOCIO ?? it?.nro_socio ?? it?.SOCIO ?? it?.socio ?? null;
  const nombre = src?.NOMBRE ?? src?.nombre ?? it?.NOMBRE ?? it?.nombre ?? null;
  const matricula_prov =
    src?.MATRICULA_PROV ?? src?.matricula_prov ??
    it?.MATRICULA_PROV ?? it?.matricula_prov ?? null;

  const telefono_raw =
    src?.tel_consulta ?? src?.TEL_CONSULTA ??
    src?.TELEFONO_CONSULTA ?? src?.telefono_consulta ??
    it?.tel_consulta ?? it?.TEL_CONSULTA ??
    it?.TELEFONO_CONSULTA ?? it?.telefono_consulta ?? null;

  const telefono_consulta = sanitizePhone(telefono_raw);

  const especialidadesRaw =
    src?.ESPECIALIDADES ?? src?.especialidades ??
    it?.ESPECIALIDADES ?? it?.especialidades ?? null;
  const especialidadSingle =
    src?.ESPECIALIDAD ?? src?.especialidad ??
    it?.ESPECIALIDAD ?? it?.especialidad ?? null;
  const especialidades = cleanEspecialidades(coerceToStringArray(especialidadesRaw));
  const especialidad =
    especialidades[0] ?? (especialidadSingle ? safeStr(especialidadSingle) : null);

  const domicilio_consulta =
    src?.DOMICILIO_CONSULTA ?? src?.domicilio_consulta ??
    it?.DOMICILIO_CONSULTA ?? it?.domicilio_consulta ?? null;
  const mail_particular =
    src?.MAIL_PARTICULAR ?? src?.mail_particular ??
    it?.MAIL_PARTICULAR ?? it?.mail_particular ?? null;
  const cuit =
    src?.CUIT ?? src?.cuit ?? it?.CUIT ?? it?.cuit ?? null;
  const codigo_postal =
    src?.CODIGO_POSTAL ?? src?.codigo_postal ??
    it?.CODIGO_POSTAL ?? it?.codigo_postal ?? null;

  return {
    id, nro_socio: nro, socio: nro, apellido_nombre: nombre, nombre,
    matricula_prov, telefono_consulta, especialidades, especialidad,
    domicilio_consulta, mail_particular, cuit, codigo_postal,
  };
}

export async function fetchObrasSociales(
  signal?: AbortSignal
): Promise<ObraSocial[]> {
  const { data } = await axios.get(ENDPOINTS.obrasSociales, {
    signal,
    timeout: 20_000,
  } as any);
  const arr = Array.isArray(data) ? data : [];
  return arr
    .map(mapObraSocialRawToOS)
    .sort((a, b) => a.NOMBRE.localeCompare(b.NOMBRE, "es"));
}

export async function fetchPrestadoresAllPages(
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

async function fetchContactoById(
  id: string,
  signal?: AbortSignal
): Promise<ContactoPayload> {
  const cached = contactoCache.get(id);
  if (cached) return cached;

  for (const url of ENDPOINTS.prestadorDetailCandidates(id)) {
    try {
      const { data } = await axios.get(url, {
        signal,
        timeout: PDF_REQ_TIMEOUT_MS,
      } as any);
      const src = unwrapPrestadorSource(data);
      const payload: ContactoPayload = {
        domicilio_consulta:
          src?.DOMICILIO_CONSULTA ?? src?.domicilio_consulta ??
          data?.DOMICILIO_CONSULTA ?? data?.domicilio_consulta ?? null,
        mail_particular:
          src?.MAIL_PARTICULAR ?? src?.mail_particular ??
          data?.MAIL_PARTICULAR ?? data?.mail_particular ?? null,
        cuit: src?.CUIT ?? src?.cuit ?? data?.CUIT ?? data?.cuit ?? null,
        codigo_postal:
          src?.CODIGO_POSTAL ?? src?.codigo_postal ??
          data?.CODIGO_POSTAL ?? data?.codigo_postal ?? null,
      };
      if (contactoCache.size > CONTACT_CACHE_MAX) contactoCache.clear();
      contactoCache.set(id, payload);
      return payload;
    } catch (e: any) {
      if (signal?.aborted) throw e;
    }
  }

  const fallback: ContactoPayload = {
    domicilio_consulta: null, mail_particular: null,
    cuit: null, codigo_postal: null,
  };
  contactoCache.set(id, fallback);
  return fallback;
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

  await Promise.all(Array.from({ length: Math.max(1, limit) }, () => worker()));
  return results;
}

export async function enrichForPdf(
  rows: Prestador[],
  opts: ExportOptions,
  signal?: AbortSignal
): Promise<Prestador[]> {
  const needAll = rows
    .map((p, idx) => ({ p, idx }))
    .filter(({ p }) => {
      const missAddr = !safeStr(p.domicilio_consulta).trim();
      const missMail = opts.includeEmail && !safeStr(p.mail_particular).trim();
      const missCuit = opts.includeCuit  && !safeStr(p.cuit).trim();
      const missCP   = opts.includeCP    && !safeStr(p.codigo_postal).trim();
      return (missAddr || missMail || missCuit || missCP) && !!p.id;
    });

  if (needAll.length === 0 || signal?.aborted) return rows;

  const need = needAll.slice(0, PDF_ENRICH_MAX);
  if (needAll.length > PDF_ENRICH_MAX) {
    console.warn(
      `[PDF] Enriquecimiento limitado a ${PDF_ENRICH_MAX}. Se omiten ${
        needAll.length - PDF_ENRICH_MAX
      } contactos.`
    );
  }

  const fetched = await mapWithConcurrency(
    need,
    PDF_CONTACT_CONCURRENCY,
    signal,
    async ({ p, idx }) => ({
      idx,
      c: await fetchContactoById(String(p.id), signal),
    })
  );

  const out = rows.slice();
  for (const item of fetched) {
    if (!item) continue;
    const { idx, c } = item as any;
    const prev = out[idx];
    out[idx] = {
      ...prev,
      domicilio_consulta: safeStr(prev.domicilio_consulta).trim() ? prev.domicilio_consulta : c.domicilio_consulta,
      mail_particular:   safeStr(prev.mail_particular).trim()   ? prev.mail_particular   : c.mail_particular,
      cuit:              safeStr(prev.cuit).trim()              ? prev.cuit              : c.cuit,
      codigo_postal:     safeStr(prev.codigo_postal).trim()     ? prev.codigo_postal     : c.codigo_postal,
    };
  }
  return out;
}
