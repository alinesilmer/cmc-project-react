import type { NavigateFunction } from "react-router-dom";
import { http } from "@/app/shared/lib/http";
import type { User } from "./api";
import { esOrganizacion, isWebEditor } from "./roles";
import { hasScope } from "./scopes";

/** A dónde va un usuario ya logueado: una ruta del panel o una página del legacy. */
export type Destino =
  | { tipo: "panel"; ruta: string }
  | { tipo: "legacy"; next: string };

/** La única regla de «a dónde va cada uno». */
export function destinoDe(user: User): Destino {
  if (user.must_change_password) return { tipo: "panel", ruta: "/panel/cambiar-password" };
  if (isWebEditor(user)) return { tipo: "panel", ruta: "/panel/sitio" };

  // Los médicos entran siempre al panel nuevo: ya no pasan por el menu.php del legacy.
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
const RUTA_SISTEMA_ANTERIOR = "/panel/sistema-anterior";

// Marca que ya se intentó saltar solo al legacy en esta pestaña.
const CLAVE_SALTO = "legacy:salto";

export const yaSeIntentoElSalto = () => sessionStorage.getItem(CLAVE_SALTO) === "1";
export const marcarSalto = () => sessionStorage.setItem(CLAVE_SALTO, "1");

/** Lleva al usuario a su destino. */
export function irADestino(destino: Destino, navigate: NavigateFunction): void {
  if (destino.tipo === "panel") {
    navigate(destino.ruta, { replace: true });
    return;
  }
  // Cada ingreso es un intento nuevo: vuelve a saltar solo.
  sessionStorage.removeItem(CLAVE_SALTO);
  navigate(RUTA_SISTEMA_ANTERIOR, { replace: true });
}

/** Enlace SSO al legacy. */
export async function pedirEnlaceLegacy(next: string, signal?: AbortSignal): Promise<string> {
  const { data } = await http.get<{ url: string }>("/auth/legacy/sso-link", {
    params: { next },
    signal,
  });
  return data.url;
}
