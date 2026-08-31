import { delJSON, getJSON, postJSON, putJSON } from "../../lib/http";
import type {
  EmailInput,
  EmailInstitucion,
  Institucion,
  InstitucionInput,
  TelefonoInput,
  TelefonoInstitucion,
} from "./institucion.types";

const BASE = "/api/institucion";

/** Todo junto: datos fiscales, bancarios, teléfonos y casillas. `catalogo:leer`. */
export const getInstitucion = (): Promise<Institucion> => getJSON<Institucion>(`${BASE}/`);

/** Reemplaza los datos generales. No toca teléfonos ni casillas. `catalogo:editar`. */
export const saveInstitucion = (body: InstitucionInput): Promise<Institucion> =>
  putJSON<Institucion>(`${BASE}/`, body);

export const addTelefono = (body: TelefonoInput): Promise<TelefonoInstitucion> =>
  postJSON<TelefonoInstitucion>(`${BASE}/telefonos`, body);

export const updateTelefono = (
  id: number,
  body: TelefonoInput
): Promise<TelefonoInstitucion> => putJSON<TelefonoInstitucion>(`${BASE}/telefonos/${id}`, body);

export const deleteTelefono = (id: number): Promise<void> =>
  delJSON<void>(`${BASE}/telefonos/${id}`);

export const addMail = (body: EmailInput): Promise<EmailInstitucion> =>
  postJSON<EmailInstitucion>(`${BASE}/mails`, body);

/** Edita los datos de la casilla. **La contraseña queda como estaba.** */
export const updateMail = (id: number, body: EmailInput): Promise<EmailInstitucion> =>
  putJSON<EmailInstitucion>(`${BASE}/mails/${id}`, body);

export const deleteMail = (id: number): Promise<void> => delJSON<void>(`${BASE}/mails/${id}`);

/**
 * Guarda o borra la contraseña de una casilla (`null` la borra). `rbac:gestionar`.
 * La respuesta confirma con `tiene_password`, sin devolver el valor.
 */
export const savePassword = (
  id: number,
  password: string | null
): Promise<EmailInstitucion> =>
  putJSON<EmailInstitucion>(`${BASE}/mails/${id}/password`, { password });

/**
 * Devuelve la contraseña en claro. `rbac:gestionar`.
 *
 * **Es POST aunque no modifique nada**, y eso es a propósito: el middleware de
 * auditoría del backend sólo registra métodos mutantes, así que con un GET las
 * lecturas de credenciales no dejarían rastro. Cada llamada a esto queda
 * anotada en `audit_log` con usuario, IP y hora.
 */
export const revelarPassword = (
  id: number
): Promise<{ id: number; direccion: string; password: string }> =>
  postJSON<{ id: number; direccion: string; password: string }>(
    `${BASE}/mails/${id}/password/revelar`,
    {}
  );
