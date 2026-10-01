// Búsqueda y paginado de la tabla de un reporte.
//
// Los reportes traen entre 500 y 1.200 prácticas. Pintarlas todas cuelga la
// pantalla y no hay forma de encontrar una fila concreta sin buscarla, así que
// las dos cosas van juntas y compartidas por las pantallas que leen reportes.

import { useEffect, useMemo, useState } from "react";

/** Filas por página. */
export const POR_PAGINA = 50;

/** Sin acentos y en minúscula, para que «gonzalez» encuentre «González». */
export const normalizar = (v: string): string =>
  v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

export function useTablaReporte<T>(
  filas: T[],
  /** Qué texto de cada fila se busca. Se compara ya normalizado. */
  textoDe: (fila: T) => string
) {
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);

  const encontradas = useMemo(() => {
    const q = normalizar(busqueda);
    if (!q) return filas;
    return filas.filter((f) => normalizar(textoDe(f)).includes(q));
    // `textoDe` es una función literal en el llamador: incluirla rehace el
    // filtro en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filas, busqueda]);

  const paginas = Math.max(1, Math.ceil(encontradas.length / POR_PAGINA));

  // Buscar o cambiar de filtro puede dejar la página actual fuera de rango.
  useEffect(() => {
    setPagina((p) => Math.min(p, Math.max(1, Math.ceil(encontradas.length / POR_PAGINA))));
  }, [encontradas.length]);

  const visibles = useMemo(
    () => encontradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA),
    [encontradas, pagina]
  );

  return {
    busqueda,
    setBusqueda,
    encontradas,
    visibles,
    pagina,
    setPagina,
    paginas,
    desde: encontradas.length === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1,
    hasta: Math.min(pagina * POR_PAGINA, encontradas.length),
  };
}
