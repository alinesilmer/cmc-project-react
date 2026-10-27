import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "./useAuth";
import {
  esOrganizacion,
  isMedico,
  medicoCanAccess,
  organizacionCanAccess,
} from "./roles";

/** Recorta el panel para los usuarios médicos (rol `medico`): si piden una ruta fuera de `MEDICO_ALLOWED_PATHS` los devuelve al inicio. */
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
