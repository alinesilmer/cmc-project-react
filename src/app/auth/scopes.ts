// src/app/auth/scopes.ts
// Sin catálogo de códigos: los permisos se leen siempre del token del usuario
// logueado (user.scopes vía AuthProvider), nunca de una lista tipeada acá.
// Los códigos que exige cada pantalla viven donde se exigen (Topbar.tsx,
// routes.tsx), como strings sueltos que se comparan en runtime.
export function hasScope(scopes: string[] | undefined, code: string): boolean {
  return !!scopes?.includes(code);
}
