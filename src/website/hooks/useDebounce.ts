import { useEffect, useState } from "react";

/** El valor, pero recién cuando dejó de cambiar durante `ms`. */
export function useDebounce<T>(valor: T, ms = 180): T {
  const [demorado, setDemorado] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setDemorado(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return demorado;
}
