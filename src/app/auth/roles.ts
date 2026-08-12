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
  // "Mis números": el socio ve SÓLO lo suyo. La pantalla del Colegio
  // (/panel/reportes) queda afuera a propósito — cruza la facturación de todos
  // y además el backend la gatea con el scope `facturas:ver`.
  "/panel/mis-numeros",
  "/panel/help",
];

export const medicoCanAccess = (pathname: string): boolean =>
  MEDICO_ALLOWED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

/**
 * Scopes candidatos para el rol/grupo de edición de la web.
 * Ajustá los códigos a los que uses en tu RBAC. Ejemplos comunes:
 *  - 'website:editor', 'web:editor', 'cms:editor', 'website:editar'
 */
const WEB_EDITOR_SCOPES = [
  "website:editor",
  "web:editor",
  "cms:editor",
  "website:editar",
];

export const isWebEditor = (scopes?: string[]) =>
  !!scopes?.some((s) => WEB_EDITOR_SCOPES.includes(s));
