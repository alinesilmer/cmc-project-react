// src/app/pages/UsersList/medicosExport.ts
// Helpers + mapping for Medicos export (/api/medicos/all)

export type ExportColumnKey =
  | "id"
  | "nro_socio"
  | "nombre"
  | "matricula_prov"
  | "matricula_nac"
  | "documento"
  | "mail_particular"
  | "tele_particular"
  | "celular_particular"
  | "telefono_consulta"
  | "domicilio_consulta"
  | "activo"
  | "sexo"
  | "provincia"
  | "categoria"
  | "adherente"
  | "condicion_impositiva"
  | "fecha_ingreso"
  | "especialidad"
  | "anssal"
  | "malapraxis"
  | "cobertura"
  | "vencimiento_malapraxis"
  | "vencimiento_anssal"
  | "vencimiento_cobertura";

export type FilterSelection = {
  columns: string[];
  otros: {
    sexo?: string | null;
    estado?: string | null;
    adherente?: string | null;
    provincia?: string | null;
    categoria?: string | null;
    especialidad?: string | null; // "id:123" or text
    condicionImpositiva?: string | null;

    fechaIngresoDesde?: string | null; // YYYY-MM-DD
    fechaIngresoHasta?: string | null; // YYYY-MM-DD

    conMalapraxis?: boolean;
  };
  vencimientos: {
    dias: number; // 0..N
    fechaDesde?: string | null; // YYYY-MM-DD
    fechaHasta?: string | null; // YYYY-MM-DD

    malapraxisVencida?: boolean;
    malapraxisPorVencer?: boolean;

    anssalVencido?: boolean;
    anssalPorVencer?: boolean;

    coberturaVencida?: boolean;
    coberturaPorVencer?: boolean;
  };
  faltantes: {
    enabled: boolean;
    field: any;
    mode: "missing" | "present";
  };
};

export type MedicoRow = Record<string, unknown>;

/**
 * ✅ KEYMAP: tries multiple possible keys for each "canonical" export key
 * so export doesn't break if backend/transform changes casing or naming.
 */
export const KEYMAP: Record<ExportColumnKey, string[]> = {
  id: ["id", "ID", "Id"],
  nro_socio: ["nro_socio", "NRO_SOCIO", "socio", "SOCIO"],

  nombre: ["nombre", "NOMBRE", "ape_nom", "apellido_nombre", "APELLIDO_NOMBRE", "APE_NOM"],
  matricula_prov: ["matricula_prov", "MATRICULA_PROV", "matricula", "MATRICULA"],
  matricula_nac: ["matricula_nac", "MATRICULA_NAC"],

  documento: ["documento", "DOCUMENTO", "dni", "DNI"],
  mail_particular: ["mail_particular", "MAIL_PARTICULAR", "email", "EMAIL", "mail", "MAIL"],

  tele_particular: ["tele_particular", "TELE_PARTICULAR", "telefono_particular", "TELEFONO_PARTICULAR"],
  celular_particular: ["celular_particular", "CELULAR_PARTICULAR", "celular", "CELULAR"],

  telefono_consulta: [
    "telefono_consulta",
    "TELEFONO_CONSULTA",
    "tel_consulta",
    "TEL_CONSULTA",
    "telefonoConsulta",
    "TELEFONOCONSULTA",
  ],
  domicilio_consulta: ["domicilio_consulta", "DOMICILIO_CONSULTA"],

  activo: ["activo", "ACTIVO", "estado", "ESTADO", "EXISTE", "existe"],

  sexo: ["sexo", "SEXO"],
  provincia: ["provincia", "PROVINCIA"],
  categoria: ["categoria", "CATEGORIA"],
  adherente: ["adherente", "ADHERENTE", "ES_ADHERENTE", "es_adherente"],
  condicion_impositiva: ["condicion_impositiva", "CONDICION_IMPOSITIVA", "condicionImpositiva"],

  fecha_ingreso: ["fecha_ingreso", "FECHA_INGRESO", "fechaIngreso", "FECHAINGRESO"],

  especialidad: [
    "especialidad",
    "ESPECIALIDAD",
    "especialidades",
    "ESPECIALIDADES",
    "especialidad1",
    "especialidad2",
    "especialidad3",
    "ESPECIALIDAD1",
    "ESPECIALIDAD2",
    "ESPECIALIDAD3",
  ],

  anssal: ["anssal", "ANSSAL", "anssal_vto", "ANSSAL_VTO", "anssalVto", "vencimiento_anssal", "VENCIMIENTO_ANSSAL"],
  malapraxis: [
    "malapraxis",
    "MALAPRAXIS",
    "malapraxis_empresa",
    "MALAPRAXIS_EMPRESA",
    "malapraxisEmpresa",
    "MALAPRAXIS_EMPRESA_NOMBRE",
  ],
  cobertura: [
    "cobertura",
    "COBERTURA",
    "cobertura_vto",
    "COBERTURA_VTO",
    "coberturaVto",
    "vencimiento_cobertura",
    "VENCIMIENTO_COBERTURA",
  ],

  vencimiento_malapraxis: [
    "vencimiento_malapraxis",
    "VENCIMIENTO_MALAPRAXIS",
    "malapraxis_vencimiento",
    "MALAPRAXIS_VENCIMIENTO",
    "malapraxis_vto",
    "MALAPRAXIS_VTO",
    "vto_malapraxis",
    "VTO_MALAPRAXIS",
  ],
  vencimiento_anssal: [
    "vencimiento_anssal",
    "VENCIMIENTO_ANSSAL",
    "anssal_vencimiento",
    "ANSSAL_VENCIMIENTO",
    "anssal_vto",
    "ANSSAL_VTO",
    "vto_anssal",
    "VTO_ANSSAL",
  ],
  vencimiento_cobertura: [
    "vencimiento_cobertura",
    "VENCIMIENTO_COBERTURA",
    "cobertura_vencimiento",
    "COBERTURA_VENCIMIENTO",
    "cobertura_vto",
    "COBERTURA_VTO",
    "vto_cobertura",
    "VTO_COBERTURA",
  ],
};

