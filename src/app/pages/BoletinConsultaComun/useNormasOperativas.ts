import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { getJSON } from "../../lib/http";

// ─── API response shapes ──────────────────────────────────────────

type ApiNorma = {
  id: number;
  titulo: string;
  badge: string | null;
  fecha: string;
  obras_sociales: number[];
};

type ApiNormasResponse = {
  items: ApiNorma[];
};

// ─── Modelo de la vista ───────────────────────────────────────────

export type NormaOperativa = {
  id: number;
  titulo: string;
  /** Etiqueta con la que se publicó ("Normas Operativas"). */
  badge: string | null;
  fecha: string;
};

/** Normas indexadas por NRO_OBRASOCIAL. */
export type NormasPorOS = Map<number, NormaOperativa[]>;

const NORMAS_KEY = ["boletin-normas"] as const;

/** URL pública de la noticia, la misma que ve el médico en el sitio. */
export const urlNorma = (id: number) => `/noticias/${id}`;

/**
 * Normas operativas asociadas a cada obra social.
 *
 * Una sola request para toda la tabla: la grilla tiene cientos de filas y
 * pedirlas de a una sería el peor uso posible del endpoint. El `staleTime`
 * largo va con lo que son — noticias que cambian de mes a mes, no valores.
 */
export function useNormasOperativas() {
  const { data, isLoading } = useQuery({
    queryKey: NORMAS_KEY,
    queryFn: () => getJSON<ApiNormasResponse>("/api/boletin/normas"),
    staleTime: 10 * 60 * 1000,
    // El boletín tiene que seguir sirviendo aunque las normas fallen: son un
    // agregado a la fila, no el dato de la pantalla.
    retry: 1,
  });

  const normasPorOS: NormasPorOS = useMemo(() => {
    const mapa: NormasPorOS = new Map();
    for (const item of data?.items ?? []) {
      const norma: NormaOperativa = {
        id: item.id,
        titulo: item.titulo,
        badge: item.badge,
        fecha: item.fecha,
      };
      for (const nro of item.obras_sociales) {
        const actuales = mapa.get(nro);
        if (actuales) actuales.push(norma);
        else mapa.set(nro, [norma]);
      }
    }
    return mapa;
  }, [data]);

  return { normasPorOS, isLoadingNormas: isLoading };
}
