import { getJSON, postJSON } from "../../lib/http";
import type {
  EstadoSolicitudCambio,
  SolicitudCambio,
  SolicitudCambioList,
} from "./solicitudesCambio.types";

const BASE = "/api/solicitudes-cambio";

/** GET /api/solicitudes-cambio — requiere scope `solicitudes_cambio:gestionar`.
 *  Devuelve la página pedida + los contadores globales por estado. */
export const getSolicitudesCambio = (params?: {
  estado?: EstadoSolicitudCambio;
  skip?: number;
  limit?: number;
}): Promise<SolicitudCambioList> =>
  getJSON<SolicitudCambioList>(`${BASE}/`, params);

/** GET /api/solicitudes-cambio/{id} */
export const getSolicitudCambio = (id: number): Promise<SolicitudCambio> =>
  getJSON<SolicitudCambio>(`${BASE}/${id}`);

/** POST /api/solicitudes-cambio/{id}/approve — no edita el médico. */
export const approveSolicitudCambio = (
  id: number,
  respuesta_admin?: string
): Promise<SolicitudCambio> =>
  postJSON<SolicitudCambio>(`${BASE}/${id}/approve`, {
    respuesta_admin: respuesta_admin ?? null,
  });

/** POST /api/solicitudes-cambio/{id}/reject — el motivo es obligatorio. */
export const rejectSolicitudCambio = (
  id: number,
  respuesta_admin: string
): Promise<SolicitudCambio> =>
  postJSON<SolicitudCambio>(`${BASE}/${id}/reject`, { respuesta_admin });
