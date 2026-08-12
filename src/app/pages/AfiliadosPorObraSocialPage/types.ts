export type ObraSocial = {
  NRO_OBRA_SOCIAL: number;
  NOMBRE: string;
  CODIGO?: string | null;
  ACTIVA?: "S" | "N" | string;
};

export type Prestador = {
  id?: number | string | null;
  nro_socio?: string | number | null;
  socio?: string | number | null;
  nombre?: string | null;
  apellido_nombre?: string | null;
  ape_nom?: string | null;
  matricula_prov?: string | number | null;
  /** Ya venía en la respuesta del padrón; antes se descartaba al mapear. */
  matricula_nac?: string | number | null;
  categoria?: string | null;
  /** MARCA del padrón: "S" alta, "N" baja. */
  marca?: string | null;
  estado?: string | null;
  /** tel_consultorio — always use this, never tel_particular */
  telefono_consulta?: string | null;
  especialidades?: string[] | null;
  especialidad?: string | null;
  domicilio_consulta?: string | null;
  mail_particular?: string | null;
  cuit?: string | null;
  codigo_postal?: string | null;
};

/** Campos de `GET /api/medicos/all` que el catálogo sabe leer. */
export type MedicoExtra = Record<string, unknown>;

/** Un prestador con su ficha completa adosada, si hizo falta traerla. */
export type ExportRow = Prestador & { extra?: MedicoExtra | null };

export type ExportingPdfMode = null | "pdf" | "pdf_by_especialidad";


export type FieldGroup =
  | "identificacion"
  | "profesional"
  | "consultorio"
  | "fiscal"
  | "personal";

/** De dónde sale el dato — define si la columna cuesta un pedido extra. */
export type FieldSource = "padron" | "medico";

export type ExportField = {
  key: string;
  /** Encabezado en Excel y etiqueta en el selector. */
  label: string;
  /** Encabezado en el PDF, donde el ancho es escaso. */
  short: string;
  group: FieldGroup;
  source: FieldSource;
  /** Ancho relativo; el PDF lo reparte proporcionalmente sobre el ancho útil. */
  weight: number;
  align: "left" | "center";
  /** Dato personal del profesional, no de su ejercicio. */
  sensible?: boolean;
  get: (row: ExportRow) => string;
};
