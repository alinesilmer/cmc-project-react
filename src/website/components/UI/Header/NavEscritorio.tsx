import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { NAVEGACION, esActiva, type ItemNav } from "./navegacion";
import styles from "./NavEscritorio.module.scss";

/**
 * El menú horizontal. La sección actual va sobre un fondo azul que se desliza
 * al cambiar de página; «Servicios» abre una lista con íconos.
 */
export default function NavEscritorio() {
  const { pathname } = useLocation();
  const [abierto, setAbierto] = useState(false);

  const enlace = (item: ItemNav) => {
    const activa = esActiva(pathname, item);
    return (
      <Link to={item.ruta} className={`${styles.enlace} ${activa ? styles.activa : ""}`} aria-current={activa ? "page" : undefined}>
        {activa && <motion.span layoutId="nav-activa" className={styles.fondo} transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
        {item.etiqueta}
      </Link>
    );
  };

  return (
    <nav className={styles.nav} aria-label="Navegación principal">
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
            <button
              type="button"
              className={`${styles.flecha} ${abierto ? styles.flechaAbierta : ""}`}
              aria-expanded={abierto}
              aria-controls="menu-servicios"
              aria-label={`Ver ${item.etiqueta.toLowerCase()}`}
              onClick={() => setAbierto((v) => !v)}
            >
              <ChevronDown aria-hidden="true" />
            </button>

            <AnimatePresence>
              {abierto && (
                <motion.ul
                  id="menu-servicios"
                  className={styles.panel}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.16 }}
                >
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
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        )
      )}
    </nav>
  );
}
