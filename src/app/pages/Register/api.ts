// src/app/auth/api.ts
import { postJSON, getJSON, postForm } from "../../lib/http";
import type { RegisterFormData } from "../../types/register";
/* ===== tipos ===== */
export type RegisterPayload = {
  documentType: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  address?: string | null;
  province?: string | null;
  locality?: string | null;
  postalCode?: string | null;
  officeAddress?: string | null;
  officePhone?: string | null;
  cuit?: string | null;
  cbu?: string | null;
  condicionImpositiva?: string | null;
  observations?: string | null;
};

export function buildRegisterPayload(form: any): RegisterPayload {
  return {
    documentType: "DNI",
    documentNumber: String(form.documentNumber || "").trim(),
    firstName: String(form.firstName || "").trim(),
    lastName: String(form.lastName || "").trim(),
    email: form.email || null,
    phone: form.phone || null,
    mobile: form.mobile || null,
    address: form.address || null,
    province: form.province || null,
    locality: form.locality || null,
    postalCode: form.postalCode || null,
    officeAddress: form.officeAddress || null,
    officePhone: form.officePhone || null,
    cuit: form.cuit || null,
    cbu: form.cbu || null,
    condicionImpositiva: form.taxCondition || null,
    observations: form.observations || null,
  };
}

export type RegisterResponse = {
  medico_id: number;
  solicitud_id: number;
  ok: boolean;
};

export type DocLabel =
  | "documento"
  | "titulo"
  | "matricula_nac"
  | "matricula_nacional"
  | "matricula_prov"
  | "resolucion"
  | "habilitacion_municipal"
  | "cuit"
  | "condicion_impositiva"
  | "anssal"
  | "malapraxis"
  | "cbu";

/* ===== endpoints ===== */

export async function registerMedico(
  input: RegisterFormData | RegisterPayload
): Promise<RegisterResponse> {
  const payload: RegisterPayload =
    (input as any).documentType ? (input as RegisterPayload) : buildRegisterPayload(input);
  return await postJSON<RegisterResponse>("/api/medicos/register", payload);
}

// ⬇ queda igual, pero asegúrate de NO setear Content-Type a mano
export async function uploadMedicoDocumento(medicoId: number, file: File, label?: string) {
  const fd = new FormData();
  fd.append("file", file, file.name);
  if (label) fd.append("label", label);
  return await postForm<{ ok: boolean; doc_id: number }>(
    `/api/medicos/register/${medicoId}/document`,
    fd
  );
}

// 🔎 mapeo de keys de tu Steps.tsx → labels del backend
export const DOC_LABEL_MAP: Record<string, string> = {
  docNumberImg: "documento",
  tituloImg: "titulo",
  matNacImg: "matricula_nac",
  matProvImg: "matricula_prov",
  resolucionImg: "resolucion",
  habMunicipal: "habilitacion_municipal",
  cuitImg: "cuit",
  condImpImg: "condicion_impositiva",
  anssalImg: "anssal",
  polizaImg: "malapraxis",
  cbuImg: "cbu",
}


// opcional: listar solicitudes si armás panel admin
export async function listSolicitudes(params?: {
  estado?: "pendiente" | "aprobada" | "rechazada";
  limit?: number;
  offset?: number;
}) {
  return await getJSON("/auth/solicitudes", params);
}

//==========================================================================================

// 1) armar payload para /auth/register desde tu RegisterFormData
// export function buildRegisterPayload(form: any): RegisterPayload {
//   return {
//     // en tu UI no pedís tipo de doc: usamos DNI por defecto
//     documentType: "DNI",
//     documentNumber: String(form.documentNumber || "").trim(),

//     firstName: String(form.firstName || "").trim(),
//     lastName: String(form.lastName || "").trim(),

//     email: form.email || null,
//     phone: form.phone || null,
//     mobile: form.mobile || null,

//     address: form.address || null,
//     province: form.province || null,
//     locality: form.locality || null,
//     postalCode: form.postalCode || null,

//     officeAddress: form.officeAddress || null,
//     officePhone: form.officePhone || null,

//     cuit: form.cuit || null,
//     cbu: form.cbu || null,
//     condicionImpositiva: form.taxCondition || null,

//     observations: form.observations || null,
//   };
// }

// 2) mapear claves de tus inputs file → labels que entiende el backend
//    soporta varios nombres posibles por si en Steps usás otras keys
function inferLabelFromKey(k: string): DocLabel | null {
  const s = k.toLowerCase();

  // DNI / Documento (solo a tabla documentos, no hay attach_documento en el modelo)
  if (/(dni|documento)/.test(s)) return "documento";

  if (/titulo/.test(s)) return "titulo";
  if (/mat(ric|r[ií])cula.*(nac|nacional)/.test(s)) return "matricula_nac";
  if (/mat(ric|r[ií])cula.*(prov|provinc)/.test(s)) return "matricula_prov";
  if (/resol/.test(s)) return "resolucion";
  if (/habil.*muni/.test(s)) return "habilitacion_municipal";
  if (/cuit/.test(s)) return "cuit";
  if (/cond.*impo/.test(s)) return "condicion_impositiva";
  if (/anssal/.test(s)) return "anssal";
  if (/malapra/.test(s)) return "malapraxis";
  if (/cbu/.test(s)) return "cbu";

  return null;
}

/**
 * Envía el registro y sube adjuntos.
 * NO maneja toasts ni loaders: lo hacés en tu Register.tsx como ya tenés.
 */
export async function sendRegister(formData: any, files: Record<string, File | null>) {
  // 1) registrar
  const payload = buildRegisterPayload(formData);
  const { medico_id } = await registerMedico(payload);

  // 2) adjuntos (si hay)
  const entries = Object.entries(files || {});
  for (const [key, file] of entries) {
    if (!(file instanceof File)) continue;
    const label = inferLabelFromKey(key);
    if (!label) continue;
    await uploadMedicoDocumento(medico_id, file, label);
  }

  return { medico_id };
}
