import { useQuery } from "@tanstack/react-query";

import { CONSULTA_COMUN_CODE } from "./boletinConsultaComun.constants";
import { fetchConsultaComun } from "./boletinConsultaComun.api";
import type { ConsultaComunItem } from "./boletinConsultaComun.types";

export function useConsultaComunQuery() {
  return useQuery<ConsultaComunItem[], Error>({
    queryKey: ["valores-boletin", "consulta-comun", CONSULTA_COMUN_CODE],
    queryFn: ({ signal }) => fetchConsultaComun(signal),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: (previousData) => previousData,
    notifyOnChangeProps: ["data", "error", "isLoading", "isFetching"],
  });
}