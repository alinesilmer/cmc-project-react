// src/app/auth/RequireWebEditor.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { isWebEditor } from "./roles";

type Props = {
  // otro destino cuando NO está logueado
  redirectUnauthedTo?: string;
  // mostrar 403 en vez de redirigir al panel
  forbidAs403?: boolean;
};

export default function RequireWebEditor({
  redirectUnauthedTo = "/panel/login",
  forbidAs403 = false,
}: Props) {
  const { user, ready } = useAuth();
  const loc = useLocation();

  if (!ready) return null; // spinner

  if (!user) {
    return <Navigate to={redirectUnauthedTo} replace state={{ from: loc }} />;
  }

  if (!isWebEditor(user.scopes)) {
    return forbidAs403 ? (
      <Navigate to="/403" replace />
    ) : (
      <Navigate to="/panel/dashboard" replace />
    );
  }

  return <Outlet />;
}
