import { postJSON } from "@/app/shared/lib/http";

/* ===== endpoints ===== */

export async function saveContinueAdmin(
  body: any
): Promise<{ medico_id: number; ok: boolean }> {
  return postJSON("/api/medicos/admin/save-continue", body);
}
