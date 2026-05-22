/**
 * chatbot.service.ts
 * ──────────────────
 * Async API helpers used by the chatbot for live data lookups.
 *
 * Security rules enforced here:
 *  - Internal endpoint paths are never returned to callers.
 *  - Auth tokens are never attached manually — the http instance handles that.
 *  - All API errors are caught; callers receive typed results, never raw error details.
 *  - Only data originating from our own API is shown to users — never raw user text.
 */

import axios from "axios";
import { http } from "../../../app/lib/http";
import {
  normalizeRow,
  extractRowsFromPayload,
  filterRowsByCodigo,
  buildLatestPerOS,
} from "../../../app/pages/BoletinConsultaComun/boletinConsultaComun.api";
import {
  CONSULTA_COMUN_CODE,
  MAX_API_PAGES,
  PAGE_SIZE,
} from "../../../app/pages/BoletinConsultaComun/boletinConsultaComun.constants";
import type { ConsultaComunItem } from "../../../app/pages/BoletinConsultaComun/boletinConsultaComun.types";

// ─── Normalizer (mirrors chatbot.engine.ts) ───────────────────────────────────

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Formatters ───────────────────────────────────────────────────────────────

const ARS_FORMAT = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatARS(value: number): string {
  return ARS_FORMAT.format(value);
}

function formatFechaRaw(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  let t = Date.parse(s);
  if (isNaN(t)) {
    const m4 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (m4) t = Date.parse(`${m4[3]}-${m4[2].padStart(2, "0")}-${m4[1].padStart(2, "0")}`);
  }
  if (isNaN(t)) {
    const m2 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
    if (m2) {
      const yy = parseInt(m2[3], 10);
      const yyyy = yy < 50 ? 2000 + yy : 1900 + yy;
      t = Date.parse(`${yyyy}-${m2[2].padStart(2, "0")}-${m2[1].padStart(2, "0")}`);
    }
  }
  if (isNaN(t)) return null;
  try {
    return new Date(t).toLocaleDateString("es-AR", { dateStyle: "short" });
  } catch {
    return null;
  }
}

// ─── Boletin fetch using http (withCredentials: true, same as the rest of site) ─
//     Uses relative URL /api/valores/boletin → goes through the Vite proxy /
//     production reverse proxy with full credentials, same as the boletin page.

async function fetchBoletinPageViaHttp(
  page: number,
  signal?: AbortSignal
): Promise<ReturnType<typeof normalizeRow>[]> {
  const response = await http.get("/api/valores/boletin", {
    signal,
    timeout: 20_000,
    params: { codigo: CONSULTA_COMUN_CODE, page, size: PAGE_SIZE },
  });

  const rows = extractRowsFromPayload(response.data);
  if (!rows) throw new Error("Respuesta inesperada del servidor.");
  return rows.map(normalizeRow);
}

async function fetchAllBoletinItems(
  signal?: AbortSignal
): Promise<ConsultaComunItem[]> {
  const allRows: ReturnType<typeof normalizeRow>[] = [];
  let previousSignature = "";

  for (let page = 1; page <= MAX_API_PAGES; page++) {
    if (signal?.aborted) break;

    const pageRows = await fetchBoletinPageViaHttp(page, signal);

    if (pageRows.length === 0) break;

    const sig = `${pageRows.length}-${pageRows[0]?.id ?? "x"}-${pageRows[pageRows.length - 1]?.id ?? "y"}`;
    if (sig === previousSignature) break;
    previousSignature = sig;

    allRows.push(...pageRows);

    if (pageRows.length < PAGE_SIZE) break;
  }

  const filtered = filterRowsByCodigo(allRows, CONSULTA_COMUN_CODE);
  return buildLatestPerOS(filtered);
}

// ─── OS list cache (for convenio check) ──────────────────────────────────────

interface OSEntry { nombre: string; nro: number; }

let _osCache: OSEntry[] | null = null;
let _osCacheTs = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function fetchOSList(signal?: AbortSignal): Promise<OSEntry[]> {
  if (_osCache !== null && Date.now() - _osCacheTs < CACHE_TTL_MS) return _osCache;

  const { data } = await axios.get("/api/obras_social/", {
    signal,
    timeout: 8_000,
    withCredentials: false,
    headers: { Accept: "application/json" },
  });

  const items: unknown[] = Array.isArray(data) ? data
    : Array.isArray((data as any)?.items) ? (data as any).items
    : Array.isArray((data as any)?.results) ? (data as any).results
    : [];

  const list: OSEntry[] = items
    .map((item: any): OSEntry | null => {
      const nombre = String(item?.NOMBRE ?? item?.nombre ?? item?.OBRA_SOCIAL ?? item?.name ?? "").trim();
      if (!nombre) return null;
      const nro = Number(item?.NRO_OBRA_SOCIAL ?? item?.NRO_OBRASOCIAL ?? item?.nro_obra_social ?? item?.id ?? 0);
      return { nombre, nro };
    })
    .filter((x): x is OSEntry => x !== null);

  _osCache = list;
  _osCacheTs = Date.now();
  return list;
}

function findByName<T extends { nombre: string }>(list: T[], query: string): T | undefined {
  const q = normalize(query);
  return list.find((item) => {
    const nn = normalize(item.nombre);
    if (nn.length < 3) return false;
    return nn.includes(q) || (q.includes(nn) && nn.length >= 4);
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface OSCheckResult {
  found: boolean;
  name: string | null;
}

export async function checkObraSocial(
  query: string,
  signal?: AbortSignal
): Promise<OSCheckResult | null> {
  const q = normalize(query);
  if (q.length < 2) return { found: false, name: null };
  try {
    const list  = await fetchOSList(signal);
    const match = findByName(list, query);
    return { found: !!match, name: match?.nombre ?? null };
  } catch {
    return null;
  }
}

export interface PrecioOSResult {
  osFound: boolean;
  osName: string | null;
  valorFound: boolean;
  valorFormatted: string | null;
  fechaCambio: string | null;
}

export async function fetchPrecioConsultaPorOS(
  query: string,
  signal?: AbortSignal
): Promise<PrecioOSResult | null> {
  const q = normalize(query);
  if (q.length < 2) {
    return { osFound: false, osName: null, valorFound: false, valorFormatted: null, fechaCambio: null };
  }

  try {
    const items = await fetchAllBoletinItems(signal);
    if (signal?.aborted) return null;

    const item = findByName(items, query);
    if (!item) {
      return { osFound: false, osName: null, valorFound: false, valorFormatted: null, fechaCambio: null };
    }

    return {
      osFound: true,
      osName: item.nombre,
      valorFound: item.valor > 0,
      valorFormatted: item.valor > 0 ? formatARS(item.valor) : null,
      fechaCambio: formatFechaRaw(item.fechaCambio),
    };
  } catch {
    return null;
  }
}

export async function fetchPrecioConsultaInfo(
  signal?: AbortSignal
): Promise<boolean> {
  try {
    const items = await fetchAllBoletinItems(signal);
    return items.length > 0;
  } catch {
    return false;
  }
}
