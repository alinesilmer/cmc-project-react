import { useCallback, useEffect, useRef, useState, type PointerEvent as PointerReact } from "react";

import type { Estado } from "./tablero.types";

export type Destino = { estado: Estado; indice: number };
export type Gesto = { id: string; x: number; y: number; ancho: number };

type Origen = { id: string; x0: number; y0: number; dx: number; dy: number; ancho: number };

const UMBRAL = 5;

/** La columna bajo el puntero y el lugar que le toca entre sus tarjetas (sin contar la que se mueve). */
function destinoEn(x: number, y: number, id: string): Destino | null {
  for (const col of document.querySelectorAll<HTMLElement>("[data-estado]")) {
    const r = col.getBoundingClientRect();
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
    let indice = 0;
    for (const t of col.querySelectorAll<HTMLElement>("[data-tarjeta]")) {
      if (t.dataset.tarjeta === id) continue;
      const c = t.getBoundingClientRect();
      if (y > c.top + c.height / 2) indice++;
    }
    return { estado: col.dataset.estado as Estado, indice };
  }
  return null;
}

/** Arrastre de tarjetas con el puntero: con mouse desde cualquier punto, con el dedo sólo desde el asa. */
export function useArrastre(onSoltar: (id: string, destino: Destino) => void) {
  const [gesto, setGesto] = useState<Gesto | null>(null);
  const [destino, setDestino] = useState<Destino | null>(null);
  const soltar = useRef(onSoltar);
  const limpiar = useRef<(() => void) | null>(null);
  const recienArrastrada = useRef(false);

  useEffect(() => {
    soltar.current = onSoltar;
  }, [onSoltar]);

  useEffect(() => () => limpiar.current?.(), []);

  const iniciar = useCallback((e: PointerReact<HTMLElement>, id: string) => {
    if (e.button !== 0 || limpiar.current) return;
    if ((e.target as HTMLElement).closest("button, a, input, select, textarea")) return;
    const tactil = e.pointerType !== "mouse";
    if (tactil && !(e.target as HTMLElement).closest("[data-asa]")) return;

    const caja = e.currentTarget.getBoundingClientRect();
    const o: Origen = { id, x0: e.clientX, y0: e.clientY, dx: e.clientX - caja.left, dy: e.clientY - caja.top, ancho: caja.width };
    let activo = false;
    let ultimo: Destino | null = null;

    const mover = (ev: PointerEvent) => {
      if (!activo) {
        if (Math.hypot(ev.clientX - o.x0, ev.clientY - o.y0) < UMBRAL) return;
        activo = true;
        document.body.style.userSelect = "none";
      }
      setGesto({ id, x: ev.clientX - o.dx, y: ev.clientY - o.dy, ancho: o.ancho });
      ultimo = destinoEn(ev.clientX, ev.clientY, id);
      setDestino(ultimo);
    };

    const terminar = (ev: PointerEvent) => {
      limpiar.current?.();
      if (activo && ev.type === "pointerup" && ultimo) soltar.current(id, ultimo);
      if (activo) {
        recienArrastrada.current = true;
        setTimeout(() => {
          recienArrastrada.current = false;
        }, 0);
      }
    };

    limpiar.current = () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", terminar);
      window.removeEventListener("pointercancel", terminar);
      document.body.style.userSelect = "";
      limpiar.current = null;
      setGesto(null);
      setDestino(null);
    };

    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", terminar);
    window.addEventListener("pointercancel", terminar);
  }, []);

  /** El clic que cierra un arrastre no debe abrir la tarjeta. */
  const vinoDeArrastre = useCallback(() => recienArrastrada.current, []);

  return { gesto, destino, iniciar, vinoDeArrastre };
}
