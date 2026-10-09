import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

// Posición del listado al salir hacia la carga (editar una prestación, replicar, ir a la
// carga de facturación) y vuelta al mismo lugar al regresar. `sessionStorage`: dura lo que la
// pestaña y no se mezcla entre facturas (una clave por factura).
const CLAVE = (idFactura: string) => `facturacion:listado-posicion:${idFactura}`;
// Pasado este tiempo la posición guardada ya no se considera "volver": es otra visita.
const VIGENCIA_MS = 30 * 60 * 1000;
// Tope de intentos de ajuste (uno por cuadro) y tiempo máximo con la pantalla oculta.
const MAX_AJUSTES = 40;
const MAX_OCULTA_MS = 3000;
const DURACION_RESALTADO_MS = 3400;
const RUTA_CARGA = "/panel/facturacion/carga";
// Edición en la capa (el listado no se desmonta): la fila titila recién cuando la capa
// terminó de irse, no por debajo de ella.
const ESPERA_CIERRE_MS = 260;
const MAX_ESPERA_RECARGA = 200; // intentos de ~16 ms

interface Posicion {
  y: number;
  /** Fila que se estaba editando (ancla): se la deja en el mismo lugar de la ventana. */
  filaId: number | null;
  /** Distancia de esa fila al borde superior de la ventana al salir. */
  offset: number | null;
  t: number;
}

const leer = (idFactura: string | undefined): Posicion | null => {
  if (!idFactura) return null;
  try {
    const crudo = sessionStorage.getItem(CLAVE(idFactura));
    if (!crudo) return null;
    const p = JSON.parse(crudo) as Posicion;
    return typeof p.y === "number" && Date.now() - p.t < VIGENCIA_MS ? p : null;
  } catch {
    return null;
  }
};

const guardar = (idFactura: string, p: Posicion) => {
  try { sessionStorage.setItem(CLAVE(idFactura), JSON.stringify(p)); } catch { /* sin storage */ }
};

const borrar = (idFactura: string | undefined) => {
  if (!idFactura) return;
  try { sessionStorage.removeItem(CLAVE(idFactura)); } catch { /* sin storage */ }
};

const filaDe = (filaId: number): HTMLElement | null =>
  document.querySelector<HTMLElement>(`[data-prestacion-id="${filaId}"]`);

const sinAnimacion = (top: number) => window.scrollBy({ top, behavior: "instant" as ScrollBehavior });

/** Deja la fila a la vista (si quedó afuera) y la hace titilar (`tr[data-resaltada]`). */
const destacar = (fila: HTMLElement) => {
  const r = fila.getBoundingClientRect();
  if (r.bottom < 0 || r.top > window.innerHeight) fila.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
  delete fila.dataset.resaltada;
  void fila.offsetWidth; // reinicia la animación si ya estaba titilando
  fila.dataset.resaltada = "";
  window.setTimeout(() => { delete fila.dataset.resaltada; }, DURACION_RESALTADO_MS);
};

// Mientras la capa de edición está abierta la fila no titila: no se vería.
const capaAbierta = () => document.documentElement.classList.contains("capa-carga-abierta");

/**
 * Vuelve el listado a donde estaba. Mientras se calcula la posición el contenido queda oculto
 * (`restaurando`), así que no se ve el salto: aparece ya en su lugar. Después la fila que se
 * estaba editando titila.
 *
 * - `listo`: el listado ya se dibujó completo (datos y grupos).
 * - `hayError`: no hay nada que restaurar.
 * - `recordarFila(id)`: llamar antes de navegar a editar; `null` para replicar/otra salida.
 * - `resaltarFila(id, recarga)`: edición en la capa (el listado sigue montado). Cuando
 *   `recarga` termina y el listado se volvió a dibujar, la fila queda en el mismo lugar
 *   de la ventana y titila.
 */
