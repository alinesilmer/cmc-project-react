import { getJSON, postJSON, patchJSON } from "../../lib/http";
import type { Especialidad, EspecialidadPayload } from "./especialidades.types";

const BASE = "/api/especialidades/";

/**
 * GET /api/especialidades
 * Returns the full list of specialties.
 */
export const getEspecialidades = (): Promise<Especialidad[]> =>
  getJSON<Especialidad[]>(BASE);

/**
 * POST /api/especialidades
 * Payload: { id_colegio_espe: number, nombre: string }
 * Returns the created specialty with its assigned ID.
 */
export const createEspecialidad = (payload: EspecialidadPayload): Promise<Especialidad> =>
  postJSON<Especialidad>(BASE, payload);

/**
 * PATCH /api/especialidades/{id}
 * Payload: { id_colegio_espe: number, nombre: string }
 * Returns the updated specialty.
 */
export const updateEspecialidad = (
  id: number,
  payload: EspecialidadPayload
): Promise<Especialidad> =>
  patchJSON<Especialidad>(`${BASE}/${id}`, payload);
