import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { User, Menu, X } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import NavEscritorio from "./NavEscritorio";
import NavMovil from "./NavMovil";
import { useIrAlSistema } from "../../../hooks/useIrAlSistema";
import logo from "../../../assets/images/logoCMC-web.png";
import styles from "./Header.module.scss";

/**
 * Cabecera del sitio: el nombre, el menú y el acceso, fija arriba.
 */
export default function Header() {
  const { pathname } = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [scrolleado, setScrolleado] = useState(false);
  const { ir } = useIrAlSistema();

  useEffect(() => {
    const medir = () => setScrolleado(window.scrollY > 40);
    medir();
    window.addEventListener("scroll", medir, { passive: true });
    return () => window.removeEventListener("scroll", medir);
  }, []);

  // Cambiar de página cierra el menú del celular.
  useEffect(() => {
    setMenuAbierto(false);
  }, [pathname]);

  const ingresar = () => {
    setMenuAbierto(false);
    ir();
  };

  return (
    <header className={`${styles.header} ${scrolleado ? styles.scrolleado : ""}`}>
      <div className={styles.contenedor}>
        <Link to="/" className={styles.marca} aria-label="Colegio Médico de Corrientes, inicio">
          <img src={logo} alt="" width={52} height={52} />
          <span className={styles.nombre}>
            Colegio Médico
            <small>de Corrientes</small>
          </span>
        </Link>

        <NavEscritorio />

        <div className={styles.derecha}>
          <button type="button" className={styles.ingresar} onClick={ingresar}>
            <User aria-hidden="true" />
            <span>Ingresar</span>
          </button>

          <button
            type="button"
            className={styles.hamburguesa}
            onClick={() => setMenuAbierto((v) => !v)}
            aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuAbierto}
            aria-controls="mobile-menu"
          >
            {menuAbierto ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuAbierto && <NavMovil onCerrar={() => setMenuAbierto(false)} onIngresar={ingresar} />}
      </AnimatePresence>
    </header>
  );
}
