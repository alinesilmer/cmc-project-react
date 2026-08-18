import { delJSON, getJSON, postForm } from "../../lib/http";
import type { Planilla } from "./planillas.types";

const BASE = "/api/planillas";

/** GET /api/planillas — requiere `contenido:leer`, que tiene el rol `medico`. */
export const getPlanillas = (q?: string): Promise<Planilla[]> =>
  getJSON<Planilla[]>(`${BASE}/`, q ? { q } : undefined);

/**
 * POST /api/planillas — multipart, sólo PDF. Requiere `contenido:editar`.
 * Sin `descripcion` el backend usa el nombre del archivo.
 */
export const createPlanilla = (
  archivo: File,
  descripcion?: string
): Promise<Planilla> => {
  const form = new FormData();
  form.append("archivo", archivo);
  if (descripcion?.trim()) form.append("descripcion", descripcion.trim());
  return postForm<Planilla>(`${BASE}/`, form);
};

/** DELETE /api/planillas/{id} — baja lógica (`avisos.EXISTE='N'`). */
export const deletePlanilla = (id: number): Promise<void> =>
  delJSON<void>(`${BASE}/${id}`);
