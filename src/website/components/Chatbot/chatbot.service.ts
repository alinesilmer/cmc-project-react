/**
 * Consultas a la API que hace el chatbot para responder con datos en vivo.
 * Los errores nunca llegan a la UI: el llamador recibe `null` y responde con
 * el texto genérico del intent.
 */

import { listObrasSocialesPublicas, type ObraSocialPublica } from "../../lib/obrasSociales.client";
import { normalizar } from "../../lib/texto";

const CACHE_MS = 5 * 60 * 1000;
let cache: { lista: ObraSocialPublica[]; hasta: number } | null = null;

async function obrasSociales(signal?: AbortSignal): Promise<ObraSocialPublica[]> {
  if (cache && Date.now() < cache.hasta) return cache.lista;
  const lista = await listObrasSocialesPublicas(signal);
  cache = { lista, hasta: Date.now() + CACHE_MS };
  return lista;
}

/**
 * La obra social cuyo nombre contiene la consulta, o está contenido en ella
 * («sancor salud» encuentra «SANCOR»). Los nombres de menos de 3 letras se
 * ignoran: con siglas cortas cualquier mensaje daba un falso positivo.
 */
function buscarPorNombre(lista: ObraSocialPublica[], consulta: string): ObraSocialPublica | undefined {
  const q = normalizar(consulta);
  return lista.find((os) => {
    const nombre = normalizar(os.nombre);
    if (nombre.length < 3) return false;
    return nombre.includes(q) || (q.includes(nombre) && nombre.length >= 4);
  });
}

export interface ResultadoConvenio {
  found: boolean;
  name: string | null;
}

/** ¿Hay convenio con esta obra social? `null` si no se pudo consultar. */
export async function checkObraSocial(consulta: string, signal?: AbortSignal): Promise<ResultadoConvenio | null> {
  if (normalizar(consulta).length < 2) return { found: false, name: null };
  try {
    const match = buscarPorNombre(await obrasSociales(signal), consulta);
    return { found: Boolean(match), name: match?.nombre ?? null };
  } catch {
    return null;
  }
}
