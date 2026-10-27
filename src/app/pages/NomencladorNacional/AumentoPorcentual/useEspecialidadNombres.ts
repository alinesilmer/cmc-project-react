import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { getEspecialidades } from "../../Especialidades/especialidades.api";

/** Nombre de cada especialidad por su id del Colegio; el catálogo se pide una vez y se comparte. */
export function useEspecialidadNombres() {
  const { data = [] } = useQuery({
    queryKey: ["especialidades"],
    queryFn: getEspecialidades,
    staleTime: 30 * 60 * 1000,
  });
  return useMemo(() => new Map(data.map((e) => [e.id_colegio_espe, e.nombre])), [data]);
}
