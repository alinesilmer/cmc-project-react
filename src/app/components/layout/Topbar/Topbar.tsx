import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, CircleUserRound, LogOut, Menu, Search } from "lucide-react";

import styles from "./Topbar.module.scss";
import { useAuth } from "@/app/auth/useAuth";
import { esOrganizacion, isMedico } from "@/app/auth/roles";
import { usePermisos } from "@/app/auth/usePermisos";
import { hasScope } from "@/app/auth/scopes";
import BotonTema from "@/app/components/layout/BotonTema/BotonTema";
import BotonTexto from "@/app/components/layout/BotonTexto/BotonTexto";
import BuscadorPantallas from "./BuscadorPantallas";
import { ColumnasMenu } from "./ItemMenu";
import MenuCelular from "./MenuCelular";
import MenuCuenta from "./MenuCuenta";
import { anotarReciente } from "./recientes";
import {
  DOCTOR_TOP_NAV,
  MENU_USUARIO,
  MENU_USUARIO_SOCIO,
  TOP_NAV,
  VALIDACIONES_LINK,
  base,
  destinosVisibles,
  entryActive,
  isActivePath,
  menuVisible,
  passesPerms,
  type TopEntry,
} from "./navegacion";
// La versión de 26 KB (160×240): acá el logo se ve chico y la barra baja en todas las pantallas.
import Logo from "@/website/assets/images/logoCMC-web.png";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

const MENU_CUENTA = "cuenta";
const SIN_SCOPES: string[] = [];

// Pantallas donde la barra NO acompaña el scroll.
const RUTAS_SIN_STICKY = [`${base}/facturacion/carga`, `${base}/facturacion/complementarias/`];

function sinSticky(pathname: string): boolean {
  return (
    pathname.startsWith(RUTAS_SIN_STICKY[0]) ||
    (pathname.startsWith(RUTAS_SIN_STICKY[1]) && pathname.endsWith("/cargar"))
  );
}

