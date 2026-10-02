// Re-export the shared HTTP client from the app layer.
// This keeps src/website imports self-contained while still sharing the
// singleton axios instance and auth interceptors defined in src/app.
import { httpBare } from "@/app/shared/lib/http";

export { http, getJSON } from "@/app/shared/lib/http";

/**
 * GET a una ruta pública del sitio, sin token ni refresh. Con `getJSON` un
 * visitante con una sesión vieja (token y cookie vencidos) recibía un 401, el
 * interceptor intentaba refrescar, fallaba y lo mandaba al login del panel en
 * medio de /noticias. Las rutas públicas están en `app/auth/public.py`.
 */
export async function getPublico<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const { data } = await httpBare.get<T>(url, { params });
  return data;
}
