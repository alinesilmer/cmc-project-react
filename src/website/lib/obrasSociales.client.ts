import { httpBare } from "@/app/shared/lib/http";

export type ObraSocialPublica = {
  nro: number;
  nombre: string;
};

type ApiObraSocial = {
  nro_obra_social: number | null;
  nombre: string | null;
};

/**
 * GET /api/obras_social/ — ruta pública (app/auth/public.py), que ya recorta
 * CUIT, contactos y condiciones.
 *
 * Va por `httpBare` porque la consumen páginas públicas: un visitante anónimo
 * no tiene token y un 401 no debe disparar el refresh ni mandarlo al login.
 *
 * La leían Convenios, el chatbot y el selector del editor, cada uno con su
 * propio parser que probaba seis nombres de campo; el backend manda siempre
 * `nro_obra_social` y `nombre`.
 */
export async function listObrasSocialesPublicas(
  signal?: AbortSignal
): Promise<ObraSocialPublica[]> {
  const { data } = await httpBare.get<ApiObraSocial[]>("/api/obras_social/", {
    signal,
    timeout: 10_000,
  });
  return (Array.isArray(data) ? data : [])
    .filter((r) => r.nro_obra_social != null && r.nombre?.trim())
    .map((r) => ({ nro: r.nro_obra_social as number, nombre: (r.nombre as string).trim() }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

/** Clave de React Query, compartida para que las pantallas reusen la caché. */
export const OBRAS_SOCIALES_KEY = ["web", "obras-sociales"] as const;
