// src/auth/RequirePermission.tsx
import type { ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { hasScope } from "./scopes";

type Props = {
  scope?: string;        // compat: un único permiso
  anyOf?: string[];      // pasa si tiene AL MENOS uno
  allOf?: string[];      // pasa si tiene TODOS
  children: ReactNode;
};

export default function RequirePermission({ scope, anyOf, allOf, children }: Props) {
  const { user } = useAuth();
  if (!user) return null;

  const scopes = user.scopes ?? [];

  if (scope && !hasScope(scopes, scope)) return null;
  if (anyOf && anyOf.length > 0 && !anyOf.some(s => hasScope(scopes, s))) return null;
  if (allOf && allOf.length > 0 && !allOf.every(s => hasScope(scopes, s))) return null;

  return <>{children}</>;
}
