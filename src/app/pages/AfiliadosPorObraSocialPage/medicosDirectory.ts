import { http } from "@/app/shared/lib/http";
import type { MedicoExtra } from "./types";

/** Ficha completa de todos los médicos, para las columnas que el padrón no trae. */

const ENDPOINT = "/api/medicos/all";
const TIMEOUT_MS = 120_000;

export type MedicosIndex = {
  /** Ficha por `listado_medico.ID`. */
  porId: Map<string, MedicoExtra>;
  /** Ficha por N° de socio — respaldo si el padrón no trajo el ID. */
  porSocio: Map<string, MedicoExtra>;
};

let cache: MedicosIndex | null = null;
let enVuelo: Promise<MedicosIndex> | null = null;

const clave = (v: unknown): string => {
  const s = v === null || v === undefined ? "" : String(v).trim();
  return s && s !== "0" ? s : "";
};

function indexar(filas: unknown[]): MedicosIndex {
  const porId = new Map<string, MedicoExtra>();
  const porSocio = new Map<string, MedicoExtra>();
  for (const fila of filas) {
    if (!fila || typeof fila !== "object") continue;
    const f = fila as MedicoExtra;
    const id = clave(f.id);
    const socio = clave(f.nro_socio);
    if (id) porId.set(id, f);
    // El primero gana: si dos registros comparten N° de socio, el índice por ID sigue siendo el bueno y este es sólo un respaldo.
    if (socio && !porSocio.has(socio)) porSocio.set(socio, f);
  }
  return { porId, porSocio };
}

/** Trae (o reutiliza) el índice de fichas. Lanza si el usuario no tiene permiso. */
export async function getMedicosIndex(signal?: AbortSignal): Promise<MedicosIndex> {
  if (cache) return cache;
  // Sin esto, dos exportaciones seguidas disparan dos descargas de 8 MB.
  if (enVuelo) return enVuelo;

  enVuelo = (async () => {
    // A propósito sin `signal`: si el usuario cancela una exportación, la descarga igual sirve para la próxima.
    const { data } = await http.get(ENDPOINT, { timeout: TIMEOUT_MS });
    const filas = Array.isArray(data) ? data : [];
    cache = indexar(filas);
    return cache;
  })();

  try {
    const idx = await enVuelo;
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    return idx;
  } finally {
    enVuelo = null;
  }
}

/** Adosa la ficha completa a cada fila del padrón. */
export function adosarFichas<T extends { id?: unknown; nro_socio?: unknown }>(
  filas: T[],
  idx: MedicosIndex
): (T & { extra: MedicoExtra | null })[] {
  return filas.map((f) => {
    const id = clave(f.id);
    const socio = clave(f.nro_socio);
    const extra =
      (id ? idx.porId.get(id) : undefined) ??
      (socio ? idx.porSocio.get(socio) : undefined) ??
      null;
    return { ...f, extra };
  });
}

