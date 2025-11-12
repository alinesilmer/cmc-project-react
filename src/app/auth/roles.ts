// src/app/auth/roles.ts
/**
 * Scopes candidatos para el rol/grupo de edición de la web.
 * Ajustá los códigos a los que uses en tu RBAC. Ejemplos comunes:
 *  - 'website:editor', 'web:editor', 'cms:editor', 'website:editar'
 */
const WEB_EDITOR_SCOPES = [
  "website:editor",
  "web:editor",
  "cms:editor",
  "website:editar",
];

export const isWebEditor = (scopes?: string[]) =>
  !!scopes?.some((s) => WEB_EDITOR_SCOPES.includes(s));
