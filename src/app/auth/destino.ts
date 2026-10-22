import type { NavigateFunction } from "react-router-dom";
import type { User } from "./api";
import { isWebEditor } from "./roles";

/** A dónde va un usuario ya logueado: siempre una ruta del panel. */
export type Destino = { tipo: "panel"; ruta: string };

/** La única regla de «a dónde va cada uno». */
export function destinoDe(user: User): Destino {
  if (user.must_change_password) return { tipo: "panel", ruta: "/panel/cambiar-password" };
  if (isWebEditor(user)) return { tipo: "panel", ruta: "/panel/sitio" };
  return { tipo: "panel", ruta: "/panel/dashboard" };
}

/** Lleva al usuario a su destino. */
export function irADestino(destino: Destino, navigate: NavigateFunction): void {
  navigate(destino.ruta, { replace: true });
}
