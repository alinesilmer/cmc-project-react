import { useEffect, useState } from "react";

/**
 * Devuelve el valor recién cuando dejó de cambiar por `ms`.
 *
 * Se usa para los buscadores: el input se actualiza en cada tecla (se siente
 * instantáneo) pero la query al servidor sale una sola vez cuando el usuario
 * frena. Sin esto, escribir "consulta" dispara ocho consultas agregadas sobre
 * `detalle_facturacion`, siete de las cuales se descartan.
 */
export function useDebounce<T>(valor: T, ms = 350): T {
  const [diferido, setDiferido] = useState(valor);

  useEffect(() => {
    const t = setTimeout(() => setDiferido(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);

  return diferido;
}
