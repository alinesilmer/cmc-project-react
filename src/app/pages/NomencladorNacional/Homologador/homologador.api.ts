import { getJSON, postJSON, delJSON } from "@/app/shared/lib/http";
import type {
  HomologadorOut,
  HomologadorCreatePayload,
} from "./homologador.types";

export const listHomologaciones = (params: {
  obra_social_nro?: number;
  q?: string;
  activo?: boolean;
}): Promise<HomologadorOut[]> =>
  getJSON<HomologadorOut[]>("/api/homologador/", params);

export const createHomologacion = (payload: HomologadorCreatePayload): Promise<HomologadorOut> =>
  postJSON<HomologadorOut>("/api/homologador/", payload);

export const deleteHomologacion = (id: number): Promise<void> =>
  delJSON<void>(`/api/homologador/${id}`);
