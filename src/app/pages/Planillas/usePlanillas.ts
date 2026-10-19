import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { getPlanillas } from "./planillas.api";
import type { Planilla } from "./planillas.types";

const PLANILLAS_KEY = ["planillas"] as const;
const SIN_PLANILLAS: Planilla[] = [];

/** Las planillas publicadas: la misma lista para el portal del médico y para la administración, así que comparten caché. */
export function usePlanillas(avisarError: (mensaje: string) => void) {
  const queryClient = useQueryClient();
  const consulta = useQuery<Planilla[]>({
    queryKey: PLANILLAS_KEY,
    queryFn: () => getPlanillas(),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (consulta.isError) avisarError("No se pudieron cargar las planillas.");
  }, [consulta.isError, avisarError]);

  /** Corrige la lista en caché al instante y la vuelve a pedir. */
  const actualizar = (cambio: (prev: Planilla[]) => Planilla[]) => {
    queryClient.setQueryData<Planilla[]>(PLANILLAS_KEY, (prev) => prev && cambio(prev));
    void queryClient.invalidateQueries({ queryKey: PLANILLAS_KEY });
  };

  return {
    planillas: consulta.data ?? SIN_PLANILLAS,
    cargando: consulta.isPending,
    actualizar,
  };
}
