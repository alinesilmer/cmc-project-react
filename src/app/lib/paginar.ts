// Recorrido de un endpoint paginado del backend.
//
// Ninguna de las listas de `cmc_api` devuelve el total de filas: la única forma
// de saber si hay más es pedir una página y ver si volvió completa. Eso estaba
// resuelto a mano en cinco pantallas (Boletín, Aumento Porcentual, Historial de
// Valores, Aranceles y Códigos por Especialidad), siempre igual y siempre en
// serie: página 1 → esperar → página 2 → esperar. Con ~300 ms de ida y vuelta,
// una obra social de 800 códigos tardaba más de un segundo solo en viajes.
//
// Acá está una sola vez, y pidiendo varias páginas a la vez.

/** Páginas que se piden simultáneamente en cada tanda. */
const CONCURRENCIA = 4;

/**
 * Techo de páginas. Existe para que un backend que devuelva siempre páginas
 * completas (un filtro que se ignora, un bug de paginado) no dispare una
 * cascada infinita de requests desde el navegador.
 */
const MAX_PAGINAS_POR_DEFECTO = 100;

export type OpcionesPaginado = {
  /** Filas por página. Tiene que ser el `size` que se le manda al endpoint. */
  size: number;
  /** Corte de seguridad. Por defecto 100 páginas. */
  maxPaginas?: number;
};

/**
 * Pide páginas hasta que una vuelve incompleta y devuelve todo junto, en orden.
 *
 * `pedir` recibe el número de página (base 1) y devuelve esa página. Se lo
 * llama de a `CONCURRENCIA` páginas en paralelo, así que puede pedir hasta tres
 * páginas de más al final del recorrido: son GET que vuelven vacíos y salen
 * mucho más baratos que encadenar un viaje por página.
 *
 *     const filas = await paginar((page) => listValores({ ...p, page, size }), { size });
 */
export async function paginar<T>(
  pedir: (page: number) => Promise<T[]>,
  { size, maxPaginas = MAX_PAGINAS_POR_DEFECTO }: OpcionesPaginado,
): Promise<T[]> {
  const todo: T[] = [];

  for (let desde = 1; desde <= maxPaginas; desde += CONCURRENCIA) {
    const tanda = Array.from(
      { length: Math.min(CONCURRENCIA, maxPaginas - desde + 1) },
      (_, i) => pedir(desde + i),
    );
    const paginas = await Promise.all(tanda);

    // Se corta en la primera página incompleta: lo que vino después de ella en
    // la misma tanda son las páginas vacías del final y se descarta.
    for (const pagina of paginas) {
      todo.push(...pagina);
      if (pagina.length < size) return todo;
    }
  }

  return todo;
}
