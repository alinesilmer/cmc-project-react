import { useEffect, useMemo } from "react";

/**
 * URL temporal para previsualizar un archivo elegido, liberada cuando el
 * archivo cambia o el componente se desmonta. Sin el `revoke` cada imagen
 * elegida quedaba ocupando memoria hasta cerrar la pestaña.
 */
export function useVistaPrevia(archivo: File | null): string {
  const url = useMemo(() => (archivo ? URL.createObjectURL(archivo) : ""), [archivo]);
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);
  return url;
}
