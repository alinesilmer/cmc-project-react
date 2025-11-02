import type { ReactNode } from "react";
import { useAuth } from "./AuthProvider";

export default function RequirePermission({ scope, children }: { scope: string; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return null;
  if (!user.scopes?.includes(scope)) return null;
  return <>{children}</>;
}
