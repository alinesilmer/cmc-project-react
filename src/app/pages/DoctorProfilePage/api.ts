// src/app/lib/api.ts
import {
  getJSON,
  postJSON,
  patchJSON,
  delJSON,
  putJSON,
  postForm,
} from "../../lib/http";

/* ===== Tipos mínimos (podés ampliar) ===== */
export type DoctorDocument = {
  id: number;
  label: string;
  pretty_label: string;
  file_name: string;
  url: string;
};

export type DoctorEspecialidad = {
  id: number; // id_colegio
  nombre?: string | null;
  n_resolucion?: string | null;
  fecha_resolucion?: string | null; // "YYYY-MM-DD"
  adjunto_id?: number | null;
  adjunto_url?: string | null;
};

export type DoctorProfile = {
  id: number;
  nro_socio: string;
  name: string;
  matricula_prov: string;
  matricula_nac: string;
  mail_particular?: string;
  telefono_consulta?: string;
  specialty?: string;
  domicilio_consulta?: string;
  hasDebt: boolean;
  debtDetail?: { amount: number; lastInvoice?: string; since?: string };
  documents: DoctorDocument[];

  // === NUEVOS (del MedicoDetailOut) ===
  // básicos extra
  nombre_?: string | null;
  apellido?: string | null;
  sexo?: string | null;
  tipoDoc?: string | null;
  documento?: string | null;
  cuit?: string | null;
  provincia?: string | null;
  codigo_postal?: string | null;
  categoria?: string | null;
  existe?: string | null;
  fecha_nac?: string | null;

  // personales extra
  localidad?: string | null;
  domicilio_particular?: string | null;
  tele_particular?: string | null;
  celular_particular?: string | null;

  // profesionales extra
  titulo?: string | null;
  fecha_recibido?: string | null;
  fecha_matricula?: string | null;
  nro_resolucion?: string | null;
  fecha_resolucion?: string | null;

  // impositivos
  condicion_impositiva?: string | null;
  anssal?: number | null;
  vencimiento_anssal?: string | null;
  malapraxis?: string | null;
  vencimiento_malapraxis?: string | null;
  cobertura?: number | null;
  vencimiento_cobertura?: string | null;
  cbu?: string | null;
  observacion?: string | null;
};

export type ConceptApp = {
  resumen_id: number;
  periodo: string;
  created_at?: string | null;
  monto_aplicado: number;
  porcentaje_aplicado: number;
};

export type DoctorConcept = {
  concepto_id: number; // nro_colegio
  concepto_nro_colegio?: number | null;
  concepto_nombre?: string | null;
  saldo: number;
  aplicaciones: ConceptApp[];
};

export type Especialidad = {
  id: string | number;
  id_colegio_espe: string | number;
  nombre: string;
};

export type Option = { id: string; label: string }; // id = nro_colegio (para conceptos) / ID (para especialidad)

export type AssocEspMode = "add" | "edit";

// export type DoctorProfile = {
//   id: number;
//   nro_socio?: number | null;
//   nombre?: string | null;
//   nombre_?: string | null;
//   apellido?: string | null;
//   telefono_consulta?: string | null;
//   domicilio_consulta?: string | null;
//   mail_particular?: string | null;
//   sexo?: string | null;
//   tipo_doc?: string | null;
//   documento?: string | null;
//   cuit?: string | null;
//   provincia?: string | null;
//   localidad?: string | null;
//   domicilio_particular?: string | null;
//   tele_particular?: string | null;
//   celular_particular?: string | null;
//   codigo_postal?: string | null;
//   categoria?: string | null;
//   existe?: string | null;
//   fecha_nac?: string | null;
//   titulo?: string | null;
//   fecha_recibido?: string | null;
//   fecha_matricula?: string | null;
//   matricula_prov?: string | null;
//   matricula_nac?: string | null;
//   nro_resolucion?: string | null;
//   fecha_resolucion?: string | null;
//   condicion_impositiva?: string | null;
//   anssal?: number | null;
//   vencimiento_anssal?: string | null;
//   malapraxis?: string | null;
//   vencimiento_malapraxis?: string | null;
//   cobertura?: number | null;
//   vencimiento_cobertura?: string | null;
//   cbu?: string | null;
//   observacion?: string | null;

//   // adjuntos unitarios (urls relativas)
//   attach_titulo?: string | null;
//   attach_matricula_nac?: string | null;
//   attach_matricula_prov?: string | null;
//   attach_resolucion?: string | null;
//   attach_habilitacion_municipal?: string | null;
//   attach_cuit?: string | null;
//   attach_condicion_impositiva?: string | null;
//   attach_anssal?: string | null;
//   attach_malapraxis?: string | null;
//   attach_cbu?: string | null;
//   attach_dni?: string | null;

