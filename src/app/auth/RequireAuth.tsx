import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export default function RequireAuth() {
  const { user, ready } = useAuth();
  const loc = useLocation();

  if (!ready) return null; // spinner opcional
  if (!user)
    return <Navigate to="/panel/login" replace state={{ from: loc }} />;
  return <Outlet />;
}
