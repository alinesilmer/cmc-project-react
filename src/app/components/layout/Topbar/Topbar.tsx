import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, CircleUserRound, LogOut, Menu, Search, X } from "lucide-react";

import styles from "./Topbar.module.scss";
import { useAuth } from "@/app/auth/AuthProvider";
import { esOrganizacion, isMedico } from "@/app/auth/roles";
import { usePermisos } from "@/app/auth/usePermisos";
import { hasScope } from "@/app/auth/scopes";
import BotonTema from "@/app/components/layout/BotonTema/BotonTema";
import BuscadorPantallas from "./BuscadorPantallas";
import { anotarReciente } from "./recientes";
import {
  DOCTOR_TOP_NAV,
  MENU_USUARIO,
  MENU_USUARIO_SOCIO,
  TOP_NAV,
  VALIDACIONES_LINK,
  base,
  columnVisible,
  destinosVisibles,
  entryActive,
  isActivePath,
  menuVisible,
  passesPerms,
  type MenuColumn,
  type MenuLink,
  type TopEntry,
} from "./navegacion";
// La versión de 26 KB (160×240): acá el logo se ve chico y la barra baja en todas las pantallas.
import Logo from "@/website/assets/images/logoCMC-web.png";

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
  const [mobileExpanded, setMobileExpanded] = useState<Record<string, boolean>>({});
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

  // Con el drawer abierto: sin scroll de fondo y Escape lo cierra.
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

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

  const abrirBuscador = useCallback(() => {
    setOpenMenu(null);
    setMobileOpen(false);
    setBuscando(true);
  }, []);

  // ── Ítem de un desplegable o del drawer ──────────────────────────────────────
  const renderItem = (item: MenuLink) => {
    if (!passesPerms(item.perms, can)) return null;

    const Icon = item.icon;
    const active = !item.external && isActivePath(location.pathname, item.path);
    const cls = `${styles.item} ${active ? styles.itemActive : ""}`;
    const inner = (
      <>
        <span className={styles.itemIcon}>
          <Icon size={17} />
        </span>
        <span className={styles.itemLabel}>{item.label}</span>
      </>
    );
    const node = item.external ? (
      <a href={item.path} target="_blank" rel="noopener noreferrer" className={cls} onClick={cerrarMenus}>
        {inner}
      </a>
    ) : (
      <Link to={item.path} className={cls} aria-current={active ? "page" : undefined} onClick={cerrarMenus}>
        {inner}
      </Link>
    );
    return <li key={item.path}>{node}</li>;
  };

  const renderColumns = (columns: MenuColumn[]) =>
    columns
      .filter((col) => columnVisible(col, can))
      .map((col, i) => (
        <div key={col.heading ?? `col-${i}`} className={styles.dropdownCol}>
          {col.heading && <p className={styles.dropdownHeading}>{col.heading}</p>}
          <ul className={styles.dropdownList}>{col.items.map(renderItem)}</ul>
        </div>
      ));

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
        <button
          type="button"
          className={`${styles.topLink} ${active ? styles.topActive : ""} ${open ? styles.topOpen : ""}`}
          onClick={() => setOpenMenu((cur) => (cur === entry.id ? null : entry.id))}
          onFocus={() => openMenuNow(entry.id)}
          aria-expanded={open}
          aria-haspopup="true"
        >
          {entry.label}
          <ChevronDown size={14} className={`${styles.chev} ${open ? styles.chevOpen : ""}`} />
        </button>
        {open && (
          <div className={styles.dropdown} role="menu" data-desplegable>
            {renderColumns(entry.columns)}
          </div>
        )}
      </div>
    );
  };

  // ── Acordeón del drawer (celular) ────────────────────────────────────────────
  const renderMobileEntry = (entry: TopEntry) => {
    if (entry.kind === "link") {
      if (!passesPerms(entry.perms, can)) return null;
      const Icon = entry.icon;
      const active = isActivePath(location.pathname, entry.path);
      return (
        <Link
          key={entry.path}
          to={entry.path}
          className={`${styles.mLink} ${active ? styles.itemActive : ""}`}
          onClick={cerrarMenus}
        >
          <span className={styles.itemIcon}>
            <Icon size={17} />
          </span>
          <span className={styles.itemLabel}>{entry.label}</span>
        </Link>
      );
    }

    if (!menuVisible(entry, can)) return null;

    const Icon = entry.icon;
    const open = Boolean(mobileExpanded[entry.id]);
    return (
      <div key={entry.id} className={styles.mGroup}>
        <button
          type="button"
          className={styles.mGroupBtn}
          onClick={() => setMobileExpanded((p) => ({ ...p, [entry.id]: !p[entry.id] }))}
          aria-expanded={open}
        >
          <span className={styles.itemIcon}>
            <Icon size={17} />
          </span>
          <span className={styles.itemLabel}>{entry.label}</span>
          <ChevronDown size={16} className={`${styles.chev} ${open ? styles.chevOpen : ""}`} />
        </button>
        {open && <div className={styles.mGroupBody}>{renderColumns(entry.columns)}</div>}
      </div>
    );
  };

  const cuentaAbierta = openMenu === MENU_CUENTA;

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

        <button type="button" className={styles.buscar} onClick={abrirBuscador} aria-label="Buscar pantalla">
          <Search size={19} aria-hidden="true" />
          <span className={styles.buscarTexto}>¿A qué pantalla vas?</span>
          <kbd className={styles.buscarAtajo}>Ctrl K</kbd>
        </button>

        <div className={styles.right}>
          <BotonTema />

          {isAuthenticated && (
            <div className={styles.cuenta}>
              <button
                type="button"
                className={`${styles.userChip} ${cuentaAbierta ? styles.userChipOpen : ""}`}
                onClick={() => setOpenMenu((cur) => (cur === MENU_CUENTA ? null : MENU_CUENTA))}
                aria-expanded={cuentaAbierta}
                aria-haspopup="true"
                title={userName}
              >
                <span className={styles.userName}>{userName}</span>
                <span className={styles.userAvatar} aria-hidden="true">
                  {userInitials || <CircleUserRound size={18} />}
                </span>
                <ChevronDown size={15} className={`${styles.chev} ${cuentaAbierta ? styles.chevOpen : ""}`} />
              </button>
              {cuentaAbierta && (
                <div className={`${styles.dropdown} ${styles.dropdownEnd} ${styles.dropdownCuenta}`} role="menu">
                  <div className={styles.dropdownCol}>
                    <p className={styles.cuentaNombre}>{userName}</p>
                    <ul className={styles.dropdownList}>{menuCuenta.map(renderItem)}</ul>
                    <button type="button" className={styles.salir} onClick={handleAuth}>
                      <LogOut size={17} />
                      Salir
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!isAuthenticated && (
            <button type="button" className={styles.authButton} onClick={handleAuth}>
              <AuthIcon size={17} />
              <span>{authLabel}</span>
            </button>
          )}

          <button
            type="button"
            className={styles.hamburger}
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={mobileOpen}
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      <nav className={styles.menubar} aria-label="Navegación principal">
        {nav.map(renderTopEntry)}
      </nav>

      {buscando && createPortal(<BuscadorPantallas destinos={destinos} onClose={() => setBuscando(false)} />, document.body)}

      {/* Drawer en un portal a <body>: el `backdrop-filter` de la barra la vuelve el bloque contenedor de sus hijos `position: fixed`. */}
      {createPortal(
        <>
          <button
            type="button"
            className={`${styles.overlay} ${mobileOpen ? styles.overlayOn : ""}`}
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
            tabIndex={mobileOpen ? 0 : -1}
          />
          <aside className={`${styles.drawer} ${mobileOpen ? styles.drawerOpen : ""}`} aria-label="Menú">
            <div className={styles.drawerHead}>
              {isAuthenticated && userName ? (
                <div className={styles.drawerUser}>
                  <span className={styles.userAvatar} aria-hidden="true">
                    {userInitials}
                  </span>
                  <span className={styles.drawerUserName}>{userName}</span>
                </div>
              ) : (
                <span className={styles.drawerTitulo}>Menú</span>
              )}
              <button type="button" className={styles.drawerClose} onClick={() => setMobileOpen(false)} aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>
            <div className={styles.drawerBody}>
              {nav.map(renderMobileEntry)}
              {isAuthenticated && (
                <div className={styles.mGroupBody}>
                  <div className={styles.dropdownCol}>
                    <p className={styles.dropdownHeading}>Mi cuenta</p>
                    <ul className={styles.dropdownList}>{menuCuenta.map(renderItem)}</ul>
                  </div>
                </div>
              )}
            </div>
            <div className={styles.drawerFoot}>
              <button type="button" className={styles.authButton} onClick={handleAuth}>
                <AuthIcon size={17} />
                <span>{authLabel}</span>
              </button>
            </div>
          </aside>
        </>,
        document.body,
      )}
    </header>
  );
}
