import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

const CAMBIAR_PASSWORD_PATH = "/panel/cambiar-password";

export default function RequireAuth() {
  const { user, ready } = useAuth();
  const loc = useLocation();

  if (!ready) return null; // spinner opcional
  if (!user)
    return <Navigate to="/panel/login" replace state={{ from: loc }} />;

  // Cubre la sesión restaurada por cookie, donde el usuario nunca pasa por
  // Login.tsx (que ya tiene su propio gate en el submit).
  if (user.must_change_password && loc.pathname !== CAMBIAR_PASSWORD_PATH) {
    return <Navigate to={CAMBIAR_PASSWORD_PATH} replace />;
  }

  return <Outlet />;
}
