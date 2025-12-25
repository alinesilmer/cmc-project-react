import { getJSON, http } from "../../app/lib/http";
import type { Noticia, NoticiaDetail } from "../types/index";

function adaptNewsDetail(n: any): NoticiaDetail {
  if (!n || typeof n !== "object") return n;
  return {
    ...n,
    // normalizo fechas
    fechaCreacion: n.fechaCreacion ?? n.fecha_creacion ?? null,
    fechaActualizacion: n.fechaActualizacion ?? n.fecha_actualizacion ?? null,
  };
}

export type TipoPublicacion = "Blog" | "Noticia" | "Curso";

//#region TYPES
type CreateFields = {
  titulo: string;
  resumen: string;
  contenido: string;
  tipo: TipoPublicacion; // ✅ importante
  publicada?: boolean;
  autor?: string;
};

type UpdateFields = Partial<CreateFields>;

type SaveOptions = {
  portada?: File | null;
  adjuntos?: File[];
  clearPortada?: boolean;
  deleteDocIds?: number[];
};
//#endregion

export const listNews = (params?: { tipo?: TipoPublicacion }) => {
  const qs = params?.tipo ? `?tipo=${encodeURIComponent(params.tipo)}` : "";
  return getJSON<Noticia[]>(`/api/noticias/${qs}`);
};

export const listCourses = () => listNews({ tipo: "Curso" });

export async function createNews(fields: CreateFields, opts?: SaveOptions) {
  const fd = new FormData();
  fd.append("titulo", fields.titulo);
  fd.append("resumen", fields.resumen);
  fd.append("contenido", fields.contenido);
  fd.append("tipo", fields.tipo); // ✅ NUEVO
  if (typeof fields.publicada !== "undefined") {
    fd.append("publicada", String(!!fields.publicada));
  }
  if (fields.autor) fd.append("autor", fields.autor);

  if (opts?.portada) fd.append("portada", opts.portada);
  (opts?.adjuntos ?? []).forEach((f) => fd.append("adjuntos", f));

  const { data } = await http.post("/api/noticias/", fd);
  return adaptNewsDetail(data);
}

export async function updateNews(
  id: string | number,
  fields: UpdateFields,
  opts?: SaveOptions
) {
  const fd = new FormData();
  if (fields.titulo !== undefined) fd.append("titulo", fields.titulo);
  if (fields.resumen !== undefined) fd.append("resumen", fields.resumen);
  if (fields.contenido !== undefined) fd.append("contenido", fields.contenido);
  if (fields.tipo !== undefined) fd.append("tipo", fields.tipo); // ✅ NUEVO
  if (fields.publicada !== undefined)
    fd.append("publicada", String(!!fields.publicada));
  if (fields.autor !== undefined) fd.append("autor", fields.autor || "");

  if (opts?.clearPortada) fd.append("limpiar_portada", "true");
  if (opts?.portada) fd.append("portada", opts.portada);
  (opts?.adjuntos ?? []).forEach((f) => fd.append("adjuntos", f));

  if (opts?.deleteDocIds?.length) {
    fd.append("eliminar_documento_ids", opts.deleteDocIds.join(","));
  }

  const { data } = await http.put(
    `/api/noticias/${encodeURIComponent(String(id))}`,
    fd
  );
  return adaptNewsDetail(data);
}

export async function removeNews(id: string | number) {
  const { data } = await http.delete(
    `/api/noticias/${encodeURIComponent(String(id))}`
  );
  return data;
}

export async function removeNewsDoc(
  noticiaId: string | number,
  docId: string | number
) {
  const { data } = await http.delete(
    `/api/noticias/${encodeURIComponent(
      String(noticiaId)
    )}/documentos/${encodeURIComponent(String(docId))}`
  );
  return data;
}

export async function getNewsById(id: string | number) {
  const { data } = await http.get(
    `/api/noticias/${encodeURIComponent(String(id))}`
  );
  return adaptNewsDetail(data);
}
