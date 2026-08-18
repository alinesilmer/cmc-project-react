// src/app/auth/usePermisos.ts
import { useAuth } from "./AuthProvider";
import { hasScope } from "./scopes";

export function usePermisos() {
  const { user } = useAuth();
  const scopes = user?.scopes ?? [];

  const can = (code: string) => hasScope(scopes, code);
  const canAny = (codes: string[]) => codes.some((c) => hasScope(scopes, c));
  const canAll = (codes: string[]) => codes.every((c) => hasScope(scopes, c));

  return { can, canAny, canAll, scopes, role: user?.role ?? null };
}
