// src/app/auth/roles.ts
import type { User } from "./api";

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
