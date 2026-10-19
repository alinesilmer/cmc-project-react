// Lo que comparten las pantallas de esta carpeta: una sola copia de cada cosa.

/** `aaaa-mm-dd` → `dd/mm/aaaa` sin pasar por Date (evita el corrimiento por UTC). */
export function fechaAR(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

/** "2026-10-03" → "03/10/2026". */
export const fechaCorta = (iso: string) => iso.split("-").reverse().join("/");

export function detalleError(e: unknown, fallback: string): string {
  const d = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof d === "string" ? d : fallback;
}

/** El motivo del servidor: texto, o `{mensaje}` en los 409 de este endpoint. */
export function motivoError(e: unknown, fallback: string): string {
  const d = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof d === "string") return d;
  if (d && typeof d === "object" && typeof (d as { mensaje?: unknown }).mensaje === "string") {
    return (d as { mensaje: string }).mensaje;
  }
  return fallback;
}
