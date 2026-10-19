import { useSyncExternalStore } from "react";

/**
 * Una preferencia del panel guardada en el navegador: un valor de una lista cerrada.
 * Lo guardado nunca se confía: si no está en `valores`, se usa `porDefecto`.
 * `aplicar` corre al cargar y en cada cambio, fuera de React (para marcar la raíz sin re-renderizar el panel).
 */
export function crearPreferencia<T extends string>(
  clave: string,
  valores: readonly T[],
  porDefecto: T,
  aplicar?: (valor: T) => void,
) {
  const permitido = (v: unknown): v is T => typeof v === "string" && (valores as readonly string[]).includes(v);

  function leerGuardado(): T {
    try {
      const guardado = window.localStorage.getItem(clave);
      return permitido(guardado) ? guardado : porDefecto;
    } catch {
      return porDefecto;
    }
  }

  let actual = leerGuardado();
  const suscriptores = new Set<() => void>();

  function suscribir(suscriptor: () => void): () => void {
    suscriptores.add(suscriptor);
    return () => suscriptores.delete(suscriptor);
  }

  if (typeof document !== "undefined") aplicar?.(actual);

  function elegir(siguiente: T): void {
    if (!permitido(siguiente) || siguiente === actual) return;
    actual = siguiente;
    try {
      window.localStorage.setItem(clave, siguiente);
    } catch {
      // Sin almacenamiento la elección dura lo que dura la pestaña.
    }
    aplicar?.(actual);
    suscriptores.forEach((s) => s());
  }

  function useValor(): T {
    return useSyncExternalStore(suscribir, () => actual);
  }

  return { elegir, useValor, leer: () => actual };
}
