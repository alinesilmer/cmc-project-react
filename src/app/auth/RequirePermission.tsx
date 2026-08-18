// src/auth/RequirePermission.tsx
import type { ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { hasScope } from "./scopes";

type Props = {
  scope?: string;        // compat: un único permiso
  anyOf?: string[];      // pasa si tiene AL MENOS uno
  allOf?: string[];      // pasa si tiene TODOS
  children: ReactNode;
  /** Qué renderizar si no tiene el permiso. Por defecto no renderiza nada. */
  fallback?: ReactNode;
};

export default function RequirePermission({ scope, anyOf, allOf, children, fallback = null }: Props) {
  const { user } = useAuth();
  if (!user) return <>{fallback}</>;

  const scopes = user.scopes ?? [];

  if (scope && !hasScope(scopes, scope)) return <>{fallback}</>;
  if (anyOf && anyOf.length > 0 && !anyOf.some(s => hasScope(scopes, s))) return <>{fallback}</>;
  if (allOf && allOf.length > 0 && !allOf.every(s => hasScope(scopes, s))) return <>{fallback}</>;

  return <>{children}</>;
}
