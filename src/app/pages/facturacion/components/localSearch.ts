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
  // Campos del ítem en orden de PRIORIDAD: el primer campo que matchea define el
  // grupo (ej. [cod, matricula, nombre] pone socio antes que matrícula, y esa antes
  // que nombre). Dentro de un mismo campo desempata la CALIDAD del match: una
  // coincidencia exacta va antes que una "empieza con", y esa antes que un "contiene".
  getFields: (item: T) => Array<string | number | null | undefined>,
  maxResults = 50,
): T[] {
  const needle = q.toLowerCase();
  const scored: Array<{ item: T; score: number }> = [];
  for (const item of items) {
    const fields = getFields(item);
    let best = Infinity;
    for (let i = 0; i < fields.length; i++) {
      const v = fields[i];
      if (v == null || v === "") continue;
      const s = String(v).toLowerCase();
      const pos = s.indexOf(needle);
      if (pos === -1) continue;
      // Calidad dentro del campo: 0 = exacto, 1 = empieza con, 2 = contiene.
      const calidad = s === needle ? 0 : pos === 0 ? 1 : 2;
      // El campo (prioridad) manda; a igual campo, gana la mejor calidad. Así,
      // buscando "824", el socio 824 (exacto) queda antes que 2824/9824 (contiene).
      const score = i * 10 + calidad;
      if (score < best) best = score;
    }
    if (best !== Infinity) scored.push({ item, score: best });
  }
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, maxResults).map((s) => s.item);
}
