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

  // Los médicos entran siempre al panel nuevo: ya no pasan por el menu.php
  // del legacy. Las organizaciones también, recortadas por
  // ORGANIZACION_BLOCKED_PATHS, en vez del menu_clinica.php del legacy.
  //
  // system_new:access es el permiso con el que el legacy muestra el link
  // «INGRESAR NUEVO SISTEMA» (lo tiene el rol admin): quien ya puede entrar
  // al panel no tiene por qué pasar antes por el legacy.
  //
  // TEMPORAL — panel:ingresar deja en el panel al resto de los usuarios
  // elegidos para la prueba controlada. Borrar junto con
  // Scope.PANEL_INGRESAR (backend) cuando cierre la prueba.
  if (
    user.role === "medico" ||
    esOrganizacion(user) ||
    hasScope(user.scopes, "system_new:access") ||
    hasScope(user.scopes, "panel:ingresar")
  ) {
    return { tipo: "panel", ruta: "/panel/dashboard" };
  }

  return { tipo: "legacy", next: "/principal.php" };
}

/** Pantalla intermedia desde la que se sale hacia el legacy. */
export const RUTA_SISTEMA_ANTERIOR = "/panel/sistema-anterior";

// Marca que ya se intentó saltar solo al legacy en esta pestaña. Si el usuario
// vuelve atrás porque el legacy no cargó, la pantalla intermedia no lo manda
// de nuevo: le muestra qué puede hacer.
const CLAVE_SALTO = "legacy:salto";

export const yaSeIntentoElSalto = () => sessionStorage.getItem(CLAVE_SALTO) === "1";
export const marcarSalto = () => sessionStorage.setItem(CLAVE_SALTO, "1");

/**
 * Lleva al usuario a su destino. Al legacy no se salta directo: se pasa por
 * la pantalla intermedia, que queda en el historial y le da una salida a
 * quien se encuentre con el legacy caído.
 */
export function irADestino(destino: Destino, navigate: NavigateFunction): void {
  if (destino.tipo === "panel") {
    navigate(destino.ruta, { replace: true });
    return;
  }
  // Cada ingreso es un intento nuevo: vuelve a saltar solo.
  sessionStorage.removeItem(CLAVE_SALTO);
  navigate(RUTA_SISTEMA_ANTERIOR, { replace: true });
}

/**
 * Enlace SSO al legacy. Vence a los cinco minutos, así que se pide en el
 * momento de usarlo y no de antemano.
 */
export async function pedirEnlaceLegacy(next: string, signal?: AbortSignal): Promise<string> {
  const { data } = await http.get<{ url: string }>("/auth/legacy/sso-link", {
    params: { next },
    signal,
  });
  return data.url;
}
