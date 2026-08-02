// Avisos que el Colegio publica para los socios de la app móvil (cmc-app).
// Backend: app/modules/avisos en cmc_api, tabla `avisos_push` (el nombre `avisos`
// ya lo ocupa una tabla legacy del PHP viejo).
//
// El aviso queda visible en el app en cuanto se publica (el app consulta
// GET /api/mobile/avisos). El despacho de la notificación push que despierta el
// teléfono todavía NO está implementado en el backend: hace falta registro de
// tokens de dispositivo + credenciales de FCM/Expo. Hasta entonces todos los
// avisos vuelven con push_estado="pendiente".

// ─── Entity ───────────────────────────────────────────────────────────────────

/** Estado del despacho de la push, no del aviso en sí. */
export type PushEstado = "pendiente" | "enviado" | "error";

export interface Aviso {
  id: number;
  titulo: string;
  mensaje: string;
  tipo: string;
  /** ISO datetime — desde cuándo lo ve el app. Ordena el historial. */
  publicado_at: string;
  /** false = bajado del app, pero sigue en el historial. */
  activo: boolean;
  push_estado: PushEstado;
  push_error: string | null;
  /** Dispositivos alcanzados. null mientras no haya despacho real de push. */
  destinatarios: number | null;
  enviado_por: number | null;
  enviado_por_nombre: string | null;
  created_at: string;
  updated_at: string;
}

// ─── API payloads ─────────────────────────────────────────────────────────────

export interface AvisoCreatePayload {
  titulo: string;
  mensaje: string;
  tipo: string;
}

export type AvisoUpdatePayload = Partial<AvisoCreatePayload & { activo: boolean }>;

/** Espejo de TIPOS_AVISO en app/db/models/avisos_push.py. El backend valida
 *  contra esa lista: si se agrega uno, hay que agregarlo acá (o leerlo de
 *  GET /api/avisos/tipos, que devuelve exactamente esto). El tipo define el
 *  ícono y el color con el que la app muestra el aviso. */
export const TIPOS_AVISO = [
  "General",
  "Institucional",
  "Novedades",
  "Beneficios",
  "Urgente",
] as const;

export type TipoAviso = (typeof TIPOS_AVISO)[number];

// Límites pensados para notificaciones push: Android corta el título alrededor
// de los 65 caracteres y el cuerpo cerca de los 240. Mismos valores que
// TITULO_MAX / MENSAJE_MAX en app/modules/avisos/schemas.py — la columna es más
// ancha (120/500), el tope es de UX.
export const TITULO_MAX = 80;
export const MENSAJE_MAX = 240;

// ─── Form ─────────────────────────────────────────────────────────────────────

export interface AvisoFormData {
  titulo: string;
  mensaje: string;
  tipo: string;
}

export const EMPTY_AVISO_FORM: AvisoFormData = {
  titulo: "",
  mensaje: "",
  tipo: "General",
};

// ─── Validation ───────────────────────────────────────────────────────────────

export type AvisoFormErrors = Partial<Record<keyof AvisoFormData, string>>;

export function validateAvisoForm(data: AvisoFormData): AvisoFormErrors {
  const errors: AvisoFormErrors = {};

  const titulo = data.titulo.trim();
  if (!titulo) errors.titulo = "El título es obligatorio.";
  else if (titulo.length > TITULO_MAX)
    errors.titulo = `Máximo ${TITULO_MAX} caracteres.`;

  const mensaje = data.mensaje.trim();
  if (!mensaje) errors.mensaje = "El mensaje es obligatorio.";
  else if (mensaje.length > MENSAJE_MAX)
    errors.mensaje = `Máximo ${MENSAJE_MAX} caracteres.`;

  if (!data.tipo) errors.tipo = "Elegí un tipo.";
  else if (!TIPOS_AVISO.includes(data.tipo as never))
    errors.tipo = "Tipo inválido.";

  return errors;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** DD/MM/AAAA HH:MM en horario local. */
export function formatFechaHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}