export const DEFAULT_HEADERS: Record<ExportColumnKey, string> = {
  id: "ID",
  nro_socio: "N° Socio",
  nombre: "Nombre",
  matricula_prov: "Matrícula Prov.",
  matricula_nac: "Matrícula Nac.",
  documento: "Documento",
  mail_particular: "Email",
  tele_particular: "Teléfono",
  celular_particular: "Celular",
  telefono_consulta: "Teléfono Consultorio",
  domicilio_consulta: "Domicilio Consultorio",
  activo: "Activo",
  sexo: "Sexo",
  provincia: "Provincia",
  categoria: "Categoría",
  adherente: "Adherente",
  condicion_impositiva: "Condición Impositiva",
  fecha_ingreso: "Fecha Ingreso",
  especialidad: "Especialidades",
  anssal: "ANSSAL",
  malapraxis: "Mala Praxis",
  cobertura: "Cobertura",
  vencimiento_malapraxis: "Venc. Mala Praxis",
  vencimiento_anssal: "Venc. ANSSAL",
  vencimiento_cobertura: "Venc. Cobertura",
};

function isNil(v: unknown) {
  return v === null || v === undefined || v === "";
}

function toCleanString(v: unknown): string {
  if (isNil(v)) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/**
 * Return best value for a canonical export key, checking multiple key variants.
 */
export function pickValue(row: MedicoRow, canonicalKey: ExportColumnKey): string {
  const candidates = KEYMAP[canonicalKey] ?? [canonicalKey];
  for (const k of candidates) {
    const v = (row as any)?.[k];
    if (!isNil(v)) return toCleanString(v);
  }
  return "";
}

/**
 * ✅ Map UI filters -> backend query params for GET /api/medicos/all
 */
export function mapUIToQuery(filters: FilterSelection) {
  const otros = filters?.otros ?? ({} as FilterSelection["otros"]);
  const v = filters?.vencimientos ?? ({} as FilterSelection["vencimientos"]);

  return {
    sexo: otros.sexo || undefined,
    estado: otros.estado || undefined,
    adherente: otros.adherente || undefined,
    provincia: otros.provincia || undefined,
    categoria: otros.categoria || undefined,
    condicion_impositiva: otros.condicionImpositiva || undefined,

    // especialidad: si viene "id:123" mandamos solo "123" (o mandá el string completo si tu backend espera otro formato)
    especialidad: otros.especialidad?.startsWith("id:") ? otros.especialidad.slice(3) : otros.especialidad || undefined,

    fecha_ingreso_desde: otros.fechaIngresoDesde || undefined,
    fecha_ingreso_hasta: otros.fechaIngresoHasta || undefined,

    con_malapraxis: otros.conMalapraxis ? "1" : undefined,

    malapraxis_vencida: v.malapraxisVencida ? "1" : undefined,
    malapraxis_por_vencer: v.malapraxisPorVencer ? "1" : undefined,

    anssal_vencido: v.anssalVencido ? "1" : undefined,
    anssal_por_vencer: v.anssalPorVencer ? "1" : undefined,

    cobertura_vencida: v.coberturaVencida ? "1" : undefined,
    cobertura_por_vencer: v.coberturaPorVencer ? "1" : undefined,

    por_vencer_dias: v.dias && v.dias > 0 ? String(v.dias) : undefined,
    vencimientos_desde: v.fechaDesde || undefined,
    vencimientos_hasta: v.fechaHasta || undefined,
  };
}

/**
 * Build URLSearchParams skipping undefined / null / empty.
 */
export function buildQS(params: Record<string, unknown>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  return sp.toString();
}
