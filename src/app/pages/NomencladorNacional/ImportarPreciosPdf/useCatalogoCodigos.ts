import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listNomencladorCodigos } from "../nomenclador.api";

/** Set de códigos del catálogo CMC (cacheado). */
export function useCatalogoCodigos(): Set<string> {
  const { data } = useQuery({
    queryKey: ["nomenclador-codigos"],
    queryFn: listNomencladorCodigos,
    staleTime: 30 * 60 * 1000,
  });
  return useMemo(() => new Set(data ?? []), [data]);
}
