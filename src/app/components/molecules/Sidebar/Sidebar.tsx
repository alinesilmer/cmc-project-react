import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Home,
  DollarSign,
  CircleUserRound,
  UserCog,
  ChevronRight,
  ChevronLeft,
  HeartHandshakeIcon,
  ChevronDown,
  Newspaper,
  Paperclip,
  BookUser,
  Medal,
  LogOut,
  Monitor,
  ShieldUser,
  Menu,
  X,
  Users,
  CalendarDays,
  Building2,
  ClipboardList,
  BadgeCheck,
  ArrowLeftRight,
  RotateCcw,
  Wallet,
  Plus,
  CircleDollarSign,
  FileBoxIcon,
  FileText,
  FileSpreadsheet,
  PencilRuler,
  Users2,
  ClipboardPlus,
  HousePlus,
} from "lucide-react";

import styles from "./Sidebar.module.scss";
import { useAuth } from "../../../auth/AuthProvider";
import RequirePermission from "../../../auth/RequirePermission";
import Logo from "../../../assets/logoCMC.png";

type NavItem = {
  kind: "item";
  path: string;
  icon: LucideIcon;
  label: string;
  perms?: string[];
  external?: boolean;
};

type NavGroup = {
  kind: "group";
  id: string;
  icon: LucideIcon;
  label: string;
  perms?: string[];
  children: NavItem[];
};

type NavEntry = NavItem | NavGroup;

type NavSection = {
  title: string;
  items: NavEntry[];
};

const base = "/panel";
const facturacionBase = `${base}/facturacion`;

