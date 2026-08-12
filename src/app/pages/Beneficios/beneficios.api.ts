import { getJSON, postJSON, patchJSON, delJSON } from "../../lib/http";
import type {
  Beneficio,
  BeneficioCreatePayload,
  BeneficioUpdatePayload,
} from "./beneficios.types";

const BASE = "/api/beneficios";

/** GET /api/beneficios — requiere scope `beneficios:gestionar`. */
export const getBeneficios = (params?: {
  categoria?: string;
  activo?: boolean;
  q?: string;
  skip?: number;
  limit?: number;
}): Promise<Beneficio[]> => getJSON<Beneficio[]>(`${BASE}/`, params);

/** GET /api/beneficios/vigentes — activos y no vencidos.
 *  A diferencia del resto del módulo NO pide `beneficios:gestionar`: es la
 *  lectura que consume el portal del socio (Inicio médico). */
export const getBeneficiosVigentes = (limit?: number): Promise<Beneficio[]> =>
  getJSON<Beneficio[]>(`${BASE}/vigentes`, limit ? { limit } : undefined);

/** GET /api/beneficios/categorias — catálogo fijo que pobla el select. */
export const getCategorias = (): Promise<string[]> =>
  getJSON<string[]>(`${BASE}/categorias`);

/** POST /api/beneficios */
export const createBeneficio = (
  payload: BeneficioCreatePayload
): Promise<Beneficio> => postJSON<Beneficio>(`${BASE}/`, payload);

/** PATCH /api/beneficios/{id} — parcial. */
export const updateBeneficio = (
  id: number,
  payload: BeneficioUpdatePayload
): Promise<Beneficio> => patchJSON<Beneficio>(`${BASE}/${id}`, payload);

/** DELETE /api/beneficios/{id} */
export const deleteBeneficio = (id: number): Promise<void> =>
  delJSON<void>(`${BASE}/${id}`);
