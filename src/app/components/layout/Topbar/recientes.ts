// Pantallas abiertas hace poco, para el buscador (sólo en este navegador).

const CLAVE_RECIENTES = "cmc:pantallas-recientes";
const MAX_RECIENTES = 5;

export function leerRecientes(): string[] {
  try {
    const crudo = JSON.parse(localStorage.getItem(CLAVE_RECIENTES) ?? "[]");
    return Array.isArray(crudo) ? crudo.filter((p): p is string => typeof p === "string") : [];
  } catch {
    return [];
  }
}

/** Anota la pantalla abierta al frente de las recientes. */
export function anotarReciente(path: string) {
  try {
    const lista = [path, ...leerRecientes().filter((p) => p !== path)].slice(0, MAX_RECIENTES);
    localStorage.setItem(CLAVE_RECIENTES, JSON.stringify(lista));
  } catch {
    /* Sin almacenamiento: no hay recientes, el buscador igual funciona. */
  }
}
