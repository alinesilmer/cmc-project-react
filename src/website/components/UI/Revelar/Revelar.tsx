import type React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { EASE } from "../../../lib/motion";

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
  /**
   * `true` (default): anima cuando entra en pantalla, una sola vez.
   * `false`: anima apenas se monta (lo que está arriba de todo).
   */
  alVerse?: boolean;
  className?: string;
  style?: React.CSSProperties;
  role?: string;
  id?: string;
  "aria-label"?: string;
};

/**
 * La entrada animada del sitio. El mismo bloque —`initial`, `whileInView`,
 * `viewport`, `transition` y la curva— estaba copiado más de cuarenta veces
 * en diez archivos. Respeta «reducir movimiento» del sistema operativo.
 */
export default function Revelar({
  children,
  como = "div",
  desde = "abajo",
  distancia = 16,
  retraso = 0,
  duracion = 0.6,
  alVerse = true,
  ...resto
}: Props) {
  const reducido = useReducedMotion();
  const d = reducido ? 0 : distancia;
  const inicio = {
    opacity: 0,
    x: desde === "izquierda" ? -d : desde === "derecha" ? d : 0,
    y: desde === "abajo" ? d : 0,
  };
  const fin = { opacity: 1, x: 0, y: 0 };

  const Componente = motion[como] as typeof motion.div;
  const disparo = alVerse
    ? { whileInView: fin, viewport: { once: true, margin: "-60px" } }
    : { animate: fin };

  return (
    <Componente
      initial={inicio}
      {...disparo}
      transition={{ duration: duracion, ease: EASE, delay: retraso }}
      {...resto}
    >
      {children}
    </Componente>
  );
}
