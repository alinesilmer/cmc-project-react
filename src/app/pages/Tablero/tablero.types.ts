export type Estado = "pendiente" | "en_curso" | "hecho";
export type Prioridad = "alta" | "media" | "baja";

export interface Comentario {
  id: string;
  autor: string;
  texto: string;
  /** ISO con hora. */
  creado: string;
}

export interface Tarjeta {
  id: string;
  titulo: string;
  descripcion: string;
  estado: Estado;
  prioridad: Prioridad;
  asignadoId: number | null;
  asignadoNombre: string;
  /** `YYYY-MM-DD`, o vacío si no tiene fecha. */
  vence: string;
  comentarios: Comentario[];
}

export type NuevaTarjeta = Pick<Tarjeta, "titulo" | "descripcion" | "estado" | "prioridad" | "asignadoId" | "asignadoNombre" | "vence">;

export const ESTADOS: { valor: Estado; rotulo: string }[] = [
  { valor: "pendiente", rotulo: "Por hacer" },
  { valor: "en_curso", rotulo: "En curso" },
  { valor: "hecho", rotulo: "Hecho" },
];

export const PRIORIDADES: { valor: Prioridad; rotulo: string }[] = [
  { valor: "alta", rotulo: "Alta" },
  { valor: "media", rotulo: "Media" },
  { valor: "baja", rotulo: "Baja" },
];

export const TOPE_TARJETAS = 300;
