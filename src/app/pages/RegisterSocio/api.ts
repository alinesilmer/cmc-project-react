// src/app/pages/RegisterSocio/api.ts
import { postJSON, postForm } from "../../../../src/lib/http";
import type { RegisterFormData } from "../../../types/register";
import { buildRegisterPayload } from "../Register/api";

export type RegisterResponse = { medico_id: number };

export async function registerMedicoAdmin(
  input: RegisterFormData | ReturnType<typeof buildRegisterPayload>
): Promise<RegisterResponse> {
  const payload: any =
    (input as any).documentNumber ? input : buildRegisterPayload(input);
  // endpoint admin protegido
  return await postJSON<RegisterResponse>("/api/medicos/admin/register", payload);
}

export async function uploadMedicoDocumentoAdmin(
  medicoId: number,
  file: File,
  label?: string
) {
  const fd = new FormData();
  fd.append("file", file, file.name);
  if (label) fd.append("label", label);
  return await postForm<{ ok: boolean; doc_id: number }>(
    `/api/medicos/admin/register/${medicoId}/document`,
    fd
  );
}
