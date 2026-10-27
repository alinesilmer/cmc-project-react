import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { cambiarVisibilidadGaleno, getResumenGalenos, listGalenos } from "../nomenclador.api";
import type { GalenoOut, GalenoResumenOut } from "../nomenclador.types";
import { agruparGalenos, type Grupo } from "./precios.helpers";
import { useNotify } from "@/app/hooks/useNotify";

/** Los galenos activos de una obra social agrupados por código, con su resumen y el interruptor de visibilidad en el boletín. */
export function useGalenosOS(obraNro: number) {
  const qc = useQueryClient();
  const notify = useNotify();
  const clave = useMemo(() => ["galenos-os", obraNro] as const, [obraNro]);

  const galenosQuery = useQuery({ queryKey: clave, queryFn: () => listGalenos({ obra_social_nro: obraNro }) });

  // Con qué nomencladores se usa cada galeno, en qué modo y qué niveles se apartan de la escala.
  const resumenQuery = useQuery({
    queryKey: ["galenos-resumen", obraNro],
    queryFn: () => getResumenGalenos(obraNro),
    staleTime: 30_000,
  });

  const grupos = useMemo(() => agruparGalenos((galenosQuery.data ?? []).filter((g) => g.activo)), [galenosQuery.data]);
  const resumenPorCodigo = useMemo(
    () => new Map<string, GalenoResumenOut>((resumenQuery.data ?? []).map((r) => [r.codigo, r])),
    [resumenQuery.data],
  );
  const galenos = useMemo(() => grupos.flatMap((g) => g.niveles), [grupos]);

  const [cambiando, setCambiando] = useState<Set<string>>(new Set());

  /** Muestra u oculta el galeno en el boletín del médico: se ve al instante y, si falla, se deshace. */
  const alternarVisible = useCallback(
    async (grupo: Grupo) => {
      const visible = !grupo.visible;
      const poner = (v: boolean) =>
        qc.setQueryData<GalenoOut[]>(clave, (prev) => prev?.map((g) => (g.codigo === grupo.codigo ? { ...g, visible: v } : g)));
      poner(visible);
      setCambiando((prev) => new Set(prev).add(grupo.codigo));
      try {
        await cambiarVisibilidadGaleno({ obra_social_nro: obraNro, codigo: grupo.codigo, visible });
        notify.success(
          visible
            ? `${grupo.nombre} vuelve a mostrarse en el boletín de los médicos.`
            : `${grupo.nombre} ya no se muestra en el boletín de los médicos.`,
        );
      } catch {
        poner(!visible);
        notify.error(`No se pudo cambiar la visibilidad de ${grupo.nombre}.`);
      } finally {
        setCambiando((prev) => {
          const sig = new Set(prev);
          sig.delete(grupo.codigo);
          return sig;
        });
      }
    },
    [qc, clave, obraNro, notify],
  );

  /** Vuelve a pedir los valores actuales (el alta no devuelve las filas). */
  const refrescar = useCallback(async () => {
    await Promise.all([galenosQuery.refetch(), resumenQuery.refetch()]);
  }, [galenosQuery, resumenQuery]);

  return {
    grupos,
    galenos,
    resumenPorCodigo,
    cargando: galenosQuery.isLoading,
    fallo: galenosQuery.isError,
    cambiando,
    alternarVisible,
    refrescar,
  };
}
