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
