import { useQuery } from "@tanstack/react-query";

import { listObrasSociales } from "./obrasSociales.api";
import type { ObraSocialListItem } from "./obrasSociales.types";

/**
 * El listado de obras sociales, que casi toda pantalla de Auditoría y
 * Nomenclador necesita para su combo.
 *
 * Estaba declarado igual (misma clave, misma `staleTime`) en diez pantallas.
 * Compartían la caché de React Query porque la clave coincidía, pero la
 * coincidencia era de palabra: bastaba con que alguien tocara un `staleTime` o
 * escribiera mal la clave en una pantalla para partir la caché en dos y volver
 * a pedir el listado entero. Con el hook, la clave y la política de caché
 * existen una sola vez.
 *
 * El catálogo cambia cuando alguien da de alta una obra social, o sea casi
 * nunca: diez minutos de `staleTime` evitan pedirlo de nuevo al ir y venir
 * entre pantallas.
 */
export const OBRAS_SOCIALES_KEY = ["obras-sociales"] as const;

export function useObrasSociales() {
  return useQuery<ObraSocialListItem[]>({
    queryKey: OBRAS_SOCIALES_KEY,
    queryFn: () => listObrasSociales(),
    staleTime: 10 * 60 * 1000,
  });
}
