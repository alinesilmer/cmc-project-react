/** Base del sistema viejo: en local sale de `VITE_URL_BASE_LEGACY` (el legacy de desarrollo); sin variable, o vacía, apunta a producción. */
export const URL_BASE_LEGACY = (
  (import.meta.env.VITE_URL_BASE_LEGACY as string | undefined) ||
  "https://legacy.colegiomedicocorrientes.com"
).replace(/\/+$/, "");
