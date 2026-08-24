// Registro de acciones del personal del Colegio (todos los que NO son médicos).
//
// ⚠ El backend todavía no existe. Este es el contrato que la API va a tener que
// cumplir; mientras tanto `actividad.api.ts` devuelve datos de ejemplo.

/** Sale del status HTTP. */
export type ResultadoAccion = "ok" | "error" | "denegado";

export interface AccionUsuario {
  id: number;
  /** ISO 8601 con zona. */
  fecha: string;

  usuario_id: number | null;
  usuario_nombre: string;
  /** Rol al momento de la acción. Nunca `medico`: la pantalla los excluye. */
  usuario_rol: string | null;

  /**
   * Qué hizo, en castellano y ya resuelto: "Cerró el pago #4821". Lo arma el
   * backend: para resolver el id hace falta el contexto del momento de la
   * acción, no el de la consulta.
   */
  descripcion: string;
  /** Agrupador para el filtro: "Pagos", "Facturación", "Nomenclador". */
  modulo: string;

  metodo: string;
  /** La plantilla de ruta, no la concreta: `/api/pagos/{pago_id}/cerrar`. */
  ruta: string;

  resultado: ResultadoAccion;
  status_code: number | null;
  ip: string | null;
}

export interface FiltrosActividad {
  /** Busca en descripción y nombre de usuario. */
  q?: string;
  usuario_id?: number;
  modulo?: string;
  resultado?: ResultadoAccion;
  /** `YYYY-MM-DD`, inclusive las dos. */
  desde?: string;
  hasta?: string;
  page?: number;
  size?: number;
}

export interface PaginaActividad {
  items: AccionUsuario[];
  total: number;
  page: number;
  size: number;
}

// ── Presentación ─────────────────────────────────────────────────────────────

export const RESULTADOS: { valor: ResultadoAccion; label: string }[] = [
  { valor: "ok", label: "Exitosa" },
  { valor: "error", label: "Con error" },
  { valor: "denegado", label: "Sin permiso" },
];

export const COLOR_RESULTADO: Record<ResultadoAccion, string> = {
  ok: "#1d9148",
  error: "#cc2a2a",
  denegado: "#f59e0b",
};

export const LABEL_RESULTADO: Record<ResultadoAccion, string> = {
  ok: "Exitosa",
  error: "Con error",
  denegado: "Sin permiso",
};

/**
 * `2026-08-21T14:32:07-03:00` → `21/08/2026 14:32`. Acá sí se usa `new Date`
 * porque el string trae hora y zona; el corrimiento afecta a las fechas sueltas.
 */
export function formatMomento(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
