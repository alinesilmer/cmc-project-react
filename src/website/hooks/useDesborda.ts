import { useEffect, useRef, useState } from "react";

/**
 * `true` si el texto de un elemento recortado (`line-clamp` o `ellipsis`) no entra.
 * Se vuelve a medir cuando cambia el tamaño (otra columna, otro celular).
 */
export function useDesborda<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [desborda, setDesborda] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () =>
      setDesborda(el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1);
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, desborda };
}
