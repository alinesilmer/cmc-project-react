import { getJSON, postJSON, putJSON, delJSON } from "../../../lib/http";
import type {
  HomologadorOut,
  HomologadorCreatePayload,
  HomologadorUpdatePayload,
} from "./homologador.types";

export const listHomologaciones = (params: {
  obra_social_nro?: number;
  q?: string;
  activo?: boolean;
}): Promise<HomologadorOut[]> =>
  getJSON<HomologadorOut[]>("/api/homologador/", params);

export const getHomologacion = (id: number): Promise<HomologadorOut> =>
  getJSON<HomologadorOut>(`/api/homologador/${id}`);

export const createHomologacion = (payload: HomologadorCreatePayload): Promise<HomologadorOut> =>
  postJSON<HomologadorOut>("/api/homologador/", payload);

export const updateHomologacion = (id: number, payload: HomologadorUpdatePayload): Promise<HomologadorOut> =>
  putJSON<HomologadorOut>(`/api/homologador/${id}`, payload);

export const deleteHomologacion = (id: number): Promise<void> =>
  delJSON<void>(`/api/homologador/${id}`);
