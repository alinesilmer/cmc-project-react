import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { listGalenos } from "../nomenclador.api";

/** Una opción por código de galeno vigente: todos sus niveles se aumentan juntos. Sólo consulta cuando `activo`. */
export function useGalenosAumentables(obraNro: number, activo: boolean) {
  const query = useQuery({
    queryKey: ["galenos-os", obraNro],
    queryFn: () => listGalenos({ obra_social_nro: obraNro }),
    enabled: activo,
    staleTime: 60 * 1000,
  });

  const opciones = useMemo(() => {
    const porCodigo = new Map<string, { nombre: string; niveles: number[] }>();
    for (const g of query.data ?? []) {
      if (!g.activo || g.vigencia_hasta) continue;
      const previo = porCodigo.get(g.codigo) ?? { nombre: g.nombre, niveles: [] };
      if (g.nivel != null) previo.niveles.push(g.nivel);
      porCodigo.set(g.codigo, previo);
    }
    return [...porCodigo.entries()].map(([codigo, { nombre, niveles }]) => ({
      value: codigo,
      label: nombre,
      hint:
        niveles.length === 0
          ? "Sin niveles"
          : `${niveles.length} nivel${niveles.length === 1 ? "" : "es"} (${Math.min(...niveles)}–${Math.max(...niveles)})`,
    }));
  }, [query.data]);

  return { opciones, cargando: query.isLoading, fallo: query.isError, refrescar: () => void query.refetch() };
}