export function useRestaurarPosicion(
  idFactura: string | undefined, listo: boolean, hayError: boolean,
) {
  const [restaurando, setRestaurando] = useState(() => leer(idFactura) !== null);
  const ultimaY = useRef(0);
  const ancla = useRef<{ filaId: number; offset: number } | null>(null);
  const listoRef = useRef(listo);
  useLayoutEffect(() => { listoRef.current = listo; }, [listo]);
  // Fila a sostener en su lugar mientras el listado se recarga (edición en la capa).
  const sostener = useRef<{ filaId: number; offset: number } | null>(null);

  // En cada render (antes de pintar): si la recarga movió la fila, se compensa ya, así
  // nunca se ve el salto, ni con la capa abierta ni al cerrarse.
  useLayoutEffect(() => {
    const s = sostener.current;
    if (!s) return;
    const fila = filaDe(s.filaId);
    if (!fila) return;
    const diff = fila.getBoundingClientRect().top - s.offset;
    if (Math.abs(diff) > 1) sinAnimacion(diff);
  });

  // Dónde está el scroll en todo momento: al desmontar ya no se puede leer.
  useEffect(() => {
    const alScroll = () => { ultimaY.current = window.scrollY; };
    alScroll();
    window.addEventListener("scroll", alScroll, { passive: true });
    return () => window.removeEventListener("scroll", alScroll);
  }, []);

  // Al irse hacia la carga se guarda la posición; hacia cualquier otro lado, no.
  useEffect(() => () => {
    if (!idFactura || !window.location.pathname.startsWith(RUTA_CARGA)) return;
    guardar(idFactura, {
      y: ultimaY.current, filaId: ancla.current?.filaId ?? null, offset: ancla.current?.offset ?? null, t: Date.now(),
    });
  }, [idFactura]);

  const recordarFila = useCallback((filaId: number | null) => {
    const el = filaId != null ? filaDe(filaId) : null;
    ancla.current = filaId != null && el ? { filaId, offset: el.getBoundingClientRect().top } : null;
  }, []);

  useLayoutEffect(() => {
    if (!restaurando) return;
    if (hayError) { borrar(idFactura); setRestaurando(false); return; }
    if (!listo) return;
    const pos = leer(idFactura);
    if (!pos) { setRestaurando(false); return; }

    let cancelado = false;
    let estables = 0;
    let intentos = 0;
    let cuadro = 0;

    const terminar = () => {
      if (cancelado) return;
      cancelado = true;
      window.clearTimeout(tope);
      cancelAnimationFrame(cuadro);
      borrar(idFactura);
      setRestaurando(false);
      const fila = pos.filaId != null ? filaDe(pos.filaId) : null;
      if (fila) destacar(fila);
    };

    // Las filas fuera de pantalla se miden de forma aproximada hasta que se dibujan, así que
    // el alto de la página cambia mientras se asienta: se corrige cuadro a cuadro hasta que
    // la posición queda quieta.
    const ajustar = () => {
      if (cancelado) return;
      const fila = pos.filaId != null ? filaDe(pos.filaId) : null;
      const diff = fila && pos.offset != null
        ? fila.getBoundingClientRect().top - pos.offset
        : pos.y - window.scrollY;
      if (Math.abs(diff) > 1) { sinAnimacion(diff); estables = 0; } else { estables += 1; }
      intentos += 1;
      if (estables >= 3 || intentos >= MAX_AJUSTES) terminar();
      else cuadro = requestAnimationFrame(ajustar);
    };

    const tope = window.setTimeout(terminar, MAX_OCULTA_MS);
    ajustar(); // en el layout effect: antes de pintar
    return () => {
      cancelado = true;
      window.clearTimeout(tope);
      cancelAnimationFrame(cuadro);
    };
  }, [restaurando, listo, hayError, idFactura]);

  const resaltarFila = useCallback((filaId: number, recarga: Promise<unknown>) => {
    const antes = filaDe(filaId);
    sostener.current = antes ? { filaId, offset: antes.getBoundingClientRect().top } : null;
    const desde = Date.now();
    void recarga.finally(() => {
      let intentos = 0;
      const paso = () => {
        intentos += 1;
        const esperar = !listoRef.current || capaAbierta() || Date.now() - desde < ESPERA_CIERRE_MS;
        if (esperar && intentos < MAX_ESPERA_RECARGA) { window.setTimeout(paso, 16); return; }
        sostener.current = null;
        const fila = filaDe(filaId);
        if (fila) destacar(fila);
      };
      // Un respiro para que el listado arranque a dibujarse con los datos nuevos.
      window.setTimeout(paso, 50);
    });
  }, []);

  return { restaurando, recordarFila, resaltarFila };
}
