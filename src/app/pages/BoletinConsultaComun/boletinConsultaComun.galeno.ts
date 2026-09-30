// Los galenos que muestra el boletín del Colegio.
//
// Antes salían de `valores_boletin` vía `/api/valores/galenos`. Ahora, como el
// resto del boletín, salen de `nm_galenos`; la lectura y el agrupado están en
// `features/nomenclador/galenos`, compartidos con la vista del socio.

import { fetchGalenosPorOS, type GalenosPorOS } from "@/app/features/nomenclador/galenos";

export type GalenoMap = GalenosPorOS;

export async function fetchGalenoMap(): Promise<GalenoMap> {
  return fetchGalenosPorOS();
}
