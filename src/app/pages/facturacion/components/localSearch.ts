// Saca duplicados por id preservando el primero.
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

// Filtro + orden en memoria compartido por los autocompletes con lista precargada (médico/socio, obra social, clínica).
export function filtrarYOrdenar<T>(
  items: T[],
  q: string,
  // Campos del ítem en orden de PRIORIDAD: el primer campo que matchea define el grupo (ej. [cod, matricula, nombre] pone socio antes que matrícula.
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
      // El campo (prioridad) manda; a igual campo, gana la mejor calidad.
      const score = i * 10 + calidad;
      if (score < best) best = score;
    }
    if (best !== Infinity) scored.push({ item, score: best });
  }
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, maxResults).map((s) => s.item);
}
