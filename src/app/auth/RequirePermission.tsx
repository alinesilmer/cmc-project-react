// src/auth/RequirePermission.tsx
import type { ReactNode } from "react";
import { useAuth } from "./AuthProvider";

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

  if (scope && !scopes.includes(scope)) return null;
  if (anyOf && anyOf.length > 0 && !anyOf.some(s => scopes.includes(s))) return null;
  if (allOf && allOf.length > 0 && !allOf.every(s => scopes.includes(s))) return null;

  return <>{children}</>;
}
