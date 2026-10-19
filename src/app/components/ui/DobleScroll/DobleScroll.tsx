import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import s from "./DobleScroll.module.scss";

type Props = {
  /** Clase del contenedor que desliza (bordes, fondo, sombra de la tabla). */
  className?: string;
  children: ReactNode;
};

/** Contenedor con desplazamiento horizontal y una segunda barra arriba, sincronizada con la de abajo. */
export default function DobleScroll({ className, children }: Props) {
  const arribaRef = useRef<HTMLDivElement | null>(null);
  const cuerpoRef = useRef<HTMLDivElement | null>(null);
  const [ancho, setAncho] = useState(0);
  const [desborda, setDesborda] = useState(false);

  useEffect(() => {
    const cuerpo = cuerpoRef.current;
    if (!cuerpo) return;

    const medir = () => {
      setAncho(cuerpo.scrollWidth);
      setDesborda(cuerpo.scrollWidth > cuerpo.clientWidth + 1);
    };
    medir();

    // Cambia al redimensionar la ventana y al sumar o quitar columnas.
    const observador = new ResizeObserver(medir);
    observador.observe(cuerpo);
    if (cuerpo.firstElementChild) observador.observe(cuerpo.firstElementChild);
    return () => observador.disconnect();
  }, [children]);

  // Cada barra copia su posición a la otra.
  const alMoverArriba = useCallback(() => {
    if (cuerpoRef.current && arribaRef.current) cuerpoRef.current.scrollLeft = arribaRef.current.scrollLeft;
  }, []);
  const alMoverCuerpo = useCallback(() => {
    if (cuerpoRef.current && arribaRef.current) arribaRef.current.scrollLeft = cuerpoRef.current.scrollLeft;
  }, []);

  return (
    <>
      {desborda && (
        <div ref={arribaRef} className={s.arriba} onScroll={alMoverArriba} aria-hidden="true">
          <div style={{ width: ancho }} className={s.relleno} />
        </div>
      )}
      <div ref={cuerpoRef} className={`${s.cuerpo} ${className ?? ""}`} onScroll={alMoverCuerpo}>
        {children}
      </div>
    </>
  );
}
