/** Búsqueda de texto del sitio: sin acentos, sin mayúsculas y sin signos, así «cardiologia» encuentra «Cardiología» y «Ramirez» a «Ramírez». */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** `true` si todas las palabras de `busqueda` aparecen en alguno de los `campos`, en cualquier orden. */
export function coincide(
  busqueda: string,
  campos: ReadonlyArray<string | null | undefined>
): boolean {
  const q = normalizar(busqueda);
  if (!q) return true;
  const heno = normalizar(campos.filter(Boolean).join(" "));
  return q.split(" ").every((palabra) => heno.includes(palabra));
}

/** Minutos que lleva leer un texto, a unas 200 palabras por minuto; nunca menos de 1. */
export function minutosDeLectura(texto: string): number {
  const palabras = texto.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(palabras / 200));
}
