// Aviso que ven ciertos socios al ingresar al sistema y cada vez que van a
// Inicio.
//
// Lo pide el Colegio para socios puntuales. La lista vive acá, en el front:
// es un recordatorio en pantalla, no un permiso, así que no pasa por RBAC.

import type { User } from "@/app/auth/api";

/** Números de socio que ven el aviso. */
const SOCIOS_CON_AVISO = [536];

// Se marca al iniciar sesión y se borra al cerrar el aviso: así aparece al
// ingresar aunque el socio no caiga en Inicio, y si recargan la página sin
// haberlo cerrado sigue ahí.
const CLAVE = "aviso-ingreso:pendiente";

export const llevaAviso = (user: User | null | undefined): boolean =>
  SOCIOS_CON_AVISO.includes(Number(user?.nro_socio));

/** Se llama al iniciar sesión, no al restaurar una sesión que ya estaba abierta. */
export function anotarIngreso(user: User): void {
  if (llevaAviso(user)) sessionStorage.setItem(CLAVE, "1");
  else sessionStorage.removeItem(CLAVE);
}

export const avisoPendiente = (user: User | null | undefined): boolean =>
  llevaAviso(user) && sessionStorage.getItem(CLAVE) === "1";

export const cerrarAviso = (): void => sessionStorage.removeItem(CLAVE);
