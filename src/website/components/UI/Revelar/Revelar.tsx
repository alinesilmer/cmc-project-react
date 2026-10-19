import { createElement, useEffect, useRef, useState } from "react";
import type React from "react";
import styles from "./Revelar.module.scss";

type Etiqueta = "div" | "section" | "article" | "aside" | "header" | "li" | "p" | "h1" | "h2" | "ul";

type Props = {
  children?: React.ReactNode;
  como?: Etiqueta;
  /** De dónde entra. `"nada"` = sólo aparece, sin moverse. */
  desde?: "abajo" | "izquierda" | "derecha" | "nada";
  /** Cuánto se desplaza, en px. */
  distancia?: number;
  retraso?: number;
  duracion?: number;
  /** `true` (default): anima cuando entra en pantalla, una sola vez. */
  alVerse?: boolean;
  className?: string;
  style?: React.CSSProperties;
  role?: string;
  id?: string;
  "aria-label"?: string;
};

/** La entrada animada del sitio. */
export default function Revelar({
  children,
  como = "div",
  desde = "abajo",
  distancia = 16,
  retraso = 0,
  duracion = 0.6,
  alVerse = true,
  className,
  style,
  ...resto
}: Props) {
  const ref = useRef<HTMLElement>(null);
  // Lo que anima al montarse arranca visto: la animación de CSS corre sola.
  const [visto, setVisto] = useState(!alVerse);

  useEffect(() => {
    if (!alVerse) return;
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setVisto(true);
      return;
    }
    // Una sola vez, y recién cuando asoma 60px dentro de la pantalla.
    const obs = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisto(true);
          obs.disconnect();
        }
      },
      { rootMargin: "-60px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [alVerse]);

  const x = desde === "izquierda" ? -distancia : desde === "derecha" ? distancia : 0;
  const y = desde === "abajo" ? distancia : 0;

  return createElement(
    como,
    {
      ...resto,
      ref,
      className: `${styles.revelar} ${visto ? styles.visto : ""} ${className ?? ""}`,
      style: {
        ...style,
        "--rv-x": `${x}px`,
        "--rv-y": `${y}px`,
        "--rv-dur": `${duracion}s`,
        "--rv-retraso": `${retraso}s`,
      } as React.CSSProperties,
    },
    children
  );
}
