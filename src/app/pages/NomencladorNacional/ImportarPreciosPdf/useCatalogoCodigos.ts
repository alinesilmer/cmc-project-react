import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listNomencladorCodigos } from "../nomenclador.api";

/**
 * Set de códigos del catálogo CMC (cacheado). Se usa para auto-detectar la columna
 * de código y validar qué filas de un Excel/CSV son códigos reales.
 */
export function useCatalogoCodigos(): Set<string> {
  const { data } = useQuery({
    queryKey: ["nomenclador-codigos"],
    queryFn: listNomencladorCodigos,
    staleTime: 30 * 60 * 1000,
  });
  return useMemo(() => new Set(data ?? []), [data]);
}
