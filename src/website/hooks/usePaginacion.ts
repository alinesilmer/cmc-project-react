import { useEffect, useMemo, useState } from "react";

/**
 * Paginación en memoria de una lista ya filtrada.
 *
 * Vuelve a la página 1 cuando cambia `reinicio` (la búsqueda, un filtro): si
 * no, la pantalla puede quedar parada en una página que ya no existe.
 */
export function usePaginacion<T>(items: T[], porPagina: number, reinicio?: unknown) {
  const [pagina, setPagina] = useState(1);
  const totalPaginas = Math.max(1, Math.ceil(items.length / porPagina));

  useEffect(() => {
    setPagina(1);
  }, [reinicio]);

  // La lista puede achicarse (se borró un ítem) y dejar la página fuera de rango.
  useEffect(() => {
    if (pagina > totalPaginas) setPagina(totalPaginas);
  }, [pagina, totalPaginas]);

  const desde = (pagina - 1) * porPagina;
  const visibles = useMemo(() => items.slice(desde, desde + porPagina), [items, desde, porPagina]);

  const irA = (p: number) => setPagina(Math.min(Math.max(1, p), totalPaginas));

  return {
    pagina,
    totalPaginas,
    visibles,
    irA,
    /** Índice (base 1) del primer y último ítem visibles, para «Mostrando 1–10 de 40». */
    rango: { desde: desde + 1, hasta: Math.min(desde + porPagina, items.length), total: items.length },
  };
}
