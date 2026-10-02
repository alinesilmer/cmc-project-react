export type TipoArchivo = "pdf" | "imagen" | "otro";

const EXT_IMAGEN = /\.(png|jpe?g|gif|webp|avif|bmp)$/i;

/**
 * Qué es un archivo, por su `content-type` o, si no vino, por la extensión.
 * Lo usaban el editor de publicaciones y las dos páginas de detalle, cada uno
 * con su propia copia.
 */
export function tipoDeArchivo(contentType: string | null | undefined, nombre: string): TipoArchivo {
  const ct = (contentType ?? "").toLowerCase();
  if (ct === "application/pdf" || nombre.toLowerCase().endsWith(".pdf")) return "pdf";
  if (ct.startsWith("image/") || EXT_IMAGEN.test(nombre)) return "imagen";
  return "otro";
}

/** El nombre visible de un archivo guardado: el original si existe. */
export const nombreVisible = (doc: { original_name?: string | null; filename: string }): string =>
  doc.original_name || doc.filename;

/** El último tramo de una ruta, para mostrar sólo el nombre del archivo. */
export const nombreDeRuta = (ruta: string): string => ruta.split("/").pop() ?? ruta;

/** Separa los documentos por tipo, conservando el orden en que llegaron. */
export function agruparPorTipo<T extends { content_type?: string | null; path: string }>(
  docs: T[]
): Record<TipoArchivo, T[]> {
  const grupos: Record<TipoArchivo, T[]> = { pdf: [], imagen: [], otro: [] };
  for (const d of docs) grupos[tipoDeArchivo(d.content_type, d.path)].push(d);
  return grupos;
}
