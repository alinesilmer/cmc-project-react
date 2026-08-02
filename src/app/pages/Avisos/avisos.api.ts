import { getJSON, postJSON, patchJSON, delJSON } from "../../lib/http";
import type { Aviso, AvisoCreatePayload, AvisoUpdatePayload } from "./avisos.types";

// Ojo: la tabla del backend es `avisos_push` (el nombre `avisos` ya lo ocupa una
// tabla legacy), pero el endpoint sí es /api/avisos.
const BASE = "/api/avisos";

/** GET /api/avisos — historial, más reciente primero. Requiere `avisos:gestionar`. */
export const getAvisos = (params?: {
  tipo?: string;
  activo?: boolean;
  q?: string;
  skip?: number;
  limit?: number;
}): Promise<Aviso[]> => getJSON<Aviso[]>(`${BASE}/`, params);

/** GET /api/avisos/tipos — catálogo fijo que pobla el select. */
export const getTipos = (): Promise<string[]> => getJSON<string[]>(`${BASE}/tipos`);

/** POST /api/avisos — publica el aviso para todos los socios. */
export const createAviso = (payload: AvisoCreatePayload): Promise<Aviso> =>
  postJSON<Aviso>(`${BASE}/`, payload);

/** PATCH /api/avisos/{id} — parcial; se usa sobre todo para bajarlo (activo=false). */
export const updateAviso = (
  id: number,
  payload: AvisoUpdatePayload
): Promise<Aviso> => patchJSON<Aviso>(`${BASE}/${id}`, payload);

/** DELETE /api/avisos/{id} */
export const deleteAviso = (id: number): Promise<void> =>
  delJSON<void>(`${BASE}/${id}`);
