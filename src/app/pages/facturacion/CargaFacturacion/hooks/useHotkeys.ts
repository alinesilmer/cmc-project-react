import { useEffect, useRef } from "react";

/** Atajos a nivel ventana. */
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
