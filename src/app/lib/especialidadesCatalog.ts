// src/app/lib/especialidadesCatalog.ts
export type EspecialidadOption = { value: string; label: string };

const map = new Map<string, string>();

export function setEspecialidadesCatalog(list: EspecialidadOption[]) {
  map.clear();
  for (const it of list ?? []) {
    const id = String(it.value ?? "").trim();
    const name = String(it.label ?? "").trim();
    if (!id || id === "0") continue;
    if (!name) continue;
    map.set(id, name);
  }
}

export function hasEspecialidadesCatalog(): boolean {
  return map.size > 0;
}

export function getEspecialidadNameById(id: any): string | null {
  const key = String(id ?? "").trim();
  if (!key || key === "0") return null;
  return map.get(key) ?? null;
}
