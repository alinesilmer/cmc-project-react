import { formatoPesos } from "@/app/shared/lib/formatos";
// Formateo compartido por las pantallas de importación.

export const moneda = formatoPesos;

/** "202608" → "08/2026". El período se guarda pegado y se lee separado. */
export const periodoLegible = (p: string): string =>
  p.length === 6 ? `${p.slice(4, 6)}/${p.slice(0, 4)}` : p;

/** "2026-08-18" → "18/08/2026". El backend devuelve la fecha en ISO. */
export const fechaLegible = (iso: string | null): string => {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso || "—";
};
