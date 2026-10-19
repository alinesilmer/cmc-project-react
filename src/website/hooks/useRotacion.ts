import { useEffect, useState } from "react";

/** Índice que avanza cada `cadaMs` sobre `cantidad` elementos; quieto con la pestaña oculta o con «reducir movimiento». */
export function useRotacion(cantidad: number, cadaMs: number): number {
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    if (cantidad < 2) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let temporizador: number | undefined;
    const arrancar = () => {
      if (temporizador === undefined) {
        temporizador = window.setInterval(() => setIndice((i) => (i + 1) % cantidad), cadaMs);
      }
    };
    const parar = () => {
      window.clearInterval(temporizador);
      temporizador = undefined;
    };
    const alCambiarVisibilidad = () => (document.hidden ? parar() : arrancar());

    arrancar();
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    return () => {
      parar();
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
    };
  }, [cantidad, cadaMs]);

  return indice;
}
