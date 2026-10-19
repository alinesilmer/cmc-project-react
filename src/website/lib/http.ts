// Re-export the shared HTTP client from the app layer.
import { httpBare } from "@/app/shared/lib/http";

export { http, getJSON } from "@/app/shared/lib/http";

/** GET a una ruta pública del sitio, sin token ni refresh. */
export async function getPublico<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const { data } = await httpBare.get<T>(url, { params });
  return data;
}
