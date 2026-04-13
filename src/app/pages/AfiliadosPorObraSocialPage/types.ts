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

export type ExportingPdfMode = null | "pdf" | "pdf_by_especialidad";

export type ContactoPayload = Pick<
  Prestador,
  "domicilio_consulta" | "mail_particular" | "cuit" | "codigo_postal"
>;

/** Which optional columns the user has chosen to include in exports. */
export type ExportOptions = {
  includeEmail: boolean;
  includeCuit: boolean;
  includeCP: boolean;
};
