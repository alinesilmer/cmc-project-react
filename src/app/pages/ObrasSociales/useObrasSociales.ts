import { useQuery } from "@tanstack/react-query";

import { listObrasSociales } from "./obrasSociales.api";
import type { ObraSocialListItem } from "./obrasSociales.types";

/** El listado de obras sociales, que casi toda pantalla de Auditoría y Nomenclador necesita para su combo. */
export const OBRAS_SOCIALES_KEY = ["obras-sociales"] as const;

export function useObrasSociales() {
  return useQuery<ObraSocialListItem[]>({
    queryKey: OBRAS_SOCIALES_KEY,
    queryFn: () => listObrasSociales(),
    staleTime: 10 * 60 * 1000,
  });
}
