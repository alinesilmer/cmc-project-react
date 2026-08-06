// src/app/lib/httpErrors.ts
// Mensaje uniforme para mostrarle al usuario ante un error de la API.
// El 403 no se trata como el 401 (§4): no dispara refresh ni reintento, sólo
// un mensaje — "Falta el permiso 'x'" si el backend lo manda en `detail`,
// o el genérico si no.
export function mensajeDeError(err: any, fallback = "Ocurrió un error"): string {
  const status = err?.response?.status;
  const detail = err?.response?.data?.detail ?? err?.response?.data?.message;

  if (status === 403) {
    return typeof detail === "string" && detail
      ? detail
      : "No tenés permiso para esta acción.";
  }

  return typeof detail === "string" && detail ? detail : fallback;
}
