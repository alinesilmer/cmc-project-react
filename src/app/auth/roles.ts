// src/app/auth/roles.ts
import type { User } from "./api";

/**
 * `listado_medico.INGRESAR` — D = médico, E = empleado del Colegio, A = administrador.
 * Es el único discriminador de rol disponible hasta que el RBAC cubra al socio: los
 * médicos no tienen scopes propios, así que el panel se recorta por este flag.
 */
export const INGRESAR_MEDICO = "D";

export const isMedico = (user: User | null | undefined): boolean =>
  user?.ingresar === INGRESAR_MEDICO;

/**
 * Prefijos de ruta del panel habilitados para un médico. Todo lo demás lo devuelve
 * `MedicoRouteGuard` a /panel/dashboard.
 *
 * Es un cerco de UI, no una autorización: evita que el socio caiga en pantallas
 * administrativas que igual le fallarían por permisos. La autorización real la
 * sigue haciendo la API.
 */
export const MEDICO_ALLOWED_PATHS = [
  "/panel/dashboard",
  "/panel/mi-perfil",
  "/panel/nomenclador/consulta-precios",
  "/panel/validaciones",
  "/panel/help",
];

export const medicoCanAccess = (pathname: string): boolean =>
  MEDICO_ALLOWED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

/**
 * Scopes viejos que identificaban al editor web antes de RBAC (§2 del doc de
 * backend): `web:editor` pasó a ser el rol `editor_web`. Se mantienen como
 * alias porque los scopes viejos siguen llegando en el token durante la
 * transición, hasta la Etapa 3.
 */
const WEB_EDITOR_SCOPES_LEGACY = [
  "website:editor",
  "web:editor",
  "cms:editor",
  "website:editar",
];

export const isWebEditor = (user?: User | null) =>
  user?.role === "editor_web" ||
  !!user?.scopes?.some((s) => WEB_EDITOR_SCOPES_LEGACY.includes(s));
