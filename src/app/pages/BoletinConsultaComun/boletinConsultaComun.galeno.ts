// Los galenos que muestra el boletín del Colegio.

import { fetchGalenosPorOS, type GalenosPorOS } from "@/app/features/nomenclador/galenos";

export type GalenoMap = GalenosPorOS;

export async function fetchGalenoMap(): Promise<GalenoMap> {
  return fetchGalenosPorOS();
}