/** Barra superior del panel: marca, buscador de pantallas, cuenta y, debajo, las secciones como solapas. */
export default function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { can } = usePermisos();

  const esSocio = isMedico(user);
  const nav = useMemo(() => {
    const entries = esSocio ? DOCTOR_TOP_NAV : TOP_NAV;
    return esOrganizacion(user) ? entries.filter((e) => e !== VALIDACIONES_LINK) : entries;
  }, [user, esSocio]);
  const menuCuenta = esSocio ? MENU_USUARIO_SOCIO : MENU_USUARIO;
  // Depende de los scopes, no de `can`, que es una función nueva en cada render.
  const scopes = user?.scopes ?? SIN_SCOPES;
  const destinos = useMemo(
    () => destinosVisibles(nav, menuCuenta, (c) => hasScope(scopes, c)),
    [nav, menuCuenta, scopes],
  );
  const isAuthenticated = Boolean(user);

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const userName = user?.nombre?.trim() ?? "";
  const userInitials = useMemo(() => {
    const partes = userName.split(/\s+/).filter(Boolean);
    // Nombre y apellido; con una sola palabra alcanza su inicial.
    return partes.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
  }, [userName]);

  const authLabel = isAuthenticated ? "Salir" : "Iniciar sesión";
  const AuthIcon = isAuthenticated ? LogOut : CircleUserRound;

  // Al navegar se cierran los menús.
  useEffect(() => {
    setOpenMenu(null);
    setMobileOpen(false);
  }, [location.pathname]);

  // Y la pantalla abierta pasa al frente de las recientes del buscador.
  useEffect(() => {
    const actual = destinos
      .filter((d) => !d.external && isActivePath(location.pathname, d.path))
      .sort((a, b) => b.path.length - a.path.length)[0];
    if (actual) anotarReciente(actual.path);
  }, [location.pathname, destinos]);

  // Ctrl K (o ⌘K) abre el buscador desde cualquier pantalla.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpenMenu(null);
        setBuscando((b) => !b);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Si el desplegable se sale de la pantalla, se corre hacia adentro.
  useLayoutEffect(() => {
    const panel = headerRef.current?.querySelector<HTMLElement>("[data-desplegable]");
    if (!panel) return;
    panel.style.transform = "";
    const margen = 12;
    const caja = panel.getBoundingClientRect();
    const sobra = caja.right - (window.innerWidth - margen);
    const falta = margen - caja.left;
    if (sobra > 0) panel.style.transform = `translateX(${-Math.min(sobra, caja.left - margen)}px)`;
    else if (falta > 0) panel.style.transform = `translateX(${falta}px)`;
  }, [openMenu]);

  // Cierra el desplegable abierto al tocar afuera o con Escape.
  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenu]);

  useEffect(
    () => () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    },
    [],
  );

  // Abre al pasar el mouse y cierra con una pequeña demora, para poder cruzar del disparador al panel.
  const openMenuNow = useCallback((id: string) => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    setOpenMenu(id);
  }, []);
  const scheduleCloseMenu = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setOpenMenu(null), 140);
  }, []);

  const handleAuth = useCallback(async () => {
    if (!isAuthenticated) {
      navigate(`${base}/login`);
      return;
    }
    try {
      await logout();
    } finally {
      navigate(`${base}/login`, { replace: true });
    }
  }, [isAuthenticated, logout, navigate]);

  const cerrarMenus = useCallback(() => {
    setOpenMenu(null);
    setMobileOpen(false);
  }, []);

  const cerrarDrawer = useCallback(() => setMobileOpen(false), []);

  const abrirBuscador = useCallback(() => {
    setOpenMenu(null);
    setMobileOpen(false);
    setBuscando(true);
  }, []);

  // ── Solapa de sección (escritorio) ───────────────────────────────────────────
  const renderTopEntry = (entry: TopEntry) => {
    if (entry.kind === "link") {
      if (!passesPerms(entry.perms, can)) return null;
      const active = isActivePath(location.pathname, entry.path);
      return (
        <Link
          key={entry.path}
          to={entry.path}
          className={`${styles.topLink} ${active ? styles.topActive : ""}`}
          aria-current={active ? "page" : undefined}
        >
          {entry.label}
        </Link>
      );
    }

    if (!menuVisible(entry, can)) return null;

    const open = openMenu === entry.id;
    const active = entryActive(location.pathname, entry);
    return (
      <div
        key={entry.id}
        className={styles.menu}
        onMouseEnter={() => openMenuNow(entry.id)}
        onMouseLeave={scheduleCloseMenu}
      >
        <BotonPlano
          type="button"
          className={`${styles.topLink} ${active ? styles.topActive : ""} ${open ? styles.topOpen : ""}`}
          onClick={() => setOpenMenu((cur) => (cur === entry.id ? null : entry.id))}
          onFocus={() => openMenuNow(entry.id)}
          aria-expanded={open}
          aria-haspopup="true"
        >
          {entry.label}
          <ChevronDown size={14} className={`${styles.chev} ${open ? styles.chevOpen : ""}`} />
        </BotonPlano>
        {open && (
          <div className={styles.dropdown} role="menu" data-desplegable>
            <ColumnasMenu columnas={entry.columns} can={can} ruta={location.pathname} alNavegar={cerrarMenus} />
          </div>
        )}
      </div>
    );
  };

  return (
    <header
      className={`${styles.topbar} ${sinSticky(location.pathname) ? styles.topbarEstatica : ""}`}
      ref={headerRef}
    >
      <div className={styles.inner}>
        <Link to={`${base}/dashboard`} className={styles.brand} aria-label="Inicio">
          <img src={Logo} alt="" className={styles.logo} />
          <span className={styles.brandText}>
            Colegio Médico
            <br />
            de Corrientes
          </span>
        </Link>

        <BotonPlano type="button" className={styles.buscar} onClick={abrirBuscador} aria-label="Buscar pantalla">
          <Search size={19} aria-hidden="true" />
          <span className={styles.buscarTexto}>¿A qué pantalla vas?</span>
          <kbd className={styles.buscarAtajo}>Ctrl K</kbd>
        </BotonPlano>

        <div className={styles.right}>
          <BotonTexto />
          <BotonTema />

          {isAuthenticated && (
            <MenuCuenta
              nombre={userName}
              iniciales={userInitials}
              items={menuCuenta}
              abierto={openMenu === MENU_CUENTA}
              onAlternar={() => setOpenMenu((cur) => (cur === MENU_CUENTA ? null : MENU_CUENTA))}
              onSalir={handleAuth}
              can={can}
              ruta={location.pathname}
              alNavegar={cerrarMenus}
            />
          )}

          {!isAuthenticated && (
            <BotonPlano type="button" className={styles.authButton} onClick={handleAuth}>
              <AuthIcon size={17} />
              <span>{authLabel}</span>
            </BotonPlano>
          )}

          <BotonPlano
            type="button"
            className={styles.hamburger}
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={mobileOpen}
          >
            <Menu size={20} />
          </BotonPlano>
        </div>
      </div>

      <nav className={styles.menubar} aria-label="Navegación principal">
        {nav.map(renderTopEntry)}
      </nav>

      {buscando && createPortal(<BuscadorPantallas destinos={destinos} onClose={() => setBuscando(false)} />, document.body)}

      <MenuCelular
        nav={nav}
        menuCuenta={menuCuenta}
        nombre={userName}
        iniciales={userInitials}
        autenticado={isAuthenticated}
        abierto={mobileOpen}
        onCerrar={cerrarDrawer}
        alNavegar={cerrarMenus}
        onSalir={handleAuth}
        etiquetaAuth={authLabel}
        IconoAuth={AuthIcon}
        can={can}
        ruta={location.pathname}
      />
    </header>
  );
}
