import { delJSON, getJSON, patchForm, postForm } from "../../lib/http";
import type { Planilla } from "./planillas.types";

const BASE = "/api/planillas";

/** GET /api/planillas — requiere `contenido:leer`, que tiene el rol `medico`. */
export const getPlanillas = (q?: string): Promise<Planilla[]> =>
  getJSON<Planilla[]>(`${BASE}/`, q ? { q } : undefined);

/**
 * POST /api/planillas — multipart, sólo PDF. Requiere `contenido:editar`.
 * Sin `descripcion` el backend usa el nombre del archivo. `fecha` es
 * `YYYY-MM-DD`; sin ella el backend usa la fecha de hoy.
 */
export const createPlanilla = (
  archivo: File,
  descripcion?: string,
  fecha?: string
): Promise<Planilla> => {
  const form = new FormData();
  form.append("archivo", archivo);
  if (descripcion?.trim()) form.append("descripcion", descripcion.trim());
  if (fecha) form.append("fecha", fecha);
  return postForm<Planilla>(`${BASE}/`, form);
};

/**
 * PATCH /api/planillas/{id} — edita descripción y/o fecha, y opcionalmente
 * reemplaza el PDF. Requiere `contenido:editar`.
 */
export const editPlanilla = (
  id: number,
  cambios: { descripcion?: string; fecha?: string; archivo?: File }
): Promise<Planilla> => {
  const form = new FormData();
  if (cambios.descripcion !== undefined) form.append("descripcion", cambios.descripcion.trim());
  if (cambios.fecha) form.append("fecha", cambios.fecha);
  if (cambios.archivo) form.append("archivo", cambios.archivo);
  return patchForm<Planilla>(`${BASE}/${id}`, form);
};

/** DELETE /api/planillas/{id} — baja lógica (`avisos.EXISTE='N'`). */
export const deletePlanilla = (id: number): Promise<void> =>
  delJSON<void>(`${BASE}/${id}`);
