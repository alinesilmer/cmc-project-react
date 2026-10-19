import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import s from "./Carrusel.module.scss";

interface Props {
  children: ReactNode;
  /** Qué se está recorriendo, para quien navega con lector de pantalla. */
  etiqueta: string;
}

/** Pista horizontal con anclaje y botones de avance. */
export default function Carrusel({ children, etiqueta }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [alInicio, setAlInicio] = useState(true);
  const [alFinal, setAlFinal] = useState(true);

  const medir = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // 1px de tolerancia: con zoom o pantallas HiDPI el scroll no cierra exacto.
    const resto = el.scrollWidth - el.clientWidth - el.scrollLeft;
    setAlInicio(el.scrollLeft <= 1);
    setAlFinal(resto <= 1);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    medir();
    el.addEventListener("scroll", medir, { passive: true });

    // El ancho útil cambia con la ventana y también cuando termina de cargar el contenido, así que se observa el elemento y no sólo `resize`.
    const observer = new ResizeObserver(medir);
    observer.observe(el);

    return () => {
      el.removeEventListener("scroll", medir);
      observer.disconnect();
    };
  }, [medir, children]);

  /** Avanza o retrocede una pantalla, dejando una tarjeta de solape. */
  const mover = (signo: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const paso = Math.max(el.clientWidth * 0.8, 240);
    el.scrollBy({ left: signo * paso, behavior: "smooth" });
  };

  // Con todo a la vista no hay nada que recorrer: los botones sobran.
  const hayDesborde = !(alInicio && alFinal);

  return (
    <div className={s.wrap}>
      <div
        ref={ref}
        className={s.track}
        role="region"
        aria-label={etiqueta}
        tabIndex={0}
      >
        {children}
      </div>

      {hayDesborde && (
        <div className={s.controles}>
          <button
            type="button"
            className={s.boton}
            onClick={() => mover(-1)}
            disabled={alInicio}
            aria-label="Anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className={s.boton}
            onClick={() => mover(1)}
            disabled={alFinal}
            aria-label="Siguiente"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
