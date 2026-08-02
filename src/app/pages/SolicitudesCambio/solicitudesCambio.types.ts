// ─── Entity ───────────────────────────────────────────────────────────────────

export type EstadoSolicitudCambio = "pendiente" | "aprobada" | "rechazada";

export interface SolicitudCambio {
  id: number;
  nro_socio: number;
  medico_id: number | null;
  medico_nombre: string | null;
  campo: string;
  valor_actual: string | null;
  valor_propuesto: string | null;
  mensaje: string;
  estado: EstadoSolicitudCambio;
  revisado_por: number | null;
  revisado_por_nombre: string | null;
  revisado_at: string | null;
  respuesta_admin: string | null;
  created_at: string;
  updated_at: string;
}

export interface SolicitudCambioCounts {
  total: number;
  pendiente: number;
  aprobada: number;
  rechazada: number;
}

export interface SolicitudCambioList {
  items: SolicitudCambio[];
  total: number;
  counts: SolicitudCambioCounts;
}

// ─── Etiquetas ────────────────────────────────────────────────────────────────

/** Espejo de CAMPOS_CONOCIDOS en app/db/models/solicitud_cambio.py. La columna
 *  acepta otros valores, por eso el fallback muestra el crudo. */
const CAMPO_LABELS: Record<string, string> = {
  telefono: "Teléfono",
  email: "Email",
  domicilio: "Domicilio",
  padron: "Padrón",
  especialidad: "Especialidad",
  general: "General",
};

export const campoLabel = (campo: string): string =>
  CAMPO_LABELS[campo] ?? campo;

export const ESTADO_LABELS: Record<EstadoSolicitudCambio, string> = {
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
};

/** Fecha + hora local a partir del timestamp naive que devuelve la API. */
export function formatFechaHora(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
