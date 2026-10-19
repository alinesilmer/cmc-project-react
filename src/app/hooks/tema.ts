import { useSyncExternalStore } from "react";

/** El tema del panel (claro u oscuro). */
export type Tema = "claro" | "oscuro";

const CLAVE = "cmc:tema";

function leerGuardado(): Tema {
  try {
    return window.localStorage.getItem(CLAVE) === "oscuro" ? "oscuro" : "claro";
  } catch {
    return "claro";
  }
}

let tema: Tema = leerGuardado();
const suscriptores = new Set<() => void>();

function suscribir(suscriptor: () => void): () => void {
  suscriptores.add(suscriptor);
  return () => suscriptores.delete(suscriptor);
}

export function elegirTema(siguiente: Tema): void {
  if (siguiente === tema) return;
  tema = siguiente;
  try {
    window.localStorage.setItem(CLAVE, siguiente);
  } catch {
    // Sin almacenamiento la elección dura lo que dura la pestaña.
  }
  suscriptores.forEach((s) => s());
}

export function useTema(): Tema {
  return useSyncExternalStore(suscribir, () => tema);
}

/** El oscuro depende de `light-dark()` (Chrome y Edge 123, Firefox 120, Safari 17.5). */
export const TEMA_OSCURO_DISPONIBLE =
  typeof CSS !== "undefined" && CSS.supports("color", "light-dark(#000, #fff)");
