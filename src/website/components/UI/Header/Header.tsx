import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiUser, FiMenu, FiX, FiChevronDown, FiSearch } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./Header.module.scss";
import logo from "../../../assets/images/logoCMC.png";
import SearchBar from "../SearchBar/SearchBar";

export default function Header() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<null | "nosotros" | "servicios">(null);
  const [mobileOpen, setMobileOpen] = useState({ nosotros: false, servicios: false });
  const [searchOpen, setSearchOpen] = useState(false);
  const [solid, setSolid] = useState(pathname !== "/");

  useEffect(() => {
    const onScroll = () => {
      if (pathname !== "/") { setSolid(true); return; }
      const threshold = window.innerHeight - 80;
      setSolid(window.scrollY >= threshold);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  const toggleMobileGroup = (key: "nosotros" | "servicios") =>
    setMobileOpen((p) => ({ ...p, [key]: !p[key] }));

  const closeAll = () => {
    setMenuOpen(false);
    setOpenDropdown(null);
    setMobileOpen({ nosotros: false, servicios: false });
  };

  return (
    <>
      <header className={`${styles.header} ${solid ? "" : styles.transparent}`}>
        <div className={styles.container}>
          <Link to="/" className={styles.logo} onClick={closeAll}>
            <div className={styles.logoIcon}>
              <img src={logo} alt="Logo" width={400} height={500} />
            </div>
          </Link>

          <nav className={styles.desktopNav}>
            <Link to="/" className={styles.navLink} onClick={closeAll}>Inicio</Link>

            <div
              className={`${styles.navItem} ${styles.hasDropdown}`}
              onMouseEnter={() => setOpenDropdown("nosotros")}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <div className={styles.parentRow}>
                <Link to="/nosotros" className={styles.navLink} onClick={closeAll}>Nosotros</Link>
                <button
                  className={styles.caretBtn}
                  aria-haspopup="true"
                  aria-expanded={openDropdown === "nosotros"}
                  aria-controls="dd-nosotros"
                  onClick={() => setOpenDropdown((v) => (v === "nosotros" ? null : "nosotros"))}
                >
                  <FiChevronDown aria-hidden="true" />
                </button>
              </div>

              <AnimatePresence>
                {openDropdown === "nosotros" && (
                  <motion.ul
                    id="dd-nosotros"
                    className={styles.dropdown}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <li><Link to="/nosotros/historia" className={styles.subLink} onClick={closeAll}>Historia</Link></li>
                    <li><Link to="/nosotros/comisiones" className={styles.subLink} onClick={closeAll}>Comisiones</Link></li>
                    <li><Link to="/nosotros/tribunal-de-etica" className={styles.subLink} onClick={closeAll}>Tribunal de Ética</Link></li>
                    <li><Link to="/nosotros/estatuto" className={styles.subLink} onClick={closeAll}>Estatuto</Link></li>
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>

            <div
              className={`${styles.navItem} ${styles.hasDropdown}`}
              onMouseEnter={() => setOpenDropdown("servicios")}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <div className={styles.parentRow}>
                <Link to="/notFound" className={styles.navLink} onClick={closeAll}>Servicios</Link>
                <button
                  className={styles.caretBtn}
                  aria-haspopup="true"
                  aria-expanded={openDropdown === "servicios"}
                  aria-controls="dd-servicios"
                  onClick={() => setOpenDropdown((v) => (v === "servicios" ? null : "servicios"))}
                >
                  <FiChevronDown aria-hidden="true" />
                </button>
              </div>

              <AnimatePresence>
                {openDropdown === "servicios" && (
                  <motion.ul
                    id="dd-servicios"
                    className={styles.dropdown}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <li><Link to="/servicios/socios" className={styles.subLink} onClick={closeAll}>Socios</Link></li>
                    <li><Link to="/servicios/seguro-medico" className={styles.subLink} onClick={closeAll}>Seguro médico</Link></li>
                    <li><Link to="/servicios/convenios" className={styles.subLink} onClick={closeAll}>Convenios</Link></li>
                    <li><Link to="/servicios/quinta" className={styles.subLink} onClick={closeAll}>Quinta</Link></li>
                    <li><Link to="/servicios/facturacion-online" className={styles.subLink} onClick={closeAll}>Facturación online</Link></li>
                    <li><Link to="/servicios/beneficios" className={styles.subLink} onClick={closeAll}>Beneficios</Link></li>
                    <li><Link to="/servicios/galeria" className={styles.subLink} onClick={closeAll}>Galería de fotos y videos</Link></li>
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>

            <Link to="/noticias" className={styles.navLink} onClick={closeAll}>Noticias</Link>
            <Link to="/contacto" className={styles.navLink} onClick={closeAll}>Contacto</Link>
          </nav>

          <div className={styles.actions}>
            <button
              className={styles.searchIconBtn}
              onClick={() => setSearchOpen(true)}
              aria-label="Abrir búsqueda"
            >
              <FiSearch />
            </button>
            <Link to="/admin/login" className={styles.loginLink} onClick={closeAll}>
              <FiUser />
            </Link>
          </div>

          <button
            className={styles.menuToggle}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            {menuOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              id="mobile-menu"
              className={styles.mobileMenu}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
            >
              <button
                onClick={() => { setSearchOpen(true); setMenuOpen(false); }}
                className={styles.mobileLink}
              >
                Buscar
              </button>

              <Link to="/" onClick={closeAll} className={styles.mobileLink}>Inicio</Link>

              <div className={styles.mobileGroup}>
                <button
                  className={styles.mobileGroupBtn}
                  onClick={() => setMobileOpen((p) => ({ ...p, nosotros: !p.nosotros }))}
                  aria-expanded={mobileOpen.nosotros}
                  aria-controls="m-nosotros"
                >
                  <span>Nosotros</span>
                  <FiChevronDown
                    className={`${styles.chevron} ${mobileOpen.nosotros ? styles.chevronOpen : ""}`}
                    aria-hidden="true"
                  />
                </button>

                <AnimatePresence initial={false}>
                  {mobileOpen.nosotros && (
                    <motion.div
                      id="m-nosotros"
                      className={styles.mobileSubmenu}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Link to="/nosotros/historia" onClick={closeAll}>Historia</Link>
                      <Link to="/nosotros/comisiones" onClick={closeAll}>Comisiones</Link>
                      <Link to="/nosotros/tribunal-de-etica" onClick={closeAll}>Tribunal de Ética</Link>
                      <Link to="/nosotros/estatuto" onClick={closeAll}>Estatuto</Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className={styles.mobileGroup}>
                <button
                  className={styles.mobileGroupBtn}
                  onClick={() => setMobileOpen((p) => ({ ...p, servicios: !p.servicios }))}
                  aria-expanded={mobileOpen.servicios}
                  aria-controls="m-servicios"
                >
                  <span>Servicios</span>
                  <FiChevronDown
                    className={`${styles.chevron} ${mobileOpen.servicios ? styles.chevronOpen : ""}`}
                    aria-hidden="true"
                  />
                </button>

                <AnimatePresence initial={false}>
                  {mobileOpen.servicios && (
                    <motion.div
                      id="m-servicios"
                      className={styles.mobileSubmenu}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Link to="/servicios/socios" onClick={closeAll}>Socios</Link>
                      <Link to="/servicios/seguro-medico" onClick={closeAll}>Seguro médico</Link>
                      <Link to="/servicios/convenios" onClick={closeAll}>Convenios</Link>
                      <Link to="/servicios/quinta" onClick={closeAll}>Quinta</Link>
                      <Link to="/servicios/facturacion-online" onClick={closeAll}>Facturación online</Link>
                      <Link to="/servicios/beneficios" onClick={closeAll}>Beneficios</Link>
                      <Link to="/servicios/galeria" onClick={closeAll}>Galería de fotos y videos</Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Link to="/noticias" onClick={closeAll} className={styles.mobileLink}>Noticias</Link>
              <Link to="/contacto" onClick={closeAll} className={styles.mobileLink}>Contacto</Link>
              <Link to="/not-found" onClick={closeAll} className={styles.mobileLink}>Ingresar</Link>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* This spacer ensures page content starts below the fixed header */}
      <div className={styles.offset} aria-hidden="true" />

      <SearchBar open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