const FACTURACION_CHILDREN: NavItem[] = [
  {
    kind: "item",
    path: `${facturacionBase}/carga`,
    icon: DollarSign,
    label: "Carga Prestaciones - Colegio",
    perms: ["medicos:leer"],
  },
  {
    kind: "item",
    path: `${facturacionBase}/cierre-periodo`,
    icon: CalendarDays,
    label: "Cierre de Períodos Facturista",
    perms: ["medicos:leer"],
  },
  {
    kind: "item",
    path: `${facturacionBase}/listado-por-medico`,
    icon: ClipboardList,
    label: "Listado por Médico",
    perms: ["medicos:leer"],
  },
  {
    kind: "item",
    path: `${facturacionBase}/listado-por-obra-social`,
    icon: Building2,
    label: "Listado por Obra Social - Colegio",
    perms: ["medicos:leer"],
  },
  {
    kind: "item",
    path: `${facturacionBase}/validacion`,
    icon: BadgeCheck,
    label: "Validación",
    perms: ["medicos:leer"],
  },
];

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Principal",
    items: [
      { kind: "item", path: `${base}/dashboard`, icon: Home, label: "Inicio" },
      {
        kind: "item",
        path: `${base}/liquidation`,
        icon: DollarSign,
        label: "Liquidación",
        perms: ["liquidacion:leer", "liquidacion:ver"],
      },
      {
        kind: "item",
        path: `${base}/debitos-creditos`,
        icon: ArrowLeftRight,
        label: "Débitos y Créditos",
        perms: ["liquidacion:leer", "liquidacion:ver"],
      },
      {
        kind: "item",
        path: `${base}/refacturaciones`,
        icon: RotateCcw,
        label: "Refacturaciones",
        perms: ["liquidacion:leer", "liquidacion:ver"],
      },
      {
        kind: "group",
        id: "deducciones",
        icon: Wallet,
        label: "Deducciones",
        perms: ["liquidacion:leer", "liquidacion:ver"],
        children: [
          {
            kind: "item",
            path: `${base}/deducciones`,
            icon: Wallet,
            label: "Lista",
            perms: ["liquidacion:leer", "liquidacion:ver"],
          },
          {
            kind: "item",
            path: `${base}/deducciones/nueva`,
            icon: Plus,
            label: "Nueva deducción",
            perms: ["liquidacion:leer", "liquidacion:ver"],
          },
        ],
      },
      // {
      //   kind: "group",
      //   id: "facturacion",
      //   icon: NotebookIcon,
      //   label: "Facturación",
      //   perms: ["medicos:leer"],
      //   children: FACTURACION_CHILDREN,
      // },
    ],
  },
  {
    title: "Gestión",
    items: [
      //  {
      //   kind: "group",
      //   id: "auditoria",
      //   icon: NotepadTextDashed,
      //   label: "Auditoria",
      //   children: [
      //     {
      //       kind: "item",
      //       path: `${base}/users-manager`,
      //       icon: UserCog,
      //       label: "Doctor y Nomenclador",
      //       perms: ["medicos:leer"],
      //     },
      //     {
      //       kind: "item",
      //       path: `${base}/users`,
      //       icon: BookUser,
      //       label: "Especialidad",
      //       perms: ["medicos:leer"],
      //     },
      //      {
      //       kind: "item",
      //       path: `${base}/users-manager`,
      //       icon: UserCog,
      //       label: "Nomenclador",
      //       perms: ["medicos:leer"],
      //     },
      //      {
      //       kind: "item",
      //       path: `${base}/users-manager`,
      //       icon: UserCog,
      //       label: "Obra Social",
      //       perms: ["medicos:leer"],
      //     },
      //      {
      //       kind: "item",
      //       path: `${base}/users-manager`,
      //       icon: UserCog,
      //       label: "Nomenclador y Obra Social",
      //       perms: ["medicos:leer"],
      //     },
      //      {
      //       kind: "item",
      //       path: `${base}/users-manager`,
      //       icon: UserCog,
      //       label: "Períodos Cerrados",
      //       perms: ["medicos:leer"],
      //     },
      //      {
      //       kind: "item",
      //       path: `${base}/users-manager`,
      //       icon: UserCog,
      //       label: "Prestaciones Cargadas",
      //       perms: ["medicos:leer"],
      //     },
      //   ],
      // },
        {
         kind: "group",
         id: "valores",
         icon: CircleDollarSign,
         label: "Valores",
         children: [
           {
             kind: "item",
             path: `${base}/boletin-consulta-comun`,
             icon: FileBoxIcon,
             label: "Boletín Mensual",
             perms: ["medicos:leer"],
           },
            {
        kind: "item",
        path: `${base}/boletin`,
        icon: Medal,
        label: "Ranking O.S.",
        perms: ["medicos:leer"],
      },
      // {
      //   kind: "item",
      //   path: `${base}/actualizacion-valores`,
      //   icon: PencilRuler,
      //   label: "Actualización de Valores",
      //   perms: ["medicos:leer"],
      // },
      //     {
      //       kind: "item",
      //       path: `${base}/users`,
      //       icon: FileStack,
      //       label: "Boletín Galenos Historial",
      //       perms: ["medicos:leer"],
      //     },
      //      {
      //       kind: "item",
      //       path: `${base}/users-manager`,
      //       icon: Shredder,
      //       label: "Modificar Valores",
      //       perms: ["medicos:leer"],
      //     },
      //      {
      //       kind: "item",
      //       path: `${base}/users-manager`,
      //       icon: BookMarked,
      //       label: "Nomeclados Nacional",
      //       perms: ["medicos:leer"],
      //     },
      //      {
      //       kind: "item",
      //       path: `${base}/users-manager`,
      //       icon: CircleDashed,
      //       label: "Nivel 7",
      //       perms: ["medicos:leer"],
      //     },
      //      {
      //       kind: "item",
      //       path: `${base}/users-manager`,
      //       icon: CircleDotDashedIcon,
      //       label: "Nivel 10",
      //       perms: ["medicos:leer"],
      //     },
      //      {
      //       kind: "item",
      //       path: `${base}/users-manager`,
      //       icon: FileUpIcon,
      //       label: "Importar Valores",
      //       perms: ["medicos:leer"],
      //     },
      //     {
      //       kind: "item",
      //       path: `${base}/users-manager`,
      //       icon: PackageSearch,
      //       label: "Valores Historial",
      //       perms: ["medicos:leer"],
      //     },
         ],
       },
      
      {
        kind: "group",
        id: "socios",
        icon: Users,
        label: "Socios",
        children: [
          {
            kind: "item",
            path: `${base}/solicitudes`,
            icon: UserCog,
            label: "Solicitudes de Registro",
            perms: ["medicos:leer"],
          },
          {
            kind: "item",
            path: `${base}/users`,
            icon: BookUser,
            label: "Listado de Socios",
            perms: ["medicos:leer"],
          },
          {
            kind: "item",
            path: `${base}/especialidades`,
            icon: ClipboardPlus,
            label: "Especialidades",
            perms: ["medicos:leer"],
          },
        ],
      },
        {
        kind: "group",
        id: "convenios",
        icon: Building2,
        label: "Convenios",
        children: [
          {
            kind: "item",
            path: `${base}/convenios/obras-sociales`,
            icon: ClipboardList,
            label: "Listado de Obras Sociales",
            perms: ["medicos:leer"],
          },
          {
            kind: "item",
            path: `${base}/convenios/obras-sociales/alta`,
            icon: HousePlus,
            label: "Alta Obra Social",
            perms: ["medicos:leer"],
          },
        ],
      },
      {
        kind: "group",
        id: "padrones",
        icon: HeartHandshakeIcon,
        label: "Padrones",
        children: [
            {
        kind: "item",
        path: `${base}/afiliadospadron`,
        icon: Newspaper,
        label: "Padrones",
        perms: ["medicos:leer"],
      },
      {
        kind: "item",
        path: `${base}/padronsucio`,
        icon: Paperclip,
        label: "Listado de Prestadores",
        perms: ["medicos:leer"],
      },
       {
        kind: "item",
        path: `${base}/padron-swiss`,
        icon: Users2,
        label: "Padrón Swiss Medical",
        perms: ["medicos:leer"],
      },
        ],
      },
    ],
  },
  {
    title: "Herramientas",
    items: [
      {
        kind: "group",
        id: "otros",
        icon: PencilRuler,
        label: "Otros",
        children: [
          {
            kind: "item",
            path: `${base}/crear-padron`,
            icon: FileText,
            label: "Generar Lista Cerrada",
            perms: ["medicos:leer"],
          },
          {
            kind: "item",
            path: `${base}/crear-excel`,
            icon: FileSpreadsheet,
            label: "Generar Excel Lista",
            perms: ["medicos:leer"],
          },
        ],
      },
      {
        kind: "item",
        path: `${base}/admin/permissions`,
        icon: ShieldUser,
        label: "Permisos y roles",
        perms: ["rbac:gestionar"],
      },
      {
        kind: "item",
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

const isGroupActive = (currentPath: string, group: NavGroup) =>
  group.children.some((child) => isActivePath(currentPath, child.path));

const getInitialOpenGroups = (sections: NavSection[], currentPath: string) => {
  const next: Record<string, boolean> = {};

  for (const section of sections) {
    for (const entry of section.items) {
      if (entry.kind === "group" && isGroupActive(currentPath, entry)) {
        next[entry.id] = true;
      }
    }
  }

  return next;
};

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    getInitialOpenGroups(NAV_SECTIONS, location.pathname),
  );
  const [tooltip, setTooltip] = useState<{
    label: string;
    top: number;
    left: number;
  } | null>(null);

  const isAuthenticated = Boolean(user);

  const authLabel = isAuthenticated ? "Cerrar sesión" : "Iniciar sesión";
  const AuthIcon = isAuthenticated ? LogOut : CircleUserRound;

  const footerText = useMemo(
    () => `© ${new Date().getFullYear()} CMC. Todos los derechos reservados.`,
    [],
  );

  useEffect(() => {
    const activeGroups = getInitialOpenGroups(NAV_SECTIONS, location.pathname);

    if (Object.keys(activeGroups).length === 0) return;

    setOpenGroups((prev) => {
      let changed = false;
      const next = { ...prev };

      for (const [groupId, shouldBeOpen] of Object.entries(activeGroups)) {
        if (shouldBeOpen && !next[groupId]) {
          next[groupId] = true;
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [location.pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(max-width: 768px)");

    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setCollapsed(false);
      } else {
        setMobileOpen(false);
      }
    };

    if (mediaQuery.matches) {
      setCollapsed(false);
    }

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  // Clear floating tooltip whenever the sidebar expands or mobile closes
  useEffect(() => {
    if (!collapsed) setTooltip(null);
  }, [collapsed]);

  useEffect(() => {
    if (mobileOpen) setTooltip(null);
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  const handleAuthAction = useCallback(async () => {
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

  const handleToggleGroup = useCallback(
    (groupId: string) => {
      if (collapsed) {
        setCollapsed(false);
        setOpenGroups((prev) => ({ ...prev, [groupId]: true }));
        return;
      }

      setOpenGroups((prev) => ({
        ...prev,
        [groupId]: !prev[groupId],
      }));
    },
    [collapsed],
  );

  const wrapWithPermission = useCallback(
    (node: ReactElement, perms?: string[], key?: string) => {
      if (!perms || perms.length === 0) return node;

      return (
        <RequirePermission key={key} anyOf={perms}>
          {node}
        </RequirePermission>
      );
    },
    [],
  );

  const renderNavItem = useCallback(
    (item: NavItem, nested = false) => {
      const Icon = item.icon;
      const isActive = item.external
        ? false
        : isActivePath(location.pathname, item.path);

      const className = [
        nested ? styles.subNavItem : styles.navItem,
        isActive ? styles.active : "",
      ]
        .filter(Boolean)
        .join(" ");

      const titleAttr = collapsed ? item.label : undefined;

      const handleTipEnter = collapsed
        ? (e: React.MouseEvent<HTMLElement>) => {
            const r = e.currentTarget.getBoundingClientRect();
            setTooltip({
              label: item.label,
              top: r.top + r.height / 2,
              left: r.right + 8,
            });
          }
        : undefined;
      const handleTipLeave = collapsed ? () => setTooltip(null) : undefined;

      const content = item.external ? (
        <a
          href={item.path}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
          title={titleAttr}
          aria-label={item.label}
          onMouseEnter={handleTipEnter}
          onMouseLeave={handleTipLeave}
        >
          <span className={styles.iconWrap}>
            <Icon size={nested ? 16 : 18} />
          </span>
          <span className={styles.itemLabel}>{item.label}</span>
        </a>
      ) : (
        <Link
          to={item.path}
          className={className}
          aria-current={isActive ? "page" : undefined}
          title={titleAttr}
          onMouseEnter={handleTipEnter}
          onMouseLeave={handleTipLeave}
        >
          <span className={styles.iconWrap}>
            <Icon size={nested ? 16 : 18} />
          </span>
          <span className={styles.itemLabel}>{item.label}</span>
        </Link>
      );

      const node = <li key={item.path}>{content}</li>;
      return wrapWithPermission(node, item.perms, item.path);
    },
    [collapsed, location.pathname, wrapWithPermission],
  );

  const renderNavEntry = useCallback(
    (entry: NavEntry) => {
      if (entry.kind === "item") {
        return renderNavItem(entry);
      }

      const GroupIcon = entry.icon;
      const open = Boolean(openGroups[entry.id]);
      const active = isGroupActive(location.pathname, entry);
      const titleAttrGroup = collapsed ? entry.label : undefined;

      const handleGroupTipEnter = collapsed
        ? (e: React.MouseEvent<HTMLButtonElement>) => {
            const r = e.currentTarget.getBoundingClientRect();
            setTooltip({
              label: entry.label,
              top: r.top + r.height / 2,
              left: r.right + 8,
            });
          }
        : undefined;
      const handleGroupTipLeave = collapsed
        ? () => setTooltip(null)
        : undefined;

      const node = (
        <li key={entry.id} className={styles.groupItem}>
          <button
            type="button"
            className={[
              styles.groupButton,
              active ? styles.active : "",
              open ? styles.groupButtonOpen : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => handleToggleGroup(entry.id)}
            aria-expanded={open}
            aria-controls={`sidebar-group-${entry.id}`}
            title={titleAttrGroup}
            onMouseEnter={handleGroupTipEnter}
            onMouseLeave={handleGroupTipLeave}
          >
            <span className={styles.groupMain}>
              <span className={styles.iconWrap}>
                <GroupIcon size={18} />
              </span>
              <span className={styles.itemLabel}>{entry.label}</span>
            </span>

            <ChevronDown
              size={16}
              className={`${styles.groupChevron} ${
                open ? styles.groupChevronOpen : ""
              }`}
            />
          </button>

          <ul
            id={`sidebar-group-${entry.id}`}
            className={`${styles.subNavList} ${
              open ? styles.subNavListOpen : ""
            }`}
            aria-label={entry.label}
          >
            {entry.children.map((child) => renderNavItem(child, true))}
          </ul>
        </li>
      );

      return wrapWithPermission(node, entry.perms, entry.id);
    },
    [
      collapsed,
      handleToggleGroup,
      location.pathname,
      openGroups,
      renderNavItem,
      wrapWithPermission,
    ],
  );

  return (
    <>
      <button
        type="button"
        className={styles.mobileMenuButton}
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú"
        aria-expanded={mobileOpen}
        aria-controls="cmc-sidebar"
      >
        <Menu size={20} />
      </button>

      <button
        type="button"
        className={`${styles.mobileOverlay} ${
          mobileOpen ? styles.mobileOverlayVisible : ""
        }`}
        onClick={() => setMobileOpen(false)}
        aria-label="Cerrar menú"
        tabIndex={mobileOpen ? 0 : -1}
      />

      <aside
        id="cmc-sidebar"
        className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""} ${
          mobileOpen ? styles.mobileOpen : ""
        }`}
        aria-label="Navegación lateral"
      >
        <div className={styles.windowBar}>
          <div className={styles.windowDots} aria-hidden="true">
            <img src={Logo} alt="CMC Logo" className={styles.logoImage} />
          </div>

          <div className={styles.windowActions}>
            <button
              type="button"
              className={styles.mobileCloseButton}
              onClick={() => setMobileOpen(false)}
              aria-label="Cerrar menú"
              title="Cerrar menú"
            >
              <X size={18} />
            </button>

            <button
              type="button"
              className={styles.collapseButton}
              onClick={() => setCollapsed((prev) => !prev)}
              aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
              title={collapsed ? "Expandir menú" : "Contraer menú"}
            >
              {collapsed ? (
                <ChevronRight size={18} />
              ) : (
                <ChevronLeft size={18} />
              )}
            </button>
          </div>
        </div>

        <nav className={styles.nav}>
          {NAV_SECTIONS.map((section, sectionIndex) => (
            <div className={styles.navSection} key={section.title}>
              <p className={styles.navSectionTitle}>{section.title}</p>

              <ul className={styles.navList}>
                {section.items.map((entry) => renderNavEntry(entry))}
              </ul>

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

        {/* Fixed tooltip rendered only in collapsed desktop mode */}
        {collapsed && tooltip && (
          <div
            className={styles.fixedTooltip}
            style={{ top: tooltip.top, left: tooltip.left }}
            aria-hidden="true"
          >
            {tooltip.label}
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;
