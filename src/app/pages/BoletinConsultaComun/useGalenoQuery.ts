import { useQuery } from "@tanstack/react-query";
import { fetchGalenoMap, type GalenoMap } from "./boletinConsultaComun.galeno";

export function useGalenoQuery() {
  return useQuery<GalenoMap>({
    queryKey: ["boletin-galeno-map"],
    queryFn: fetchGalenoMap,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
