// exportPresets.ts
export type ExportPresetId =
  | "malapraxis_vencida"
  | "malapraxis_por_vencer"
  | "anssal_vencida"
  | "anssal_por_vencer"
  | "cobertura_vencida"
  | "cobertura_por_vencer"
  | "contactables"
  | "datos_criticos_incompletos"
  | "sin_cuit_cbu"
  | "altas_recientes"
  | "por_zona";

export type ExportPreset = {
  id: ExportPresetId;
  title: string;
  description: string;

  columns: string[];

  orderBy?: { key: string; dir: "asc" | "desc" };

  base: Record<string, any>;

  fields: Array<
    | "q"
    | "provincia"
    | "localidad"
    | "desde"
    | "hasta"
    | "dias"
    | "soloActivos"
    | "categoria"
  >;
};

export type ExportGroup = {
  groupTitle: string;
  presets: ExportPreset[];
};

export const EXPORT_GROUPS: ExportGroup[] = [
  {
    groupTitle: "A) Vencimientos / cumplimiento",
    presets: [
      {
        id: "malapraxis_vencida",
        title: "Malapraxis vencida",
        description: "Malapraxis activa con vencimiento anterior a hoy.",
        base: { malapraxis: true, vencimiento_malapraxis_mode: "lt_today" },
        columns: [
          "apellido",
          "nombre_",
          "documento",
          "matricula_prov",
          "mail_particular",
          "celular_particular",
          "vencimiento_malapraxis",
        ],
        orderBy: { key: "vencimiento_malapraxis", dir: "asc" },
        fields: ["q", "provincia", "localidad", "soloActivos", "categoria"],
      },
      {
        id: "malapraxis_por_vencer",
        title: "Malapraxis por vencer (N días)",
        description: "Vencimiento entre hoy y hoy + N días.",
        base: { malapraxis: true, vencimiento_malapraxis_mode: "between_today_plus_n" },
        columns: [
          "apellido",
          "nombre_",
          "documento",
          "matricula_prov",
          "mail_particular",
          "celular_particular",
          "vencimiento_malapraxis",
        ],
        orderBy: { key: "vencimiento_malapraxis", dir: "asc" },
        fields: ["dias", "q", "provincia", "localidad", "soloActivos", "categoria"],
      },
      {
        id: "anssal_vencida",
        title: "ANSSAL vencido",
        description: "ANSSAL vencido (análogo a malapraxis).",
        base: { anssal_mode: "lt_today" },
        columns: [
          "apellido",
          "nombre_",
          "documento",
          "matricula_prov",
          "anssal",
          "vencimiento_anssal",
          "mail_particular",
          "celular_particular",
        ],
        orderBy: { key: "vencimiento_anssal", dir: "asc" },
        fields: ["q", "provincia", "localidad", "soloActivos", "categoria"],
      },
      {
        id: "anssal_por_vencer",
        title: "ANSSAL por vencer (N días)",
        description: "Vencimiento ANSSAL entre hoy y hoy + N días.",
        base: { anssal_mode: "between_today_plus_n" },
        columns: [
          "apellido",
          "nombre_",
          "documento",
          "matricula_prov",
          "anssal",
          "vencimiento_anssal",
          "mail_particular",
          "celular_particular",
        ],
        orderBy: { key: "vencimiento_anssal", dir: "asc" },
        fields: ["dias", "q", "provincia", "localidad", "soloActivos", "categoria"],
      },
      {
        id: "cobertura_vencida",
        title: "Cobertura vencida",
        description: "Cobertura vencida (análogo).",
        base: { cobertura_mode: "lt_today" },
        columns: [
          "apellido",
          "nombre_",
          "documento",
          "matricula_prov",
          "cobertura",
          "vencimiento_cobertura",
          "mail_particular",
          "celular_particular",
        ],
        orderBy: { key: "vencimiento_cobertura", dir: "asc" },
        fields: ["q", "provincia", "localidad", "soloActivos", "categoria"],
      },
      {
        id: "cobertura_por_vencer",
        title: "Cobertura por vencer (N días)",
        description: "Vencimiento cobertura entre hoy y hoy + N días.",
        base: { cobertura_mode: "between_today_plus_n" },
        columns: [
          "apellido",
          "nombre_",
          "documento",
          "matricula_prov",
          "cobertura",
          "vencimiento_cobertura",
          "mail_particular",
          "celular_particular",
        ],
        orderBy: { key: "vencimiento_cobertura", dir: "asc" },
        fields: ["dias", "q", "provincia", "localidad", "soloActivos", "categoria"],
      },
    ],
  },
  {
    groupTitle: "B) Contactabilidad (para campañas)",
    presets: [
      {
        id: "contactables",
        title: "Contactables (mail o celular)",
        description: "Tiene mail o tiene celular.",
        base: { contactables: true },
        columns: ["apellido", "nombre_", "nro_socio", "mail_particular", "celular_particular", "provincia", "localidad"],
        orderBy: { key: "apellido", dir: "asc" },
        fields: ["q", "provincia", "localidad", "soloActivos", "categoria"],
      },
    ],
  },
  {
    groupTitle: "C) Calidad de padrón / datos incompletos",
    presets: [
      {
        id: "datos_criticos_incompletos",
        title: "Datos críticos incompletos",
        description: "Falta documento / apellido / nombre / provincia / localidad.",
        base: { datos_criticos_incompletos: true },
        columns: ["apellido", "nombre_", "documento", "provincia", "localidad", "observacion"],
        orderBy: { key: "apellido", dir: "asc" },
        fields: ["q", "provincia", "localidad", "soloActivos", "categoria"],
      },
      {
        id: "sin_cuit_cbu",
        title: "Sin CUIT / sin CBU",
        description: "CUIT vacío o CBU vacío (pagos).",
        base: { sin_cuit_o_cbu: true },
        columns: ["apellido", "nombre_", "documento", "cuit", "cbu", "condicion_impositiva"],
        orderBy: { key: "apellido", dir: "asc" },
        fields: ["q", "provincia", "localidad", "soloActivos", "categoria"],
      },
    ],
  },
  {
    groupTitle: "D) Administrativos / matrícula / altas",
    presets: [
      {
        id: "altas_recientes",
        title: "Altas recientes (por fecha_matricula)",
        description: "Fecha de matrícula entre X e Y.",
        base: { altas_recientes: true },
        columns: ["apellido", "nombre_", "documento", "matricula_prov", "fecha_matricula", "categoria", "provincia", "localidad"],
        orderBy: { key: "fecha_matricula", dir: "desc" },
        fields: ["desde", "hasta", "q", "provincia", "localidad", "soloActivos", "categoria"],
      },
      {
        id: "por_zona",
        title: "Por zona (Provincia / Localidad)",
        description: "Filtra por provincia y/o localidad.",
        base: { por_zona: true },
        columns: [
          "apellido",
          "nombre_",
          "documento",
          "matricula_prov",
          "mail_particular",
          "celular_particular",
          "provincia",
          "localidad",
          "domicilio_particular",
        ],
        orderBy: { key: "apellido", dir: "asc" },
        fields: ["provincia", "localidad", "q", "soloActivos", "categoria"],
      },
    ],
  },
];
