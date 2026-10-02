import type { NavigateFunction } from "react-router-dom";
import { http } from "@/app/shared/lib/http";
import type { User } from "./api";
import { esOrganizacion, isWebEditor } from "./roles";
import { hasScope } from "./scopes";

/** A dónde va un usuario ya logueado: una ruta del panel o una página del legacy. */
export type Destino =
  | { tipo: "panel"; ruta: string }
  | { tipo: "legacy"; next: string };

/**
 * La única regla de «a dónde va cada uno». La aplicaban por separado el
 * login, el ícono de usuario del Header y el botón «Entrar a validar» de la
 * portada, y no coincidían: el Header mandaba a los médicos a
 * `principal.php` y los otros dos a `menu.php`.
 */
export function destinoDe(user: User): Destino {
  if (user.must_change_password) return { tipo: "panel", ruta: "/panel/cambiar-password" };
  if (isWebEditor(user)) return { tipo: "panel", ruta: "/panel/sitio" };

  // TEMPORAL — prueba controlada del panel nuevo con médicos seleccionados:
  // quien tenga panel:ingresar se queda acá en vez de ir al legacy. Borrar
  // junto con Scope.PANEL_INGRESAR (backend) cuando cierre la prueba.
  // Las organizaciones usan el panel nuevo, recortado por
  // ORGANIZACION_BLOCKED_PATHS, y no el menu_clinica.php del legacy.
  if (hasScope(user.scopes, "panel:ingresar") || esOrganizacion(user)) {
    return { tipo: "panel", ruta: "/panel/dashboard" };
  }

  if (user.role === "medico") {
    return {
      tipo: "legacy",
      next: `/menu.php?nro_socio1=${encodeURIComponent(Number(user.nro_socio))}`,
    };
  }
  return { tipo: "legacy", next: "/principal.php" };
}

/**
 * Lleva al usuario a su destino. Para el legacy pide el enlace SSO en el
 * momento: vence a los cinco minutos, así que pedirlo de antemano —como hacía
 * el Header al cargar cada página— dejaba un enlace muerto a quien tardaba en
 * hacer clic. Si falla, propaga el error para que cada pantalla lo muestre.
 */
export async function irADestino(destino: Destino, navigate: NavigateFunction): Promise<void> {
  if (destino.tipo === "panel") {
    navigate(destino.ruta, { replace: true });
    return;
  }
  const { data } = await http.get<{ url: string }>("/auth/legacy/sso-link", {
    params: { next: destino.next },
  });
  window.location.href = data.url;
}
