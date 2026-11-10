// Deja pasar solo enlaces web, de mail o de teléfono: un `javascript:` o `data:` de la base no se abre.
const PERMITIDOS = new Set(["http:", "https:", "mailto:", "tel:"]);

/** La misma URL si es segura de abrir o enlazar, o `null`. Las rutas relativas se resuelven contra el sitio. */
export function urlSegura(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url, window.location.origin);
    return PERMITIDOS.has(u.protocol) ? url : null;
  } catch {
    return null;
  }
}
