// Datos del Colegio: CUIT, CBU, domicilio, teléfonos y casillas de correo.
//
// Ningún tipo de lectura tiene campo de contraseña: `EmailInstitucion` expone
// `tiene_password` y el texto sólo llega por `revelarPassword()`. Es la misma
// separación que hace el backend, para que una pantalla nueva no pueda mostrar
// una clave sin pedirla a propósito.

export interface TelefonoInstitucion {
  id: number;
  /** "Conmutador", "Guardia". Es lo que hace útil al número. */
  etiqueta?: string | null;
  numero: string;
  notas?: string | null;
}

export interface EmailInstitucion {
  id: number;
  etiqueta?: string | null;
  direccion: string;
  /** IMAP/POP. */
  servidor_entrante?: string | null;
  /** SMTP. */
  servidor_saliente?: string | null;
  notas?: string | null;
  /** Si hay una contraseña guardada. Nunca el valor. */
  tiene_password: boolean;
  password_actualizada_en?: string | null;
}

export interface Institucion {
  id: number;

  razon_social?: string | null;
  /** 11 dígitos, sin guiones: el formato es cosa de la pantalla. */
  cuit?: string | null;
  condicion_iva?: string | null;
  ingresos_brutos?: string | null;

  /** 22 dígitos, sin espacios. */
  cbu?: string | null;
  alias_cbu?: string | null;
  banco?: string | null;
  titular_cuenta?: string | null;

  domicilio?: string | null;
  localidad?: string | null;
  provincia?: string | null;
  codigo_postal?: string | null;

  sitio_web?: string | null;
  horario_atencion?: string | null;
  notas?: string | null;

  actualizado_en?: string | null;
  actualizado_por?: number | null;

  telefonos: TelefonoInstitucion[];
  emails: EmailInstitucion[];

  /** Si el servidor tiene `SECRETOS_KEY` y puede guardar contraseñas. */
  secretos_disponibles: boolean;
  /**
   * Si este usuario puede ver y cambiar las contraseñas. Es una lista nominal
   * en el backend, no un permiso del catálogo: ser admin no alcanza.
   */
  puede_ver_claves: boolean;
}

export type InstitucionInput = Omit<
  Institucion,
  | "id"
  | "telefonos"
  | "emails"
  | "actualizado_en"
  | "actualizado_por"
  | "secretos_disponibles"
  | "puede_ver_claves"
>;

export type TelefonoInput = Omit<TelefonoInstitucion, "id">;

/** Sin contraseña a propósito: se carga por su endpoint, no con la edición. */
export type EmailInput = Omit<
  EmailInstitucion,
  "id" | "tiene_password" | "password_actualizada_en"
>;

// ── Formato ──────────────────────────────────────────────────────────────────
// Se guarda en crudo y se muestra formateado: guardarlo con separadores haría
// que dos CUIT iguales escritos distinto no coincidan nunca.

/** `30123456789` → `30-12345678-9`. */
export function formatCuit(cuit?: string | null): string {
  if (!cuit) return "—";
  const d = cuit.replace(/\D/g, "");
  if (d.length !== 11) return cuit;
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`;
}

/** `0110599520000012345678` → `0110 5995 2000 0012 3456 78`, para transcribirlo. */
export function formatCbu(cbu?: string | null): string {
  if (!cbu) return "—";
  const d = cbu.replace(/\D/g, "");
  if (d.length !== 22) return cbu;
  return d.replace(/(.{4})/g, "$1 ").trim();
}
