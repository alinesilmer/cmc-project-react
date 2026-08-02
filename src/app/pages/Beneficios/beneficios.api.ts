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
