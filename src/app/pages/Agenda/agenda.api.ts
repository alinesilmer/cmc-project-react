import { delJSON, getJSON, postJSON, putJSON } from "@/app/shared/lib/http";
import type {
  EventoAgenda,
  EventoInput,
  OcurrenciaAgenda,
  Responsable,
  TipoEvento,
} from "./agenda.types";

const BASE = "/api/agenda";

/** El listado plano de un calendario, para la pantalla de edición: las reglas ("el 14 de marzo, todos los años"), no sus ocurrencias. */
export const listEventos = (params?: {
  tipo?: TipoEvento;
  incluir_inactivos?: boolean;
}): Promise<EventoAgenda[]> => getJSON<EventoAgenda[]>(`${BASE}/`, params);

/** Qué cae en ese mes, ya resuelto a fechas concretas por el backend. */
export const getMes = (
  anio: number,
  mes: number,
  tipo?: TipoEvento
): Promise<OcurrenciaAgenda[]> =>
  getJSON<OcurrenciaAgenda[]>(`${BASE}/mes`, { anio, mes, ...(tipo ? { tipo } : {}) });

/** El personal del Colegio (rol distinto de `medico`), para el selector de responsable. */
export const listResponsables = (): Promise<Responsable[]> =>
  getJSON<Responsable[]>(`${BASE}/responsables`);

export const createEvento = (body: EventoInput): Promise<EventoAgenda> =>
  postJSON<EventoAgenda>(`${BASE}/`, body);

export const updateEvento = (id: number, body: EventoInput): Promise<EventoAgenda> =>
  putJSON<EventoAgenda>(`${BASE}/${id}`, body);

export const deleteEvento = (id: number): Promise<void> => delJSON<void>(`${BASE}/${id}`);
