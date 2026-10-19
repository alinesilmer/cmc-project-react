// Lo que comparten las pantallas de esta carpeta: una sola copia de cada cosa.

export function extractDetail(e: unknown): string {
  const err = e as { response?: { data?: { detail?: string } } };
  return err?.response?.data?.detail ?? "Ocurrió un error inesperado.";
}
