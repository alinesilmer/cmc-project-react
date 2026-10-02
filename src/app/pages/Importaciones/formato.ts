// Formateo compartido por las pantallas de importación.
//
// Vive aparte de `PanelImportacion.tsx` porque ese archivo sólo puede exportar
// componentes: mezclar constantes rompe el fast refresh del dev server.

export const moneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
});

/** "202608" → "08/2026". El período se guarda pegado y se lee separado. */
export const periodoLegible = (p: string): string =>
  p.length === 6 ? `${p.slice(4, 6)}/${p.slice(0, 4)}` : p;

/** "2026-08-18" → "18/08/2026". El backend devuelve la fecha en ISO. */
export const fechaLegible = (iso: string | null): string => {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso || "—";
};
