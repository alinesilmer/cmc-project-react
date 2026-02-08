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
  sexo: string;
  estado: "" | "activo" | "inactivo";
  adherente: "" | "si" | "no";
  provincia: string;
  // ❌ localidad removida
  especialidad: string;
  categoria: string;
  condicionImpositiva: string;
  fechaIngresoDesde: string;
  fechaIngresoHasta: string;

  // ✅ check "Con mala praxis" (empresa asociada)
  conMalapraxis: boolean;
};

export type FilterSelection = {
  columns: string[];
  vencimientos: VencimientosFilter;
  otros: OtrosFilter;
  faltantes: FaltantesFilter;
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
    sexo: "",
    estado: "",
    adherente: "",
    provincia: "",
    especialidad: "",
    categoria: "",
    condicionImpositiva: "",
    fechaIngresoDesde: "",
    fechaIngresoHasta: "",
    conMalapraxis: false,
  },
  faltantes: {
    enabled: false,
    field: "mail_particular",
    mode: "missing",
  },
};
