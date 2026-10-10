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
  // false = dada de baja (baja lógica).
  activo: boolean;
  cuit?: string | null;
  direccion_real?: string | null;
  condicion_iva?: CondicionIVA | null;
  plazo_vencimiento?: number | null;
  fecha_alta_convenio?: string | null;
  obra_social_principal_id?: number | null;
  // 1 = mes completo, 20 = del 20 al 20. Default 20 en el backend.
  dia_corte?: number;
  emails?: ContactoEntry[];
  telefonos?: ContactoEntry[];
  obra_social_principal?: ObraSocialRef | null;
  asociadas?: ObraSocialRef[];
  direccion?: DireccionOut[];
  documentos?: Documento[];
  created_at?: string | null;
  updated_at?: string | null;
}

// Qué se copió de la cabecera al crear una derivada (ver `replicar` en el alta).
export type PasoReplicacion = "galenos" | "codigos" | "nivelados" | "valores";

export interface ReplicacionPasoOut {
  paso: PasoReplicacion;
  estado: "ok" | "parcial" | "omitido" | "error";
  creados: number;
  ya_existian: number;
  omitidos: number;
  detalle: string[];
}

export interface ReplicacionAltaOut {
  cabecera_nro: number;
  cabecera_nombre: string;
  pasos: ReplicacionPasoOut[];
}

export interface ObraSocialCreada extends ObraSocial {
  replicacion?: ReplicacionAltaOut | null;
}

export const PASO_REPLICACION_LABELS: Record<PasoReplicacion, string> = {
  galenos: "Galenos",
  codigos: "Códigos dados de alta",
  nivelados: "Nomencladores nivelados",
  valores: "Valores",
};

export interface ObraSocialListItem {
  id: number;
  nro_obra_social: number;
  nombre: string;
  denominacion: string;
  condicion_iva?: CondicionIVA | null;
  activo: boolean;
  // Solo las derivadas la tienen: el id de su obra social cabecera.
  obra_social_principal_id?: number | null;
  cuit?: string | null;
  direccion_real?: string | null;
  plazo_vencimiento?: number | null;
  emails: ContactoEntry[];
  telefonos: ContactoEntry[];
  fecha_alta_convenio?: string | null;
  updated_at?: string | null;
}

// ─── CUIT ─────────────────────────────────────────────────────────────────────

// El CUIT viene de una columna legacy que puede traerlo con o sin guiones, y que
// usa '0' como placeholder de "sin dato". Devuelve "" cuando no hay CUIT real.
export function displayCuit(raw?: string | null): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits || Number(digits) === 0) return "";
  if (digits.length !== 11) return digits;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
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
  // Relaciones: id de la obra social cabecera (solo si la que se crea es una derivada).
  obra_social_principal_id: string;
  // Solo en el alta y con cabecera: qué copiar de ella.
  replicar_galenos: boolean;
  replicar_nomencladores: boolean;
  replicar_valores: boolean;
  // Ventana del período (ver el bloque «Facturación y Contacto»).
  dia_corte: string;
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
  replicar_galenos: false,
  replicar_nomencladores: false,
  replicar_valores: false,
  dia_corte: "20",
};

// ─── Validation errors ────────────────────────────────────────────────────────

export type FormErrors = Partial<Record<keyof ObraSocialFormData, string>>;

/**
 * Dígito verificador módulo 11. El formato `NN-NNNNNNNN-N` sólo valida que
 * tenga la forma de un CUIT; esto valida que sea uno real (ver auditoría O-12).
 */
function cuitEsValido(cuit: string): boolean {
  const digitos = cuit.replace(/\D/g, "");
  if (digitos.length !== 11) return false;
  const multiplicadores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = digitos
    .slice(0, 10)
    .split("")
    .reduce((acc, d, i) => acc + Number(d) * multiplicadores[i], 0);
  const resto = suma % 11;
  const verificador = resto === 0 ? 0 : resto === 1 ? 9 : 11 - resto;
  return verificador === Number(digitos[10]);
}

export function validateObraSocialForm(data: ObraSocialFormData): FormErrors {
  const errors: FormErrors = {};

  if (!data.nro_obra_social.trim())
    errors.nro_obra_social = "El número de obra social es obligatorio.";
  else if (!/^\d+$/.test(data.nro_obra_social.trim()))
    errors.nro_obra_social = "Debe ser un número entero positivo.";

  if (!data.nombre.trim())
    errors.nombre = "El nombre es obligatorio.";

  if (data.cuit.trim()) {
    if (!/^\d{2}-\d{8}-\d{1}$/.test(data.cuit.trim()))
      errors.cuit = "El CUIT debe tener el formato NN-NNNNNNNN-N.";
    else if (!cuitEsValido(data.cuit.trim()))
      errors.cuit = "Ese CUIT no es válido (dígito verificador incorrecto).";
  }

  if (!data.dia_corte.trim()) {
    errors.dia_corte = "Elegí el día de corte del período.";
  } else {
    const diaCorte = Number(data.dia_corte.trim());
    if (!Number.isInteger(diaCorte) || diaCorte < 1 || diaCorte > 28)
      errors.dia_corte = "Tiene que ser un día entre 1 y 28.";
  }

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
