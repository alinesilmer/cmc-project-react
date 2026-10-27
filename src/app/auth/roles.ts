// src/app/auth/roles.ts
import type { User } from "./api";

/** Rol RBAC del socio: es lo que decide la API, así que el front mira lo mismo. */
export const ROL_MEDICO = "medico";

export const isMedico = (user: User | null | undefined): boolean =>
  user?.role === ROL_MEDICO;

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

export const isWebEditor = (user?: User | null) => user?.role === "editor_web";
