// types for FilterModal 


export type MissingFieldKey =
  | "telefono_consulta"
  | "domicilio_consulta"
  | "mail_particular"
  | "tele_particular"
  | "celular_particular"
  | "matricula_prov"
  | "matricula_nac"
  | "provincia"
  // ❌ localidad removida
  | "categoria"
  | "especialidad"
  | "condicion_impositiva"
  | "malapraxis"; // ✅ empresa malapraxis

export type FaltantesFilter = {
  enabled: boolean;
  field: MissingFieldKey;
  mode: "missing" | "present";
};

export type VencimientosFilter = {
  malapraxisVencida: boolean;
  malapraxisPorVencer: boolean;
  anssalVencido: boolean;
  anssalPorVencer: boolean;
  coberturaVencida: boolean;
  coberturaPorVencer: boolean;

  // ventana
  fechaDesde: string;
  fechaHasta: string;
  dias: number; // 0 = sin rango
};

export type OtrosFilter = {
  cuit: string;
  sexo: string;
  estado: "" | "activo" | "inactivo";
  adherente: "" | "si" | "no";
  provincia: string;
  especialidad: string;
  categoria: string;
  condicionImpositiva: string;
  fechaIngresoDesde: string;
  fechaIngresoHasta: string;
  tieneMalapraxis: "" | "true" | "false";
};

export type FilterSelection = {
  columns: string[];
  vencimientos: VencimientosFilter;
  otros: OtrosFilter;
  faltantes: FaltantesFilter;
};

/** Human-readable labels for each MissingFieldKey — shared across filter UI and summary. */
export const MISSING_FIELD_LABELS: Record<MissingFieldKey, string> = {
  telefono_consulta: "Teléfono consultorio",
  domicilio_consulta: "Domicilio consultorio",
  mail_particular: "Mail",
  tele_particular: "Teléfono particular",
  celular_particular: "Celular",
  matricula_prov: "Matrícula provincial",
  matricula_nac: "Matrícula nacional",
  provincia: "Provincia",
  categoria: "Categoría",
  especialidad: "Especialidad",
  condicion_impositiva: "Condición impositiva",
  malapraxis: "Mala praxis",
};

export const initialFilters: FilterSelection = {
  columns: ["nombre", "documento", "mail_particular", "matricula_prov", "especialidad", "malapraxis"],
  vencimientos: {
    malapraxisVencida: false,
    malapraxisPorVencer: false,
    anssalVencido: false,
    anssalPorVencer: false,
    coberturaVencida: false,
    coberturaPorVencer: false,
    fechaDesde: "",
    fechaHasta: "",
    dias: 0,
  },
  otros: {
    cuit:"",
    sexo: "",
    estado: "",
    adherente: "",
    provincia: "",
    especialidad: "",
    categoria: "",
    condicionImpositiva: "",
    fechaIngresoDesde: "",
    fechaIngresoHasta: "",
    tieneMalapraxis: "",
  },
  faltantes: {
    enabled: false,
    field: "mail_particular",
    mode: "missing",
  },
};
