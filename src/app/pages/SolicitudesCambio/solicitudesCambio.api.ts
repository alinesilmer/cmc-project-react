import { getJSON, postJSON } from "@/app/shared/lib/http";
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
// Las dos de abajo son las únicas del módulo que un médico puede llamar.

/** POST /api/solicitudes-cambio — el socio reporta un dato propio mal cargado. */
export const crearSolicitudCambioPropia = (
  payload: SolicitudCambioCrearPayload
): Promise<SolicitudCambioMia> =>
  postJSON<SolicitudCambioMia>(`${BASE}/`, payload);

/** GET /api/solicitudes-cambio/campos-editables — qué puede corregir el socio, con el valor que figura hoy en su legajo. */
export const getCamposEditables = (): Promise<CampoEditable[]> =>
  getJSON<CampoEditable[]>(`${BASE}/campos-editables`);

/** POST /api/solicitudes-cambio/formulario — manda el formulario completo. */
export const enviarFormularioCambios = (
  payload: SolicitudCambioFormularioPayload
): Promise<SolicitudCambioMia> =>
  postJSON<SolicitudCambioMia>(`${BASE}/formulario`, payload);

/** GET /api/solicitudes-cambio — requiere scope `solicitudes_cambio:gestionar`. */
export const getSolicitudesCambio = (params?: {
  estado?: EstadoSolicitudCambio;
  skip?: number;
  limit?: number;
}): Promise<SolicitudCambioList> =>
  getJSON<SolicitudCambioList>(`${BASE}/`, params);

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
