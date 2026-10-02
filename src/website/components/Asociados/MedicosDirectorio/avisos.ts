import type { PubAd } from "../../../lib/ads.client";

/** El nombre a mostrar; si el aviso no lo trae, el id del médico. */
export const nombreDe = (ad: PubAd): string => ad.medico_nombre?.trim() || `Médico #${ad.medico_id}`;

/** Las iniciales del círculo: la primera letra de las dos primeras palabras. */
export function iniciales(nombre: string): string {
  const palabras = nombre.replace(/[^\p{L}\s]/gu, " ").split(/\s+/).filter(Boolean);
  return (palabras.slice(0, 2).map((p) => p[0]).join("") || "M").toUpperCase();
}
