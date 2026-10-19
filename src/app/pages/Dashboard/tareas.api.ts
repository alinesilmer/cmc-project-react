import { delJSON, getJSON, patchJSON, postJSON } from "@/app/shared/lib/http";
import type { Tarea, TareaCambio, TareaLocal, TareaNueva } from "./tareas.types";

// Personales: el backend devuelve y modifica sólo las del usuario del token.
const BASE = "/api/tareas";

/** GET /api/tareas — pendientes y las tildadas hoy. */
export const getTareas = (): Promise<Tarea[]> => getJSON<Tarea[]>(`${BASE}/`);

/** POST /api/tareas */
export const crearTarea = (tarea: TareaNueva): Promise<Tarea> => postJSON<Tarea>(`${BASE}/`, tarea);

/** PATCH /api/tareas/{id} — parcial. */
export const actualizarTarea = (id: number, cambio: TareaCambio): Promise<Tarea> =>
  patchJSON<Tarea>(`${BASE}/${id}`, cambio);

/** DELETE /api/tareas/{id} */
export const quitarTarea = (id: number): Promise<void> => delJSON<void>(`${BASE}/${id}`);

/** DELETE /api/tareas/hechas */
export const limpiarHechas = (): Promise<void> => delJSON<void>(`${BASE}/hechas`);

/** POST /api/tareas/importar — vuelca lo que había en el navegador; repetirlo no duplica. */
export const importarTareas = (tareas: TareaLocal[]): Promise<Tarea[]> =>
  postJSON<Tarea[]>(`${BASE}/importar`, { tareas });
