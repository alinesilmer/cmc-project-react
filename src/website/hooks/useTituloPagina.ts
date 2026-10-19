import { useEffect } from "react";

const BASE = "Colegio Médico de Corrientes";

/** Título de la pestaña para una página del sitio. */
export function useTituloPagina(titulo: string): void {
  useEffect(() => {
    document.title = titulo ? `${titulo} | ${BASE}` : BASE;
    return () => {
      document.title = BASE;
    };
  }, [titulo]);
}
