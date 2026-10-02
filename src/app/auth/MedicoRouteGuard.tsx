import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "./AuthProvider";
import {
  esOrganizacion,
  isMedico,
  medicoCanAccess,
  organizacionCanAccess,
} from "./roles";

/**
 * Recorta el panel para los usuarios médicos (INGRESAR = 'D'): si piden una ruta
 * fuera de `MEDICO_ALLOWED_PATHS` los devuelve al inicio. A las organizaciones
 * les saca además `ORGANIZACION_BLOCKED_PATHS`. Para el resto del personal es
 * transparente.
 */
export default function MedicoRouteGuard() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  if (
    (isMedico(user) && !medicoCanAccess(pathname)) ||
    (esOrganizacion(user) && !organizacionCanAccess(pathname))
  ) {
    return <Navigate to="/panel/dashboard" replace />;
  }

  return <Outlet />;
}
