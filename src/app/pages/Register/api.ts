import { postJSON, postForm } from "@/app/shared/lib/http";
import type { RegisterFormData } from "../../types/register";
/* ===== tipos ===== */
export type RegisterPayload = {
  documentType: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  gender?: string | null;
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

  provincialLicense?: string | null;
  nationalLicense?: string | null;
  graduationDate?: string | null;
  specialty?: string | null;
  resolutionNumber?: string | null;
  provincialLicenseDate?: string | null;
  nationalLicenseDate?: string | null;
  resolutionDate?: string | null;
  birthDate?: string | null;
  anssal?: string | null;
  anssalExpiry?: string | null;
  malpracticeCompany?: string | null;
  malpracticeExpiry?: string | null;
  malpracticeCoverage?: string | null;
  coverageExpiry?: string | null;
  taxCondition?: string | null;

  specialties?: {
    id_colegio_espe: number;
    n_resolucion?: string | null;
    fecha_resolucion?: string | null;
    adjunto?: string | null;
  }[];
};

function buildRegisterPayload(form: any): RegisterPayload {
  return {
    documentType: "DNI",
    documentNumber: String(form.documentNumber || "").trim(),
    firstName: String(form.firstName || "").trim(),
    lastName: String(form.lastName || "").trim(),
    gender: form.gender || null,

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

    provincialLicense: form.provincialLicense || null,
    nationalLicense: form.nationalLicense || null,
    graduationDate: form.graduationDate || null,

    // id_colegio_espe elegido en el select; el backend también acepta specialties[].
    specialty: form.specialty || null,

    resolutionNumber: form.resolutionNumber || null,
    provincialLicenseDate: form.provincialLicenseDate || null,
    nationalLicenseDate: form.nationalLicenseDate || null,
    resolutionDate: form.resolutionDate || null,
    birthDate: form.birthDate || null,
    anssal: form.anssal || null,
    anssalExpiry: form.anssalExpiry || null,
    malpracticeCompany: form.malpracticeCompany || null,
    malpracticeExpiry: form.malpracticeExpiry || null,
    malpracticeCoverage: form.malpracticeCoverage || null,
    coverageExpiry: form.coverageExpiry || null,
    taxCondition: form.taxCondition || null,
  };
}

export type RegisterResponse = {
  medico_id: number;
  solicitud_id: number;
  ok: boolean;
};
/* ===== endpoints ===== */

export async function registerMedico(
  input: RegisterFormData | RegisterPayload,
  specialtiesPayload?: RegisterPayload["specialties"]
): Promise<RegisterResponse> {
  const payload: RegisterPayload = (input as any).documentType
    ? (input as RegisterPayload)
    : buildRegisterPayload(input);

  if (specialtiesPayload && specialtiesPayload.length) {
    payload.specialties = specialtiesPayload.map((it) => ({
      id_colegio_espe: Number(it.id_colegio_espe),
      n_resolucion: it.n_resolucion ?? null,
      fecha_resolucion: it.fecha_resolucion ?? null,
      adjunto: it.adjunto ?? null,
    }));
  }

  return await postJSON<RegisterResponse>("/api/medicos/register", payload);
}

export async function uploadMedicoDocumento(
  medicoId: number,
  file: File,
  label?: string
) {
  const fd = new FormData();
  fd.append("file", file, file.name);
  if (label) fd.append("label", label);
  return await postForm<{ ok: boolean; doc_id: number }>(
    `/api/medicos/register/${medicoId}/document`,
    fd
  );
}

// Keys de archivos de Steps.tsx → labels del backend.
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
};
