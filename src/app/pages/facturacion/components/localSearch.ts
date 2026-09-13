// Saca duplicados por id preservando el primero. Hay datos legacy (ver
// `listado_medico`) con la misma fila cargada dos veces bajo el mismo NRO_SOCIO — sin
// esto, el Autocomplete termina con dos <li> de la misma key y React puede mezclar su
// contenido entre renders al filtrar (llega a mostrar una fila de un match viejo).
export function dedupePorId<T>(items: T[], getId: (item: T) => string | number): T[] {
  const vistos = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const id = String(getId(item));
    if (vistos.has(id)) continue;
    vistos.add(id);
    out.push(item);
  }
  return out;
}

// Filtro + orden en memoria compartido por los autocompletes con lista precargada
// (médico/socio, obra social, clínica). MUI Autocomplete no virtualiza su listado —
// renderizar miles de <li> sin recortar es lo que se sentía "lageado" al tipear en el
// campo de socio (~4500 filas). Cortar a `maxResults` resuelve eso sin tocar la
// precarga completa que se muestra al hacer click con el campo vacío (esa sí sin tope).
export function filtrarYOrdenar<T>(
  items: T[],
  q: string,
  // Campos del ítem en orden de PRIORIDAD (el primero que matchea gana el ranking):
  // ej. [matricula, nombre, cod] para que una coincidencia de matrícula quede antes
  // que una de nombre, y esa antes que una de nro de socio.
  getFields: (item: T) => Array<string | number | null | undefined>,
  maxResults = 50,
): T[] {
  const needle = q.toLowerCase();
  const scored: Array<{ item: T; rank: number }> = [];
  for (const item of items) {
    const fields = getFields(item);
    let rank = -1;
    for (let i = 0; i < fields.length; i++) {
      const v = fields[i];
      if (v == null || v === "") continue;
      if (String(v).toLowerCase().includes(needle)) { rank = i; break; }
    }
    if (rank !== -1) scored.push({ item, rank });
  }
  scored.sort((a, b) => a.rank - b.rank);
  return scored.slice(0, maxResults).map((s) => s.item);
}
