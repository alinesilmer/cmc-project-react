import { getJSON, getPublico, http } from "./http";
import type { Noticia, NoticiaDetail, TipoPublicacion } from "../types";

export type { TipoPublicacion };

/**
 * La API mezcla camelCase y snake_case en las fechas según el endpoint. Se
 * normaliza acá, una vez, en vez de en cada pantalla que las muestra.
 */
function adaptar<T extends Noticia>(n: unknown): T {
  const crudo = (n ?? {}) as Record<string, unknown>;
  return {
    ...(crudo as unknown as T),
    fechaCreacion: (crudo.fechaCreacion ?? crudo.fecha_creacion ?? null) as T["fechaCreacion"],
    fechaActualizacion: (crudo.fechaActualizacion ??
      crudo.fecha_actualizacion ??
      null) as T["fechaActualizacion"],
  };
}

type Campos = {
  titulo: string;
  resumen: string;
  contenido: string;
  tipo: TipoPublicacion;
  publicada?: boolean;
  autor?: string;
  badge?: string;
  /**
   * NRO_OBRASOCIAL alcanzados por la noticia (normas operativas). Viaja como
   * CSV porque el alta es `multipart/form-data`, no JSON. Un array vacío
   * desasocia todas; omitir el campo deja lo que ya estaba.
   */
  obrasSociales?: number[];
};

type OpcionesGuardado = {
  portada?: File | null;
  adjuntos?: File[];
  clearPortada?: boolean;
  deleteDocIds?: number[];
};

/**
 * El alta y la edición mandan el mismo formulario; en la edición sólo viajan
 * los campos presentes, así el backend no pisa lo que no se tocó.
 */
function armarFormulario(campos: Partial<Campos>, opts: OpcionesGuardado = {}): FormData {
  const fd = new FormData();
  const texto = ["titulo", "resumen", "contenido", "tipo", "badge"] as const;
  for (const k of texto) {
    const v = campos[k];
    if (v !== undefined) fd.append(k, v);
  }
  if (campos.publicada !== undefined) fd.append("publicada", String(campos.publicada));
  if (campos.autor !== undefined) fd.append("autor", campos.autor);
  if (campos.obrasSociales !== undefined) {
    fd.append("obras_sociales", campos.obrasSociales.join(","));
  }

  if (opts.clearPortada) fd.append("limpiar_portada", "true");
  if (opts.portada) fd.append("portada", opts.portada);
  for (const f of opts.adjuntos ?? []) fd.append("adjuntos", f);
  if (opts.deleteDocIds?.length) {
    fd.append("eliminar_documento_ids", opts.deleteDocIds.join(","));
  }
  return fd;
}

const rutaNoticia = (id: string | number) =>
  `/api/noticias/${encodeURIComponent(String(id))}`;

export async function listNews(params?: { tipo?: TipoPublicacion }): Promise<Noticia[]> {
  const filas = await getJSON<unknown[]>("/api/noticias/", params?.tipo ? { tipo: params.tipo } : undefined);
  return (filas ?? []).map((n) => adaptar<Noticia>(n));
}

export async function getNewsById(id: string | number): Promise<NoticiaDetail> {
  return adaptar<NoticiaDetail>(await getJSON<unknown>(rutaNoticia(id)));
}

// Las versiones del sitio público: sin sesión (ver `getPublico`). Las de arriba
// las usa el editor del panel, que necesita su token para ver los borradores.
export async function listNewsPublicas(tipo: TipoPublicacion): Promise<Noticia[]> {
  const filas = await getPublico<unknown[]>("/api/noticias/", { tipo });
  return (filas ?? []).map((n) => adaptar<Noticia>(n));
}

export async function getNewsPublica(id: string | number): Promise<NoticiaDetail> {
  return adaptar<NoticiaDetail>(await getPublico<unknown>(rutaNoticia(id)));
}

export async function createNews(campos: Campos, opts?: OpcionesGuardado) {
  const { data } = await http.post("/api/noticias/", armarFormulario(campos, opts));
  return adaptar<NoticiaDetail>(data);
}

export async function updateNews(
  id: string | number,
  campos: Partial<Campos>,
  opts?: OpcionesGuardado
) {
  const { data } = await http.put(rutaNoticia(id), armarFormulario(campos, opts));
  return adaptar<NoticiaDetail>(data);
}

export async function removeNews(id: string | number): Promise<void> {
  await http.delete(rutaNoticia(id));
}

export async function removeNewsDoc(noticiaId: string | number, docId: string | number): Promise<void> {
  await http.delete(`${rutaNoticia(noticiaId)}/documentos/${encodeURIComponent(String(docId))}`);
}
