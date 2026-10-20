import { useQuery } from "@tanstack/react-query";

import { CONSULTA_COMUN_CODE } from "./boletinConsultaComun.constants";
import { fetchConsultaComun } from "./boletinConsultaComun.api";
import type { ConsultaComunItem } from "./boletinConsultaComun.types";

export function useConsultaComunQuery() {
  return useQuery<ConsultaComunItem[], Error>({
    queryKey: ["nm-consulta-comun", CONSULTA_COMUN_CODE],
    queryFn: fetchConsultaComun,
    // Corto y con refresco al volver a la pestaña: el valor lo cambia Nomenclador y acá tiene que verse solo.
    staleTime: 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    placeholderData: (previousData) => previousData,
    notifyOnChangeProps: ["data", "error", "isLoading", "isFetching"],
  });
}