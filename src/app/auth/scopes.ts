// src/app/auth/scopes.ts
// Códigos de permiso nuevos (§2 del doc de backend) con soporte dual: los
// scopes viejos siguen llegando en el token y hay que seguir aceptándolos
// hasta la Etapa 3, cuando el backend los borre. En ese momento alcanza con
// vaciar ALIAS_LEGACY.
export const PERMS = {
  MEDICO_LEER: "medico:leer",
  LIQUIDACION_LEER: "liquidacion:leer",
  AVISO_GESTIONAR: "aviso:gestionar",
  BENEFICIO_GESTIONAR: "beneficio:gestionar",
  SOLICITUD_RESOLVER: "solicitud:resolver",
  RBAC_GESTIONAR: "rbac:gestionar",
  FACTURACION_LEER: "facturacion:leer",
  /** TEMPORAL — prueba controlada del panel nuevo con médicos seleccionados.
   * Quien lo tenga se queda en /panel/dashboard tras el login en vez de ir al
   * legacy (ver Login.tsx). Sin equivalente viejo, no va en ALIAS_LEGACY. */
  PANEL_INGRESAR: "panel:ingresar",
} as const;

export const ALIAS_LEGACY: Record<string, string[]> = {
  "medico:leer": ["medicos:leer"],
  "liquidacion:leer": ["liquidacion:ver"],
  "aviso:gestionar": ["avisos:gestionar"],
  "beneficio:gestionar": ["beneficios:gestionar"],
  "solicitud:resolver": ["solicitudes:gestionar", "solicitudes_cambio:gestionar"],
  "facturacion:leer": ["facturas:ver"],
};

export function hasScope(scopes: string[] | undefined, code: string): boolean {
  if (!scopes?.length) return false;
  if (scopes.includes(code)) return true;
  const legacy = ALIAS_LEGACY[code];
  return !!legacy?.some((s) => scopes.includes(s));
}
