// src/app/auth/roles.ts
import type { User } from "./api";

/** `listado_medico.INGRESAR` — D = médico, E = empleado del Colegio, A = administrador. */
export const INGRESAR_MEDICO = "D";

export const isMedico = (user: User | null | undefined): boolean =>
  user?.ingresar === INGRESAR_MEDICO;

/** Prefijos de ruta del panel habilitados para un médico. */
const MEDICO_ALLOWED_PATHS = [
  "/panel/dashboard",
  "/panel/mi-perfil",
  "/panel/nomenclador/consulta-precios",
  "/panel/boletin-valores",
  "/panel/planillas",
  "/panel/validaciones",
  "/panel/facturacion/mi-recepcion",
  "/panel/help",
];

/** Excepciones dentro de un prefijo permitido. */
const MEDICO_BLOCKED_PATHS = [
  "/panel/validaciones/prevencion-salud",
  "/panel/validaciones/swiss-medical",
];

export const medicoCanAccess = (pathname: string): boolean =>
  MEDICO_ALLOWED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  ) &&
  !MEDICO_BLOCKED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

/** `listado_medico.es_organizacion` — la cuenta es de una clínica, no de un médico. */
export const esOrganizacion = (user: User | null | undefined): boolean =>
  Boolean(user?.es_organizacion);

/** Rutas que una organización no usa: las validaciones se hacen por el médico que atiende al afiliado, no por la clínica. */
const ORGANIZACION_BLOCKED_PATHS = ["/panel/validaciones"];

export const organizacionCanAccess = (pathname: string): boolean =>
  !ORGANIZACION_BLOCKED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

/** Scopes viejos que identificaban al editor web antes de RBAC (§2 del doc de backend): `web:editor` pasó a ser el rol `editor_web`. */
const WEB_EDITOR_SCOPES_LEGACY = [
  "website:editor",
  "web:editor",
  "cms:editor",
  "website:editar",
];

export const isWebEditor = (user?: User | null) =>
  user?.role === "editor_web" ||
  !!user?.scopes?.some((s) => WEB_EDITOR_SCOPES_LEGACY.includes(s));
