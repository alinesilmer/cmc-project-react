// import { postJSON, postForm } from "../lib/http";
import type { ObrasSocialesFormData } from "../../types/obras-sociales";
/* ===== TIPOS ===== */
export type ObrasSocialesPayload = {
  razonSocial: string;
  nombreFantasia?: string | null;
  cuit: string;
  rne: string;
  direccionLegal: string;
  provincia: string;
  localidad: string;
  codigoPostal?: string | null;
  email: string;
  telefono: string;
  telefonoAlternativo?: string | null;
  sitioWeb?: string | null;
  representanteNombre: string;
  representanteApellido: string;
  representanteDNI: string;
  representanteCargo: string;
  representanteEmail: string;
  representanteTelefono: string;
  cantidadAfiliados?: number | null;
  observaciones?: string | null;
};

export type ObrasSocialesResponse = {
  obra_social_id: number;
  solicitud_id: number;
  ok: boolean;
};

export type ObrasSocialesDocLabel =
  | "cuit"
  | "representante_dni"
  | "poder_legal"
  | "estatuto"
  | "inscripcion_sss"
  | "constancia_afip";

/* ===== FUNCIONES (COMENTADAS PARA USO FUTURO) ===== */

/**
 * Construye el payload para el registro de obra social
 */
export function buildObrasSocialesPayload(
  form: ObrasSocialesFormData
): ObrasSocialesPayload {
  return {
    razonSocial: form.razonSocial.trim(),
    nombreFantasia: form.nombreFantasia.trim() || null,
    cuit: form.cuit.trim(),
    rne: form.rne.trim(),
    direccionLegal: form.direccionLegal.trim(),
    provincia: form.provincia,
    localidad: form.localidad,
    codigoPostal: form.codigoPostal.trim() || null,
    email: form.email.trim(),
    telefono: form.telefono.trim(),
    telefonoAlternativo: form.telefonoAlternativo.trim() || null,
    sitioWeb: form.sitioWeb.trim() || null,
    representanteNombre: form.representanteNombre.trim(),
    representanteApellido: form.representanteApellido.trim(),
    representanteDNI: form.representanteDNI.trim(),
    representanteCargo: form.representanteCargo.trim(),
    representanteEmail: form.representanteEmail.trim(),
    representanteTelefono: form.representanteTelefono.trim(),
    cantidadAfiliados: form.cantidadAfiliados ? parseInt(form.cantidadAfiliados) : null,
    observaciones: form.observaciones.trim() || null,
  };
}

/**
 * Registra una nueva obra social
 * TODO: Descomentar cuando el backend esté listo
 */
export async function registerObraSocial(
  input: ObrasSocialesFormData | ObrasSocialesPayload
): Promise<ObrasSocialesResponse> {
  // const payload: ObrasSocialesPayload = (input as any).razonSocial
  //   ? (input as ObrasSocialesPayload)
  //   : buildObrasSocialesPayload(input);

  // return await postJSON<ObrasSocialesResponse>("/api/obras-sociales/register", payload);
  
  // Mock response para desarrollo
  console.log("registerObraSocial llamado con:", input);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        obra_social_id: Math.floor(Math.random() * 1000),
        solicitud_id: Math.floor(Math.random() * 1000),
        ok: true,
      });
    }, 1000);
  });
}

/**
 * Sube un documento de la obra social
 * TODO: Descomentar cuando el backend esté listo
 */
export async function uploadObraSocialDocumento(
  obraSocialId: number,
  file: File,
  label?: string
) {
  // const fd = new FormData();
  // fd.append("file", file, file.name);
  // if (label) fd.append("label", label);
  
  // return await postForm<{ ok: boolean; doc_id: number }>(
  //   `/api/obras-sociales/register/${obraSocialId}/document`,
  //   fd
  // );
  
  // Mock response para desarrollo
  console.log("uploadObraSocialDocumento llamado:", { obraSocialId, file, label });
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        ok: true,
        doc_id: Math.floor(Math.random() * 1000),
      });
    }, 500);
  });
}

/**
 * Mapeo de archivos a labels del backend
 */
export const OBRAS_SOCIALES_DOC_LABEL_MAP: Record<string, ObrasSocialesDocLabel> = {
  cuitImg: "cuit",
  representanteDNIImg: "representante_dni",
  poderLegalImg: "poder_legal",
  estatutoImg: "estatuto",
  sssImg: "inscripcion_sss",
  afipImg: "constancia_afip",
};

/**
 * Envía el registro completo con adjuntos
 * TODO: Descomentar cuando el backend esté listo
 */
export async function sendObrasSocialesRegister(
  formData: ObrasSocialesFormData,
  files: Record<string, File | null>
) {
  // 1) Registrar obra social
  // const { obra_social_id } = await registerObraSocial(formData);

  // 2) Subir adjuntos
  // const entries = Object.entries(files || {});
  // for (const [key, file] of entries) {
  //   if (!(file instanceof File)) continue;
  //   const label = OBRAS_SOCIALES_DOC_LABEL_MAP[key];
  //   if (!label) continue;
  //   await uploadObraSocialDocumento(obra_social_id, file, label);
  // }

  // return { obra_social_id };
  
  // Mock para desarrollo
  console.log("sendObrasSocialesRegister:", { formData, files });
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ obra_social_id: Math.floor(Math.random() * 1000) });
    }, 1500);
  });
}

/**
 * Lista solicitudes de obras sociales (para panel admin)
 * TODO: Descomentar cuando el backend esté listo
 */
export async function listObrasSocialesSolicitudes(params?: {
  estado?: "pendiente" | "aprobada" | "rechazada";
  limit?: number;
  offset?: number;
}) {
  // return await getJSON("/api/obras-sociales/solicitudes", params);
  
  // Mock para desarrollo
  console.log("listObrasSocialesSolicitudes:", params);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ solicitudes: [], total: 0 });
    }, 500);
  });
}
