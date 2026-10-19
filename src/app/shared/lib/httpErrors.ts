// src/app/lib/httpErrors.ts Mensaje uniforme para mostrarle al usuario ante un error de la API.
export function mensajeDeError(err: any, fallback = "Ocurrió un error"): string {
  const status = err?.response?.status;
  const detail = err?.response?.data?.detail ?? err?.response?.data?.message;

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
  const e = err as { response?: { data?: { detail?: unknown } }; message?: unknown } | null;
  const detail = e?.response?.data?.detail;
  if (typeof detail === "string" && detail) return detail;
  if (typeof e?.message === "string" && e.message) return e.message;
  return fallback;
}
