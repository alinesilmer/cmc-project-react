import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Home,
  DollarSign,
  CircleUserRound,
  UserCog,
  ChevronRight,
  ChevronLeft,
  Newspaper,
  Paperclip,
  NotebookText,
  BookUser,
  Medal,
  LogOut,
  Monitor,
  ShieldUser
} from "lucide-react";

import styles from "./Sidebar.module.scss";
import { useAuth } from "../../../auth/AuthProvider";
import RequirePermission from "../../../auth/RequirePermission";
import Logo from "../../../assets/logoCMC.png";

type NavItem = {
  path: string;
  icon: LucideIcon;
  label: string;
  perms?: string[];
  external?: boolean;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const base = "/panel";

// Static config outside component for better performance.
const NAV_SECTIONS: NavSection[] = [
  {
    title: "Principal",
    items: [
      { path: `${base}/dashboard`, icon: Home, label: "Inicio" },
      {
        path: `${base}/liquidation`,
        icon: DollarSign,
        label: "Liquidación",
        perms: ["liquidacion:leer", "liquidacion:ver"],
      },
      // {
      //   path: `${base}/facturacion`,
      //   icon: NotebookText,
      //   label: "Facturación",
      //   perms: ["medicos:leer"],
      // },
      {
        path: `${base}/boletin`,
        icon: Medal,
        label: "Ranking O.S.",
        perms: ["medicos:leer"],
      },
       {
        path: `${base}/crear-padron`,
        icon: Medal,
        label: "Crear Padrón",
        perms: ["medicos:leer"],
      },
    ],
  },
  {
    title: "Gestión",
    items: [
      {
        path: `${base}/users-manager`,
        icon: UserCog,
        label: "Gestión de Socios",
        perms: ["medicos:leer"],
      },
      {
        path: `${base}/users`,
        icon: BookUser,
        label: "Listado de Socios",
        perms: ["medicos:leer"],
      },
      {
        path: `${base}/afiliadospadron`,
        icon: Newspaper,
        label: "Padrones",
        perms: ["medicos:leer"],
      },
      {
        path: `${base}/padronsucio`,
        icon: Paperclip,
        label: "Listado de Prestadores",
        perms: ["medicos:leer"],
      },
      {
        path: `${base}/admin/permissions`,
        icon: ShieldUser,
        label: "Permisos y roles",
        perms: ["rbac:gestionar"],
      },
    ],
  },
  {
    title: "Herramientas",
    items: [
      {
        path: "https://legacy.colegiomedicocorrientes.com/principal.php",
        icon: Monitor,
        label: "Sistema Fabián",
        perms: ["medicos:leer"],
        external: true,
      },
    ],
  },
];

const isActivePath = (currentPath: string, targetPath: string) =>
  currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const isAuthenticated = Boolean(user);

  const authLabel = isAuthenticated ? "Cerrar sesión" : "Iniciar sesión";
  const authIcon = isAuthenticated ? LogOut : CircleUserRound;

  const footerText = useMemo(
    () => `© ${new Date().getFullYear()} CMC. Todos los derechos reservados.`,
    []
  );

  const handleAuthAction = async () => {
    if (!isAuthenticated) {
      navigate(`${base}/login`);
      return;
    }

    try {
      await logout();
    } finally {
      navigate(`${base}/login`, { replace: true });
    }
  };

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = item.external
      ? false
      : isActivePath(location.pathname, item.path);

    const commonClassName = `${styles.navItem} ${isActive ? styles.active : ""}`;
    const commonTooltip = collapsed ? item.label : undefined;

    const content = item.external ? (
      <a
        href={item.path}
        target="_blank"
        rel="noopener noreferrer"
        className={commonClassName}
        title={commonTooltip}
        data-tooltip={commonTooltip}
        aria-label={item.label}
      >
        <span className={styles.iconWrap}>
          <Icon size={18} />
        </span>
        <span className={styles.itemLabel}>{item.label}</span>
      </a>
    ) : (
      <Link
        to={item.path}
        className={commonClassName}
        aria-current={isActive ? "page" : undefined}
        title={commonTooltip}
        data-tooltip={commonTooltip}
      >
        <span className={styles.iconWrap}>
          <Icon size={18} />
        </span>
        <span className={styles.itemLabel}>{item.label}</span>
      </Link>
    );

    if (!item.perms || item.perms.length === 0) {
      return <li key={item.path}>{content}</li>;
    }

    return (
      <RequirePermission key={item.path} anyOf={item.perms}>
        <li>{content}</li>
      </RequirePermission>
    );
  };

  const AuthIcon = authIcon;

  return (
    <aside
      className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}
      aria-label="Navegación lateral"
    >
      <div className={styles.windowBar}>
        <div className={styles.windowDots} aria-hidden="true">
          <span className={`${styles.dot} ${styles.dotRed}`} />
          <span className={`${styles.dot} ${styles.dotYellow}`} />
          <span className={`${styles.dot} ${styles.dotGreen}`} />
        </div>

        <button
          type="button"
          className={styles.collapseButton}
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
          title={collapsed ? "Expandir menú" : "Contraer menú"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <div className={styles.brandCard}>
        <div className={styles.logoShell}>
          <img src={Logo} alt="CMC Logo" className={styles.logoImage} />
        </div>

        <div className={styles.brandText}>
          <strong className={styles.brandTitle}>Colegio Médico</strong>
          <span className={styles.brandSubtitle}>Panel de gestión</span>
        </div>
      </div>

      <nav className={styles.nav}>
        {NAV_SECTIONS.map((section, sectionIndex) => (
          <div className={styles.navSection} key={section.title}>
            <p className={styles.navSectionTitle}>{section.title}</p>

            <ul className={styles.navList}>{section.items.map(renderNavItem)}</ul>

            {sectionIndex < NAV_SECTIONS.length - 1 && (
              <div className={styles.sectionDivider} aria-hidden="true" />
            )}
          </div>
        ))}
      </nav>

      <div className={styles.accountPanel}>

        <button
          type="button"
          className={styles.authButton}
          onClick={handleAuthAction}
          aria-label={authLabel}
          title={collapsed ? authLabel : undefined}
        >
          <AuthIcon size={18} />
          <span className={styles.authButtonText}>{authLabel}</span>
        </button>
      </div>

      <footer className={styles.footer}>
        <p className={styles.footerText}>{footerText}</p>
      </footer>
    </aside>
  );
};

export default Sidebar;