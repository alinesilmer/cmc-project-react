// src/app/lib/httpErrors.ts Mensaje uniforme para mostrarle al usuario ante un error de la API.

/** Lo que puede traer un error de axios: todo opcional, porque un `catch` no garantiza nada. */
export type ErrorApi = {
  name?: string;
  message?: string;
  code?: string;
  status?: number;
  response?: {
    status?: number;
    statusText?: string;
    data?: { detail?: unknown; message?: unknown; [clave: string]: unknown };
  };
};

/** El `detail` cuando el backend manda un objeto (un 409 con el pago o la prestación en conflicto). */
export type DetalleObjeto = {
  message?: string;
  mensaje?: string;
  reason?: string;
  pago_id?: number;
  duplicado?: number;
};

/** Un valor capturado en un `catch`, visto como error de la API (sin lanzar si no lo es). */
export function comoErrorApi(e: unknown): ErrorApi {
  return typeof e === "object" && e !== null ? (e as ErrorApi) : { message: typeof e === "string" ? e : undefined };
}

export function mensajeDeError(err: unknown, fallback = "Ocurrió un error"): string {
  const { response } = comoErrorApi(err);
  const status = response?.status;
  const detail = response?.data?.detail ?? response?.data?.message;

  if (status === 403) {
    return typeof detail === "string" && detail
      ? detail
      : "No tenés permiso para esta acción.";
  }

  if (typeof detail === "string" && detail) return detail;

  // Un 422 de pydantic trae una lista de errores.
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);

  return fallback;
}

// El `detail` del backend si es texto; si no, el mensaje del propio error (red caída, timeout); si no, `fallback`.
export function detalleDeError(err: unknown, fallback: string): string {
  const e = comoErrorApi(err);
  const detail = e.response?.data?.detail;
  if (typeof detail === "string" && detail) return detail;
  if (typeof e.message === "string" && e.message) return e.message;
  return fallback;
}

export function detalleObjeto(err: unknown): DetalleObjeto | null {
  const d = comoErrorApi(err).response?.data?.detail;
  return typeof d === "object" && d !== null && !Array.isArray(d) ? (d as DetalleObjeto) : null;
}