//   // agregado en tu endpoint extendido:
//   especialidades?: Array<{
//     id_colegio?: number | null;
//     n_resolucion?: string | null;
//     fecha_resolucion?: string | null;
//     adjunto?: string | null;
//     adjunto_url?: string | null;
//     especialidad_nombre?: string | null;
//     id_colegio_label?: string | null;
//   }>;
// };

//#region ===== Rutas base =====
const ESPECIALIDADES = () => `/api/especialidades/`;

const MEDICOS = (id: number | string) => `/api/medicos/${id}`;
const MEDICOS_DOCS = (id: number | string) => `/api/medicos/${id}/documentos`;
const MEDICOS_ESPEC = (id: number | string) =>
  `/api/medicos/${id}/especialidades`;

const RBAC = `/api/admin/rbac`;
const RBAC_ROLES = () => `${RBAC}/roles`;
const RBAC_PERMS = () => `${RBAC}/permissions`;
const RBAC_USER_ROLES = (uid: number | string) => `${RBAC}/users/${uid}/roles`;
const RBAC_ADD_ROLE = (uid: number | string, role: string) =>
  `${RBAC}/users/${uid}/roles/${encodeURIComponent(role)}`;
const RBAC_DEL_ROLE = (uid: number | string, role: string) =>
  `${RBAC}/users/${uid}/roles/${encodeURIComponent(role)}`;
const RBAC_OVERRIDES = (uid: number | string) =>
  `${RBAC}/users/${uid}/permissions/overrides`;
const RBAC_SET_OVERRIDE = (
  uid: number | string,
  code: string,
  allow: boolean
) =>
  `${RBAC}/users/${uid}/permissions/${encodeURIComponent(code)}?allow=${
    allow ? "true" : "false"
  }`;
const RBAC_EFFECTIVE = (uid: number | string) =>
  `${RBAC}/users/${uid}/permissions/effective`;
// #endregion

// #region  ===== Medicos =====
export async function getMedicoDetail(id: number | string) {
  return getJSON<DoctorProfile>(MEDICOS(id));
}

export const UPDATE_WHITELIST = [
  // personales
  "name",
  "nombre_",
  "apellido",
  "sexo",
  "documento",
  "cuit",
  "fecha_nac",
  "existe",
  "provincia",
  "localidad",
  "codigo_postal",
  "domicilio_particular",
  "tele_particular",
  "celular_particular",
  "mail_particular",

  // profesionales
  "nro_socio",
  "categoria",
  "titulo",
  "matricula_prov",
  "matricula_nac",
  "fecha_recibido",
  "fecha_matricula",
  "domicilio_consulta",
  "telefono_consulta",

  // impositivos
  "condicion_impositiva",
  "anssal",
  "cobertura",
  "vencimiento_anssal",
  "malapraxis",
  "vencimiento_malapraxis",
  "vencimiento_cobertura",
  "cbu",
  "observacion",
] as const;

export const updateMedico = (
  id: string | number,
  payload: Record<string, any>
) => putJSON(`/api/medicos/${id}`, payload);

export async function getMedicoDocumentos(id: number | string) {
  return getJSON<DoctorDocument[]>(MEDICOS_DOCS(id));
}

export async function getMedicoEspecialidades(id: number | string) {
  return getJSON<DoctorEspecialidad[]>(MEDICOS_ESPEC(id));
}

export type UpsertEspecialidadBody = {
  id_colegio: number; // requerido
  n_resolucion?: string;
  fecha_resolucion?: string; // "YYYY-MM-DD"
  adjunto_id?: number; // si ya subiste un doc y querés linkearlo
};

export const addMedicoEspecialidad = (
  medicoId: string | number,
  payload: {
    id_colegio: number;
    n_resolucion?: string | null;
    fecha_resolucion?: string | null; // "YYYY-MM-DD"
    adjunto_id?: number | null;
  }
) => postJSON(`/api/medicos/${medicoId}/especialidades`, payload); // -> 204 sin body

export const editMedicoEspecialidad = (
  medicoId: string | number,
  idColegio: string | number,
  payload: {
    n_resolucion?: string | null;
    fecha_resolucion?: string | null; // "YYYY-MM-DD"
    adjunto_id?: number | null;
  }
) => patchJSON(`/api/medicos/${medicoId}/especialidades/${idColegio}`, payload); // -> 204 sin bod

export const removeMedicoEspecialidad = (
  medicoId: string | number,
  idColegio: string | number
) => delJSON(`/api/medicos/${medicoId}/especialidades/${idColegio}`); // -> 204 sin body

// #endregion

// #region ===== RBAC =====
export type Role = { name: string; description?: string };
export type Permission = { code: string; description?: string };

export const listRoles = () => getJSON<Role[]>(RBAC_ROLES());
export const listPermissions = () => getJSON<Permission[]>(RBAC_PERMS());
export const getUserRoles = (uid: number | string) =>
  getJSON<{ name: string }[]>(RBAC_USER_ROLES(uid));
