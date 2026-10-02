import type { QueryClient } from "@tanstack/react-query";
import type { TipoPublicacion } from "../../../types";

export type FiltroTipo = TipoPublicacion | "Todos";

export const publicacionesAdminKey = (tipo: FiltroTipo) => ["admin", "publicaciones", tipo] as const;

/**
 * Después de crear, editar o borrar: se invalida el listado del administrador
 * y también el del sitio, para que quien tenga las dos pestañas abiertas vea
 * el cambio sin recargar.
 */
export function refrescarPublicaciones(queryClient: QueryClient): Promise<void[]> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["admin", "publicaciones"] }),
    queryClient.invalidateQueries({ queryKey: ["web", "publicaciones"] }),
    queryClient.invalidateQueries({ queryKey: ["web", "publicacion"] }),
  ]);
}
