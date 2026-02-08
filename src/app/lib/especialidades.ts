
function normalizeText(v: any): string {
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function safeStr(v: any) {
  return v === null || v === undefined ? "" : String(v);
}

function coerceToStringArray(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => safeStr(x));
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return [];
    if (/[;,|]/.test(s)) return s.split(/[;,|]/g).map((x) => x.trim());
    return [s];
  }
  return [safeStr(v)];
}

function cleanEspecialidades(arr: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of arr) {
    const t = safeStr(raw).trim();
    if (!t) continue;
    if (t === "0") continue;

    const key = normalizeText(t);
    if (!key) continue;
    if (seen.has(key)) continue;

    seen.add(key);
    out.push(t);
  }
  return out;
}

function stripMedicoWhenMultiple(list: string[]): string[] {
  if (list.length <= 1) return list;
  const filtered = list.filter((x) => normalizeText(x) !== "medico");
  return filtered.length ? filtered : list;
}

/**
 * Reglas:
 * - Si llega “Sin especialidad” (o vacío) => ["médico"]
 * - Si hay más de 1 especialidad y una es “médico” => quitar “médico”
 * - Soporta ESPECIALIDADES/especialidades (array o string) y especialidad single
 */
export function getEspecialidadesList(row: any): string[] {
  const raw =
    row?.ESPECIALIDADES ??
    row?.especialidades ??
    row?.ESPECIALIDAD ??
    row?.especialidad ??
    row?.especialidad_nombre ??
    row?.ESPECIALIDAD_NOMBRE ??
    null;

  let list = cleanEspecialidades(coerceToStringArray(raw));

  const hasSin = list.some((t) => {
    const n = normalizeText(t);
    return n === "sin especialidad" || n === "sinespecialidad";
  });

  if (hasSin || list.length === 0) list = ["médico"];

  return stripMedicoWhenMultiple(list);
}

export function formatEspecialidades(row: any, max = 999): string {
  const list = getEspecialidadesList(row);
  return list.slice(0, max).join(" | ");
}
