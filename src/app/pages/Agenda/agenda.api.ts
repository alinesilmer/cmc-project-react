import { delJSON, getJSON, postJSON, putJSON } from "../../lib/http";
import type {
  EventoAgenda,
  EventoInput,
  OcurrenciaAgenda,
  Responsable,
  TipoEvento,
} from "./agenda.types";

const BASE = "/api/agenda";

/**
 * El listado plano de un calendario, para la pantalla de edición: las reglas
 * ("el 14 de marzo, todos los años"), no sus ocurrencias. `catalogo:leer`.
 */
export const listEventos = (params?: {
  tipo?: TipoEvento;
  incluir_inactivos?: boolean;
}): Promise<EventoAgenda[]> => getJSON<EventoAgenda[]>(`${BASE}/`, params);

/**
 * Qué cae en ese mes, ya resuelto a fechas concretas por el backend.
 * Es lo que dibuja la grilla del almanaque. `catalogo:leer`.
 */
export const getMes = (
  anio: number,
  mes: number,
  tipo?: TipoEvento
): Promise<OcurrenciaAgenda[]> =>
  getJSON<OcurrenciaAgenda[]>(`${BASE}/mes`, { anio, mes, ...(tipo ? { tipo } : {}) });

/**
 * El personal del Colegio (rol distinto de `medico`), para el selector de
 * responsable. Requiere `medico:leer`, que el rol `medico` no tiene.
 *
 * Son ~20 filas, así que se traen todas de una y el filtrado va en el cliente:
 * un request por tecla para una lista de ese tamaño sería peor experiencia y
 * más carga que traerla entera una vez.
 */
export const listResponsables = (): Promise<Responsable[]> =>
  getJSON<Responsable[]>(`${BASE}/responsables`);

export const createEvento = (body: EventoInput): Promise<EventoAgenda> =>
  postJSON<EventoAgenda>(`${BASE}/`, body);

export const updateEvento = (id: number, body: EventoInput): Promise<EventoAgenda> =>
  putJSON<EventoAgenda>(`${BASE}/${id}`, body);

export const deleteEvento = (id: number): Promise<void> => delJSON<void>(`${BASE}/${id}`);
