import { http, postForm, delJSON } from "../../../../app/lib/http";

export type ValoresEticosOut = {
  id: number;
  pdf_path: string;
  observaciones: string | null;
  fecha_update: string;
};

export const getUltimo = async (): Promise<ValoresEticosOut | null> => {
  try {
    const { data } = await http.get<ValoresEticosOut>("/api/valores-eticos/ultimo");
    return data;
  } catch (e: any) {
    if (e?.response?.status === 404) return null;
    throw e;
  }
};

export const listValoresEticos = async (): Promise<ValoresEticosOut[]> => {
  const { data } = await http.get<ValoresEticosOut[]>("/api/valores-eticos/");
  return data;
};

export const uploadValorEtico = (file: File, observaciones?: string): Promise<ValoresEticosOut> => {
  const fd = new FormData();
  fd.append("file", file);
  if (observaciones?.trim()) fd.append("observaciones", observaciones.trim());
  return postForm<ValoresEticosOut>("/api/valores-eticos/", fd);
};

export const deleteValorEtico = (id: number): Promise<void> =>
  delJSON<void>(`/api/valores-eticos/${id}`);
