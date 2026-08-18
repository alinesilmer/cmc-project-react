import { Outlet } from "react-router-dom";
import { usePermisos } from "./usePermisos";
import SinPermiso from "../pages/SinPermiso/SinPermiso";

type Props = {
  scope?: string;   // pasa si tiene este permiso
  anyOf?: string[]; // pasa si tiene AL MENOS uno
};

/**
 * Guard de ruta: sin el scope requerido, renderiza <SinPermiso /> en vez del
 * contenido de la ruta. Mismo patrón que MedicoRouteGuard, pero por permiso
 * en lugar de por INGRESAR.
 */
export default function RequireScope({ scope, anyOf }: Props) {
  const { can, canAny } = usePermisos();

  const autorizado = scope ? can(scope) : anyOf ? canAny(anyOf) : true;

  if (!autorizado) return <SinPermiso />;

  return <Outlet />;
}
