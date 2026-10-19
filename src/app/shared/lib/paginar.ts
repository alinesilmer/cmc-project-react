// Recorrido de un endpoint paginado del backend.

/** Páginas que se piden simultáneamente en cada tanda. */
const CONCURRENCIA = 4;

/** Techo de páginas. Existe para que un backend que devuelva siempre páginas completas (un filtro que se ignora. */
const MAX_PAGINAS_POR_DEFECTO = 100;

export type OpcionesPaginado = {
  /** Filas por página. Tiene que ser el `size` que se le manda al endpoint. */
  size: number;
  /** Corte de seguridad. Por defecto 100 páginas. */
  maxPaginas?: number;
};

/** Pide páginas hasta que una vuelve incompleta y devuelve todo junto, en orden. */
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

    // Se corta en la primera página incompleta: lo que vino después de ella en la misma tanda son las páginas vacías del final y…
    for (const pagina of paginas) {
      todo.push(...pagina);
      if (pagina.length < size) return todo;
    }
  }

  return todo;
}