export const addUserRole = (uid: number | string, role: string) =>
  postJSON(RBAC_ADD_ROLE(uid, role), {});
export const delUserRole = (uid: number | string, role: string) =>
  delJSON(RBAC_DEL_ROLE(uid, role));
export const getOverrides = (uid: number | string) =>
  getJSON<{ code: string; allow: boolean }[]>(RBAC_OVERRIDES(uid));
export const setOverride = (
  uid: number | string,
  code: string,
  allow: boolean
) => postJSON(RBAC_SET_OVERRIDE(uid, code, allow), {});
export const getEffective = (uid: number | string) =>
  getJSON<{ permissions: string[] }>(RBAC_EFFECTIVE(uid));

// #endregion

/* ===== (Opcional) subir archivo y obtener adjunto_id ===== */
// export async function uploadDocumento(
//   file: File,
//   medicoId: number | string
// ): Promise<{ id: number }> {
//   const fd = new FormData();
//   fd.set("file", file);
//   fd.set("medico_id", String(medicoId));
//   // asumimos que ya tenés un endpoint POST /api/documentos
//   const res = await fetch("/api/documentos", { method: "POST", body: fd });
//   if (!res.ok) throw new Error("No se pudo subir el archivo");
//   return res.json();
// }
// --- Subir documento (devuelve id) ---
export const uploadDocumento = async (
  medicoId: string | number,
  file: File
): Promise<number> => {
  const fd = new FormData();
  // IMPORTANTE: si tu backend espera otro nombre de campo (p.ej., "adjunto" o "archivo"),
  // cambiá "file" por el correcto.
  fd.set("file", file);

  const data = await postForm<{ id: number }>(
    `/api/medicos/${medicoId}/documentos`,
    fd
  );

  return Number(data.id);
};

// Listar especialidades
export const getListEspecialidades = () =>
  getJSON<Especialidad[]>(ESPECIALIDADES());

// PATCH /medicos/:id/existe
export const setMedicoExiste = (id: string | number, existe: "S" | "N") =>
  patchJSON(`/api/medicos/${id}/existe`, { existe });

// DELETE /medicos/:id
export const deleteMedico = (id: string | number) =>
  delJSON(`/api/medicos/${id}`);

// GET /medicos/documentos/labels  -> string[]
export const getDocumentoLabels = () =>
  getJSON<string[]>(`/api/medicos/documentos/labels`);

// === NUEVO: eliminar documento ===
export const deleteMedicoDocumento = (
  medicoId: string | number,
  docId: number | string
) => delJSON(`/api/medicos/${medicoId}/documentos/${docId}`);

// === NUEVO: mapear/limpiar campo attach_* del listado_medico ===
// PATCH /api/medicos/:id/attach  body: { field: "attach_titulo", doc_id: 123 | null }
export const setMedicoAttach = (
  medicoId: string | number,
  attachField: string, // ej "attach_titulo"
  docId: number
) =>
  patchJSON(`/api/medicos/${medicoId}/attach`, {
    field: attachField,
    doc_id: docId,
  });

export const clearMedicoAttach = (
  medicoId: string | number,
  attachField: string
) =>
  patchJSON(`/api/medicos/${medicoId}/attach`, {
    field: attachField,
    doc_id: null,
  });

// --- ajustar: devolver el documento creado ---
export async function addMedicoDocumento(
  medicoId: string | number,
  file: File,
  label: string // guardá acá "titulo", "dni", etc. (SIN attach_)
): Promise<DoctorDocument> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("label", label);

  return postForm<DoctorDocument>(`/api/medicos/${medicoId}/documentos`, fd);
}

export type ObraSocial = {
  NRO_OBRA_SOCIAL: number;
  NOMBRE: string;
  CODIGO?: string | null;
};

export type Padron = {
  ID: number;
  NRO_SOCIO: number;
  NRO_OBRASOCIAL: number;
  CATEGORIA?: string | null;
  ESPECIALIDAD?: string | null;
  TELEFONO_CONSULTA?: string | null;
  MATRICULA_PROV?: number | null;
  MATRICULA_NAC?: number | null;
  NOMBRE?: string | null;
  MARCA?: string | null;
};

export const fetchObrasSociales = (marca: string = "S") =>
  getJSON<ObraSocial[]>(
    `/api/padrones/catalogo?marca=${encodeURIComponent(marca)}`
  );

export const fetchPadrones = (nroSocio: string | number) =>
  getJSON<Padron[]>(`/api/padrones/${nroSocio}`);

export const addPadronByOS = (
  nroSocio: string | number,
  nroOS: number,
  body?: Partial<Padron>
) =>
  postJSON<Padron>(
    `/api/padrones/${nroSocio}/obras-sociales/${nroOS}`,
    body ?? {}
  );

export const removePadronByOS = (nroSocio: string | number, nroOS: number) =>
  delJSON<void>(`/api/padrones/${nroSocio}/obras-sociales/${nroOS}`);
