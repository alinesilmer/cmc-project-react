import { getJSON, postJSON } from "@/app/shared/lib/http";

export type Especialidad = { id: number; id_colegio_espe: number; nombre: string };

export const listarEspecialidades = () => getJSON<Especialidad[]>("/api/especialidades/");

/* ===== endpoints ===== */

export async function saveContinueAdmin(
  body: unknown
): Promise<{ medico_id: number; ok: boolean }> {
  return postJSON("/api/medicos/admin/save-continue", body);
}
