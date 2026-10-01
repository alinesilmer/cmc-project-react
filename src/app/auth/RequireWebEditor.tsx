// src/app/auth/RequireWebEditor.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { usePermisos } from "./usePermisos";
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
  const { can } = usePermisos();
  const loc = useLocation();

  // Todo lo que hace esta pantalla —noticias, cursos, avisos de médicos—
  // está gobernado por `contenido:editar` en el backend (authz.py). Quien lo
  // tiene ya puede crear y borrar por API, así que dejarlo entrar a la UI no
  // habilita nada nuevo: sólo deja de ser exclusivo del rol `editor_web`,
  // que hoy tiene una sola cuenta. Se reusa el permiso que ya existe en vez
  // de agregar un scope.
  const puedeAdministrarContenido = isWebEditor(user) || can("contenido:editar");

  if (!ready) return null; // spinner

  if (!user) {
    return <Navigate to={redirectUnauthedTo} replace state={{ from: loc }} />;
  }

  if (!puedeAdministrarContenido) {
    return forbidAs403 ? (
      <Navigate to="/403" replace />
    ) : (
      <Navigate to="/panel/dashboard" replace />
    );
  }

  return <Outlet />;
}
