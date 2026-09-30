import type { GalenoItem } from "@/app/features/nomenclador/galenos";

export type ApiBoletinRow = {
  id: number;
  codigos: string;
  nro_obrasocial: number;
  obra_social: string | null;
  honorarios_a: number;
  honorarios_b: number;
  honorarios_c: number;
  gastos: number;
  ayudante_a: number;
  ayudante_b: number;
  ayudante_c: number;
  c_p_h_s: string;
  fecha_cambio: string | null;
  fecha_vigencia: string | null;
};

/** Sin galenos: el endpoint del boletín no los trae y se completan aparte. */
export const SIN_GALENOS: GalenoItem[] = [];

export type ConsultaComunItem = {
  nro: number;
  nombre: string;
  valor: number;
  fechaCambio: string | null;
  observaciones: string[];
  /** Populated from backend but not rendered in the UI table — export only. */
  /** Los galenos pactados con esa obra social. Puede venir vacío. */
  galenos: GalenoItem[];
};

/** One text observation per obra social, keyed by nro_obrasocial. */
export type ObservacionesMap = Record<number, string>;