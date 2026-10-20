import type { GalenoItem } from "@/app/features/nomenclador/galenos";

/** Sin galenos: el endpoint del boletín no los trae y se completan aparte. */
export const SIN_GALENOS: GalenoItem[] = [];

export type ConsultaComunItem = {
  nro: number;
  nombre: string;
  valor: number;
  fechaCambio: string | null;
  observaciones: string[];
  /** Los galenos pactados con esa obra social. Puede venir vacío. */
  galenos: GalenoItem[];
};

/** One text observation per obra social, keyed by nro_obrasocial. */
export type ObservacionesMap = Record<number, string>;