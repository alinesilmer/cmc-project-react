/**
 * Color de texto legible sobre un fondo `#RRGGBB`: oscuro sobre colores claros
 * y blanco sobre los oscuros. Sirve para los colores que elige quien carga el
 * contenido (el acento de un beneficio), que pueden ser cualquiera.
 */
export function textoSobre(hex: string | null | undefined, oscuro = "#14233a", claro = "#ffffff"): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? "");
  if (!m) return claro;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  // Luminancia relativa (WCAG). Por encima de ~0,45 el blanco ya no contrasta.
  const luminancia = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminancia > 0.45 ? oscuro : claro;
}
