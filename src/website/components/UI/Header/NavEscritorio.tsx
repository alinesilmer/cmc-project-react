import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { NAVEGACION, esActiva, type ItemNav } from "./navegacion";
import styles from "./NavEscritorio.module.scss";
import Button from "@/website/components/UI/Button/Button";

type Caja = { left: number; top: number; width: number; height: number };

/** Posición de `el` dentro de `contenedor`, en px de maquetado. */
function cajaDentroDe(el: HTMLElement, contenedor: HTMLElement): Caja {
  // Se suma `offsetLeft` subiendo por los `offsetParent` en vez de restar `getBoundingClientRect`.
  let left = 0;
  let top = 0;
  let nodo: HTMLElement | null = el;
  while (nodo && nodo !== contenedor) {
    left += nodo.offsetLeft;
    top += nodo.offsetTop;
    nodo = nodo.offsetParent as HTMLElement | null;
  }
  return { left, top, width: el.offsetWidth, height: el.offsetHeight };
}

/** El menú horizontal. La sección actual va sobre un fondo azul que se desliza al cambiar de página; «Servicios» abre una lista con íconos. */
export default function NavEscritorio() {
  const { pathname } = useLocation();
  const [abierto, setAbierto] = useState(false);

  const navRef = useRef<HTMLElement>(null);
  const activaRef = useRef<HTMLAnchorElement | null>(null);
  const [caja, setCaja] = useState<Caja | null>(null);
  // La primera vez se coloca sin animar: si no, entraría deslizándose desde la esquina al cargar la página.
  const [animar, setAnimar] = useState(false);

  const medir = useCallback(() => {
    const nav = navRef.current;
    const enlace = activaRef.current;
    // Con el menú oculto (pantallas medianas) no hay nada que medir.
    if (!nav || !enlace || nav.offsetWidth === 0) {
      setCaja(null);
      return;
    }
    setCaja(cajaDentroDe(enlace, nav));
  }, []);

  useLayoutEffect(() => {
    medir();

    const nav = navRef.current;
    if (!nav || !("ResizeObserver" in window)) return;
    // Hay que volver a medir cuando cambia el tamaño: al redimensionar la ventana y, sobre todo, cuando termina de cargar la tipografía.
    const obs = new ResizeObserver(medir);
    obs.observe(nav);
    for (const item of Array.from(nav.children)) obs.observe(item);
    return () => obs.disconnect();
  }, [pathname, medir]);

  useLayoutEffect(() => {
    if (!caja || animar) return;
    const id = requestAnimationFrame(() => setAnimar(true));
    return () => cancelAnimationFrame(id);
  }, [caja, animar]);

  // El enlace activo se toma con `ref`.
  const enlace = (item: ItemNav) => {
    const activa = esActiva(pathname, item);
    return (
      <Link
        to={item.ruta}
        ref={activa ? activaRef : undefined}
        className={`${styles.enlace} ${activa ? styles.activa : ""}`}
        aria-current={activa ? "page" : undefined}
      >
        {item.etiqueta}
      </Link>
    );
  };

  const estiloFondo: CSSProperties | undefined = caja
    ? { transform: `translate(${caja.left}px, ${caja.top}px)`, width: caja.width, height: caja.height }
    : undefined;

  return (
    <nav className={styles.nav} aria-label="Navegación principal" ref={navRef}>
      <span
        className={`${styles.fondo} ${caja ? styles.fondoVisible : ""} ${animar ? styles.fondoAnimado : ""}`}
        style={estiloFondo}
        aria-hidden="true"
      />

      {NAVEGACION.map((item) =>
        !item.hijos ? (
          <div key={item.ruta}>{enlace(item)}</div>
        ) : (
          <div
            key={item.ruta}
            className={styles.grupo}
            onMouseEnter={() => setAbierto(true)}
            onMouseLeave={() => setAbierto(false)}
          >
            {enlace(item)}
            <Button variant="plano"
              type="button"
              className={`${styles.flecha} ${abierto ? styles.flechaAbierta : ""}`}
              aria-expanded={abierto}
              aria-controls="menu-servicios"
              aria-label={`Ver ${item.etiqueta.toLowerCase()}`}
              onClick={() => setAbierto((v) => !v)}
            >
              <ChevronDown aria-hidden="true" />
            </Button>

            {abierto && (
              <ul id="menu-servicios" className={styles.panel}>
                {item.hijos.map(({ etiqueta, ruta, icono: Icono }) => (
                  <li key={ruta}>
                    <Link to={ruta} className={styles.opcion} onClick={() => setAbierto(false)}>
                      <span className={styles.opcionIcono} aria-hidden="true">
                        <Icono />
                      </span>
                      {etiqueta}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      )}
    </nav>
  );
}
