/**
 * chatbot.service.ts
 * ──────────────────
 * Async API helpers used by the chatbot for live data lookups.
 *
 * Security rules:
 *  - Internal endpoint paths are never returned to callers.
 *  - Auth tokens are never attached manually — handled by axios defaults.
 *  - All API errors are caught; callers receive typed results, never raw errors.
 */

import axios from "axios";

// ─── Internal normalizer ──────────────────────────────────────────────────────

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── OS list cache (5-minute TTL) ────────────────────────────────────────────

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
      const nombre = String(
        item?.NOMBRE ?? item?.nombre ?? item?.OBRA_SOCIAL ?? item?.name ?? ""
      ).trim();
      if (!nombre) return null;
      const nro = Number(
        item?.NRO_OBRA_SOCIAL ?? item?.NRO_OBRASOCIAL ?? item?.nro_obra_social ?? item?.id ?? 0
      );
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
    const list = await fetchOSList(signal);
    const match = findByName(list, query);
    return { found: !!match, name: match?.nombre ?? null };
  } catch {
    return null;
  }
}
