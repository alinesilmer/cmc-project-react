// ─── Enums / union types ──────────────────────────────────────────────────────

export type CondicionIVA = "responsable_inscripto" | "exento";
export type TipoDocumento =
  | "convenio"
  | "normas"
  | "valores_convenidos"
  | "otros";

// Used only as a form UI helper — not sent to the API
export type TipoEnvioUI = "corrientes_capital" | "viaja";

// ─── Labels (for display) ─────────────────────────────────────────────────────

export const CONDICION_IVA_LABELS: Record<CondicionIVA, string> = {
  responsable_inscripto: "Responsable Inscripto (Factura A)",
  exento: "Exento (Factura B)",
};

export const TIPO_DOCUMENTO_LABELS: Record<TipoDocumento, string> = {
  convenio: "PDF Convenio",
  normas: "Normas",
  valores_convenidos: "Valores Convenidos",
  otros: "Otros",
};

export const PLAZO_OPTIONS = [
  { value: "30", label: "30 días" },
  { value: "45", label: "45 días" },
  { value: "60", label: "60 días" },
  { value: "otro", label: "Otro plazo" },
] as const;

// ─── Entity types (API responses) ─────────────────────────────────────────────

export interface DireccionOut {
  id?: number;
  provincia?: string | null;
  localidad?: string | null;
  direccion?: string | null;
  codigo_postal?: string | null;
  horario?: string | null;
}

export interface Documento {
  id: number;
  tipo: TipoDocumento;
  nombre_custom?: string | null;
  url: string;
  created_at: string;
}

export interface ObraSocialRef {
  id: number;
  nro_obra_social: number;
  nombre: string;
  denominacion: string;
}

export interface ObraSocial {
  id: number;
  nro_obra_social: number;
  nombre: string;
  denominacion: string;
  marca?: string | null;
  ver_valor?: string | null;
  cuit?: string | null;
  direccion_real?: string | null;
  condicion_iva?: CondicionIVA | null;
  plazo_vencimiento?: number | null;
  fecha_alta_convenio?: string | null;
  obra_social_principal_id?: number | null;
  emails?: ContactoEntry[];
  telefonos?: ContactoEntry[];
  obra_social_principal?: ObraSocialRef | null;
  asociadas?: ObraSocialRef[];
  direccion?: DireccionOut[];
  documentos?: Documento[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ObraSocialListItem {
  id: number;
  nro_obra_social: number;
  nombre: string;
  denominacion: string;
  condicion_iva?: CondicionIVA | null;
  emails: ContactoEntry[];
  telefonos: ContactoEntry[];
  fecha_alta_convenio?: string | null;
  updated_at?: string | null;
}

// ─── Contact entries ──────────────────────────────────────────────────────────

export interface ContactoEntry {
  valor: string;
  etiqueta: string;
}

export const EMPTY_CONTACTO: ContactoEntry = { valor: "", etiqueta: "" };

// ─── Form data (controlled inputs) ────────────────────────────────────────────

export interface ObraSocialFormData {
  nro_obra_social: string;
  nombre: string;
  cuit: string;
  direccion_real: string;
  condicion_iva: CondicionIVA | "";
  // Dirección UI helper (maps to direcciones[0] in the API payload)
  df_tipo: TipoEnvioUI | "";
  df_provincia: string;
  df_localidad: string;
  df_direccion: string;
  df_codigo_postal: string;
  df_horario: string;
  // Vencimiento
  plazo_vencimiento: "30" | "45" | "60" | "otro" | "";
  plazo_custom: string;
  // Contacto
  fecha_alta_convenio: string;
  emails: ContactoEntry[];
  telefonos: ContactoEntry[];
  // Relaciones
  obra_social_principal_id: string;
  asociadas_ids: number[];
}

export const EMPTY_FORM: ObraSocialFormData = {
  nro_obra_social: "",
  nombre: "",
  cuit: "",
  direccion_real: "",
  condicion_iva: "",
  df_tipo: "",
  df_provincia: "",
  df_localidad: "",
  df_direccion: "",
  df_codigo_postal: "",
  df_horario: "",
  plazo_vencimiento: "",
  plazo_custom: "",
  fecha_alta_convenio: "",
  emails: [{ valor: "", etiqueta: "" }],
  telefonos: [{ valor: "", etiqueta: "" }],
  obra_social_principal_id: "",
  asociadas_ids: [],
};

// ─── Validation errors ────────────────────────────────────────────────────────

export type FormErrors = Partial<Record<keyof ObraSocialFormData, string>>;

export function validateObraSocialForm(data: ObraSocialFormData): FormErrors {
  const errors: FormErrors = {};

  if (!data.nro_obra_social.trim())
    errors.nro_obra_social = "El número de obra social es obligatorio.";
  else if (!/^\d+$/.test(data.nro_obra_social.trim()))
    errors.nro_obra_social = "Debe ser un número entero positivo.";

  if (!data.nombre.trim())
    errors.nombre = "El nombre es obligatorio.";

  if (data.cuit.trim() && !/^\d{2}-\d{8}-\d{1}$/.test(data.cuit.trim()))
    errors.cuit = "El formato debe ser XX-XXXXXXXX-X (ej: 30-12345678-9).";

  if (data.plazo_vencimiento === "otro" && !data.plazo_custom.trim())
    errors.plazo_custom = "Ingresá el plazo personalizado.";

  if (data.plazo_vencimiento === "otro" && data.plazo_custom.trim()) {
    const n = Number(data.plazo_custom.trim());
    if (!Number.isInteger(n) || n <= 0)
      errors.plazo_custom = "El plazo debe ser un número entero positivo.";
  }

  const emailInvalido = data.emails.find(
    (e) => e.valor.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.valor.trim())
  );
  if (emailInvalido)
    errors.emails = "Uno o más emails no tienen un formato válido.";

  return errors;
}
