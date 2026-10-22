import axios from "axios";

import { http } from "@/app/shared/lib/http";

export type Vista = "todos" | "sin" | "ad";

export type Candidato = {
  /** `listado_medico.ID`: es el que reciben las altas y bajas. */
  ID: number;
  NRO_SOCIO: number;
  NOMBRE: string | null;
  MATRICULA_PROV: number | null;
  ESPECIALIDADES: string[];
  /** Ya figura en el padrón de la obra social (en alguno de sus planes). */
  ADHERIDO: boolean;
};

export type PaginaCandidatos = {
  items: Candidato[];
  total: number;
  page: number;
  size: number;
  /** Sobre todos los socios activos, sin importar búsqueda ni vista. */
  adheridos: number;
  sin_adherir: number;
};

export type ResultadoMasivo = {
  procesados: number;
  sin_cambios: number;
  /** IDs que no se tocaron: no existen o no son socios activos. */
  omitidos: number[];
};

export const TAMANO_PAGINA = 50;

const base = (nroOS: number) => `/api/padrones/obras-sociales/${nroOS}`;

export async function fetchCandidatos(
  nroOS: number,
  params: { search: string; vista: Vista; page: number },
  signal?: AbortSignal
): Promise<PaginaCandidatos> {
  const { data } = await http.get<PaginaCandidatos>(`${base(nroOS)}/candidatos`, {
    signal,
    timeout: 30_000,
    params: {
      search: params.search.trim() || undefined,
      vista: params.vista,
      page: params.page,
      size: TAMANO_PAGINA,
    },
  });
  return data;
}

export async function adherirSocios(nroOS: number, medicoIds: number[]): Promise<ResultadoMasivo> {
  const { data } = await http.post<ResultadoMasivo>(`${base(nroOS)}/adherir`, { medico_ids: medicoIds });
  return data;
}

export async function quitarSocios(nroOS: number, medicoIds: number[]): Promise<ResultadoMasivo> {
  const { data } = await http.post<ResultadoMasivo>(`${base(nroOS)}/quitar`, { medico_ids: medicoIds });
  return data;
}

/** Lo que dice la API cuando rechaza el pedido, o un texto genérico si no llegó a responder. */
export function mensajeDeError(e: unknown, porDefecto: string): string {
  if (axios.isAxiosError(e)) {
    const detail = e.response?.data?.detail;
    if (typeof detail === "string" && detail) return detail;
    if (e.response?.status === 403) return "No tenés permiso para editar padrones.";
  }
  return porDefecto;
}
