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
  "/panel/boletin-valores",
  "/panel/planillas",
  "/panel/validaciones",
  "/panel/facturacion/mi-recepcion",
  "/panel/help",
];

/**
 * Excepciones dentro de un prefijo permitido. `/panel/validaciones` tiene que
 * estar abierto para el socio —es donde carga sus prestaciones—, pero los
 * lectores de reportes que cuelgan de ahí son herramientas del Colegio: leen el
 * archivo mensual de toda la matrícula y lo cruzan contra el padrón.
 *
 * Es el mismo cerco de UI que `MEDICO_ALLOWED_PATHS`, no una autorización: el
 * padrón que necesitan estas pantallas ya exige `medico:leer`, que el rol
 * médico no tiene.
 */
export const MEDICO_BLOCKED_PATHS = [
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

/**
 * `listado_medico.es_organizacion` — la cuenta es de una clínica, no de un médico.
 * Llega como 1/0 normalizado, pero el backend lo manda como bool: se acepta
 * cualquiera de los dos.
 */
export const esOrganizacion = (user: User | null | undefined): boolean =>
  Boolean(user?.es_organizacion);

/**
 * Rutas que una organización no usa: las validaciones se hacen por el médico
 * que atiende al afiliado, no por la clínica. Mismo cerco de UI que
 * `MEDICO_ALLOWED_PATHS`; se aplica sea cual sea su INGRESAR.
 */
const ORGANIZACION_BLOCKED_PATHS = ["/panel/validaciones"];

export const organizacionCanAccess = (pathname: string): boolean =>
  !ORGANIZACION_BLOCKED_PATHS.some(
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
