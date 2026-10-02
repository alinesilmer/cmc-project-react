import { useEffect } from "react";

const BASE = "Colegio Médico de Corrientes";

/**
 * Título de la pestaña para una página del sitio.
 *
 * El sitio es una SPA: sin esto el `<title>` queda con el de la página
 * anterior, que además es el nombre con el que se guarda el favorito y el que
 * leen los buscadores y quien comparte el enlace.
 *
 * Al desmontar vuelve al nombre del Colegio en lugar de dejar el último que se
 * haya puesto, para que una ruta sin título propio no herede el ajeno.
 */
export function useTituloPagina(titulo: string): void {
  useEffect(() => {
    document.title = titulo ? `${titulo} | ${BASE}` : BASE;
    return () => {
      document.title = BASE;
    };
  }, [titulo]);
}
