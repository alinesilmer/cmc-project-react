import type { ReactNode } from "react";

/** La única cola de avisos del panel. */
export type Severidad = "success" | "error" | "warning" | "info";

export type Aviso = {
  id: number;
  severidad: Severidad;
  titulo: ReactNode;
  cuerpo?: ReactNode;
  /** Milisegundos en pantalla. */
  duracion: number;
};

/** Más que esto tapa la pantalla: al entrar uno nuevo sale el más viejo. */
const MAXIMO_VISIBLE = 4;

let avisos: Aviso[] = [];
let proximoId = 1;
const suscriptores = new Set<() => void>();

function emitir(siguiente: Aviso[]) {
  avisos = siguiente;
  suscriptores.forEach((s) => s());
}

export function publicarAviso(aviso: Omit<Aviso, "id">): void {
  emitir([...avisos, { ...aviso, id: proximoId++ }].slice(-MAXIMO_VISIBLE));
}

export function quitarAviso(id: number): void {
  if (avisos.some((a) => a.id === id)) emitir(avisos.filter((a) => a.id !== id));
}

export function suscribirAvisos(suscriptor: () => void): () => void {
  suscriptores.add(suscriptor);
  return () => suscriptores.delete(suscriptor);
}

export function leerAvisos(): Aviso[] {
  return avisos;
}
