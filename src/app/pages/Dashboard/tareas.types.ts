export type Prioridad = "alta" | "media" | "baja";

export type Tarea = { id: number; texto: string; hecha: boolean; prioridad: Prioridad };

/** De la más urgente a la menos: es el orden de la lista y el del botón que las rota. */
export const PRIORIDADES: Prioridad[] = ["alta", "media", "baja"];

export type TareaNueva = Pick<Tarea, "texto" | "prioridad">;

export type TareaCambio = Partial<Pick<Tarea, "texto" | "hecha" | "prioridad">>;

export type TareaLocal = Pick<Tarea, "texto" | "hecha" | "prioridad">;
