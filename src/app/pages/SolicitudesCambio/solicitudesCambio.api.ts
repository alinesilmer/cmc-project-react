import { getJSON, postJSON } from "../../lib/http";
import type {
  CampoEditable,
  EstadoSolicitudCambio,
  SolicitudCambio,
  SolicitudCambioCrearPayload,
  SolicitudCambioFormularioPayload,
  SolicitudCambioList,
  SolicitudCambioMia,
} from "./solicitudesCambio.types";

const BASE = "/api/solicitudes-cambio";

// ─── Socio (sin scope de administración) ──────────────────────────────────────
// Las dos de abajo son las únicas del módulo que un médico puede llamar: abre y
// consulta SUS reclamos. nro_socio/medico_id los pone el backend desde el token.

/** POST /api/solicitudes-cambio — el socio reporta un dato propio mal cargado.
 *  Devuelve 429 si ya acumula demasiados pendientes sin resolver. */
export const crearSolicitudCambioPropia = (
  payload: SolicitudCambioCrearPayload
): Promise<SolicitudCambioMia> =>
  postJSON<SolicitudCambioMia>(`${BASE}/`, payload);

/** GET /api/solicitudes-cambio/campos-editables — qué puede corregir el socio,
 *  con el valor que figura hoy en su legajo. */
export const getCamposEditables = (): Promise<CampoEditable[]> =>
  getJSON<CampoEditable[]>(`${BASE}/campos-editables`);

/** POST /api/solicitudes-cambio/formulario — manda el formulario completo.
 *  El backend guarda SÓLO los campos que cambiaron; si no cambió ninguno
 *  responde 422. Al aprobarse, los cambios se aplican al legajo. */
export const enviarFormularioCambios = (
  payload: SolicitudCambioFormularioPayload
): Promise<SolicitudCambioMia> =>
  postJSON<SolicitudCambioMia>(`${BASE}/formulario`, payload);

/** GET /api/solicitudes-cambio/mias — historial propio, del más nuevo al viejo. */
export const getMisSolicitudesCambio = (): Promise<SolicitudCambioMia[]> =>
  getJSON<SolicitudCambioMia[]>(`${BASE}/mias`);

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
