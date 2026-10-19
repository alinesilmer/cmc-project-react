import { useQuery } from "@tanstack/react-query";

import { getEspecialidades } from "./especialidades.api";
import type { Especialidad } from "./especialidades.types";

/** El catálogo de especialidades. */
export const ESPECIALIDADES_KEY = ["especialidades"] as const;

export function useCatalogoEspecialidades() {
  return useQuery<Especialidad[]>({
    queryKey: ESPECIALIDADES_KEY,
    queryFn: getEspecialidades,
    staleTime: 10 * 60 * 1000,
  });
}
