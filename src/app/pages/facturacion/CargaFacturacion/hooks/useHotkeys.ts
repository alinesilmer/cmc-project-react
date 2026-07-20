import { useEffect, useRef } from "react";

/**
 * Atajos a nivel ventana.
 *
 * El handler se lee desde un ref en cada evento, así el listener se registra una sola
 * vez (deps `[]`) pero siempre ve el estado fresco. Registrarlo en cada render también
 * funciona —era lo que se hacía antes— pero agrega y quita un listener por tecleo.
 */
export function useHotkeys(handler: (e: KeyboardEvent) => void): void {
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    const h = (e: KeyboardEvent) => ref.current(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
}

/** Ctrl en Windows/Linux, Cmd en Mac. */
export const isMod = (e: KeyboardEvent): boolean => e.ctrlKey || e.metaKey;

/** Hay algún modal abierto (los atajos del formulario no deben dispararse detrás). */
export const isModalOpen = (): boolean =>
  document.querySelector('[role="dialog"]') !== null;
