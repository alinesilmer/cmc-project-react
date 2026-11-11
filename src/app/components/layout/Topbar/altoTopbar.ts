import { useEffect, useState } from "react";

// El Topbar mide distinto según el ancho (fila de la marca + fila de solapas, o sólo la primera en pantallas
// chicas) y puede cambiar de diseño: en vez de que cada pantalla hardcodee su alto, lo publica acá como una
// variable CSS. Las pantallas con piezas pegadas debajo de la barra (sticky/fixed) usan `var(--alto-topbar)`.
export const VAR_ALTO_TOPBAR = "--alto-topbar";
const EVENTO_ALTO_TOPBAR = "cmc:alto-topbar";
// Sólo si la variable todavía no existe (el Topbar no llegó a montarse): alto de escritorio.
export const ALTO_TOPBAR_POR_DEFECTO = 133;

/** Alto actual del Topbar, en px. */
export const leerAltoTopbar = (): number => {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(VAR_ALTO_TOPBAR));
  return Number.isFinite(v) && v > 0 ? v : ALTO_TOPBAR_POR_DEFECTO;
};

/** Lo usa el Topbar: publica el alto de su elemento y lo mantiene al día cuando cambia. Devuelve la función de limpieza. */
export function publicarAltoTopbar(el: HTMLElement): () => void {
  const publicar = () => {
    const alto = el.getBoundingClientRect().height;
    document.documentElement.style.setProperty(VAR_ALTO_TOPBAR, `${alto}px`);
    window.dispatchEvent(new Event(EVENTO_ALTO_TOPBAR));
  };
  publicar();
  if (typeof ResizeObserver === "undefined") {
    window.addEventListener("resize", publicar);
    return () => { window.removeEventListener("resize", publicar); };
  }
  const obs = new ResizeObserver(publicar);
  obs.observe(el);
  return () => {
    obs.disconnect();
    document.documentElement.style.removeProperty(VAR_ALTO_TOPBAR);
  };
}

/** Alto del Topbar en px, para lo que no se puede resolver sólo con CSS (p. ej. el `rootMargin` de un IntersectionObserver). */
export function useAltoTopbar(): number {
  const [alto, setAlto] = useState(leerAltoTopbar);
  useEffect(() => {
    const actualizar = () => setAlto(leerAltoTopbar());
    actualizar();
    window.addEventListener(EVENTO_ALTO_TOPBAR, actualizar);
    return () => window.removeEventListener(EVENTO_ALTO_TOPBAR, actualizar);
  }, []);
  return alto;
}
