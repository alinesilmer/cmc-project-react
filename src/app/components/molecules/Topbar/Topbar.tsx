import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Home, DollarSign, ArrowLeftRight, RotateCcw, Wallet, Plus,
  Users, BookUser, ClipboardPlus, Building2, Newspaper,
  Flower2, FileBoxIcon, Medal, ClipboardList, HousePlus, History,
  FileCode2, Search, FileText, Percent, GitMerge, Sigma, TrendingUp,
  PencilRuler, ShieldUser, Monitor, Receipt, CalendarDays,
  LogOut, CircleUserRound, ChevronDown, Menu, X, Layers,
} from "lucide-react";

import styles from "./Topbar.module.scss";
import { useAuth } from "../../../auth/AuthProvider";
import RequirePermission from "../../../auth/RequirePermission";
import Logo from "../../../assets/logoCMC.png";

// ─── Nav model ─────────────────────────────────────────────────────────────────

type MenuLink = {
  path: string;
  icon: LucideIcon;
  label: string;
  perms?: string[];
  external?: boolean;
};
type MenuColumn = { heading?: string; items: MenuLink[] };
type TopEntry =
  | { kind: "link"; path: string; icon: LucideIcon; label: string; perms?: string[] }
  | { kind: "menu"; id: string; icon: LucideIcon; label: string; columns: MenuColumn[] };

const base = "/panel";
const R = ["medicos:leer"];
const LIQ = ["liquidacion:leer", "liquidacion:ver"];

const TOP_NAV: TopEntry[] = [
  { kind: "link", path: `${base}/dashboard`, icon: Home, label: "Inicio" },
  {
    kind: "menu", id: "facturacion", icon: Receipt, label: "Facturación",
    columns: [
      {
        items: [
          { path: `${base}/facturacion/carga`, icon: DollarSign, label: "Cargar Prestaciones", perms: R },
          { path: `${base}/facturacion/cierre`, icon: CalendarDays, label: "Cerrar Factura", perms: R },
          { path: `${base}/facturacion/periodos`, icon: ClipboardList, label: "Ver períodos", perms: R },
          { path: `${base}/facturacion/complementarias`, icon: Layers, label: "Complementarias", perms: R },
        ],
      },
    ],
  },
  {
    kind: "menu", id: "liquidacion", icon: DollarSign, label: "Liquidación",
    columns: [
      {
        items: [
          { path: `${base}/liquidation`, icon: DollarSign, label: "Liquidación", perms: LIQ },
          { path: `${base}/debitos-creditos`, icon: ArrowLeftRight, label: "Débitos y Créditos", perms: LIQ },
          { path: `${base}/refacturaciones`, icon: RotateCcw, label: "Refacturaciones", perms: LIQ },
        ],
      },
      {
        heading: "Deducciones",
        items: [
          { path: `${base}/deducciones`, icon: Wallet, label: "Lista", perms: LIQ },
          { path: `${base}/deducciones/nueva`, icon: Plus, label: "Nueva deducción", perms: LIQ },
        ],
      },
    ],
  },
  {
    kind: "menu", id: "socios", icon: Users, label: "Socios",
    columns: [
      {
        heading: "Socios",
        items: [
          { path: `${base}/users`, icon: BookUser, label: "Listado de Socios", perms: R },
          { path: `${base}/especialidades`, icon: ClipboardPlus, label: "Especialidades", perms: R },
          { path: `${base}/servicios`, icon: Building2, label: "Servicios", perms: R },
        ],
      },
      {
        heading: "Padrones",
        items: [
          { path: `${base}/afiliadospadron`, icon: Newspaper, label: "Padrones", perms: R },
        ],
      },
    ],
  },
  {
    kind: "menu", id: "auditoria", icon: Flower2, label: "Auditoría",
    columns: [
      {
        heading: "Boletín",
        items: [
          { path: `${base}/boletin-consulta-comun`, icon: FileBoxIcon, label: "Boletín Mensual", perms: R },
          { path: `${base}/boletin`, icon: Medal, label: "Ranking O.S.", perms: R },
        ],
      },
      {
        heading: "Convenios",
        items: [
          { path: `${base}/convenios/obras-sociales`, icon: ClipboardList, label: "Listado de Obras Sociales", perms: R },
          { path: `${base}/convenios/obras-sociales/alta`, icon: HousePlus, label: "Alta Obra Social", perms: R },
          { path: `${base}/historial-valores`, icon: History, label: "Historial de Valores", perms: R },
        ],
      },
    ],
  },
  {
    kind: "menu", id: "nomenclador", icon: FileCode2, label: "Nomenclador",
    columns: [
      {
        heading: "Códigos",
        items: [
          { path: `${base}/nomenclador/codigos`, icon: FileCode2, label: "Catálogo Códigos CMC", perms: R },
          { path: `${base}/nomenclador/por-obra-social`, icon: Building2, label: "Por Obra Social", perms: R },
          { path: `${base}/nomenclador/consulta-valores`, icon: Search, label: "Consulta de Valores", perms: R },
          { path: `${base}/nomenclador/consulta-precios`, icon: DollarSign, label: "Consulta de Precios", perms: R },
          { path: `${base}/nomenclador/importar-precios-pdf`, icon: FileText, label: "Importar Precios PDF", perms: R },
          { path: `${base}/nomenclador/aumento-porcentual`, icon: Percent, label: "Aumento Porcentual", perms: R },
          { path: `${base}/nomenclador/homologador`, icon: GitMerge, label: "Homologador", perms: R },
        ],
      },
      {
        heading: "Galenos",
        items: [
          { path: `${base}/nomenclador/galenos`, icon: Sigma, label: "Galenos", perms: R },
          { path: `${base}/nomenclador/actualizar-precios`, icon: TrendingUp, label: "Actualizar Unidades", perms: R },
        ],
      },
    ],
  },
  {
    kind: "menu", id: "herramientas", icon: PencilRuler, label: "Herramientas",
    columns: [
      {
        heading: "Sistema",
        items: [
          { path: `${base}/admin/permissions`, icon: ShieldUser, label: "Permisos y roles", perms: ["rbac:gestionar"] },
          { path: "https://legacy.colegiomedicocorrientes.com/principal.php", icon: Monitor, label: "Sistema Viejo", perms: R, external: true },
        ],
      },
    ],
  },
];

const DOCTOR_TOP_NAV: TopEntry[] = [
  { kind: "link", path: `${base}/nomenclador/consulta-precios`, icon: DollarSign, label: "Consulta de Precios" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

const isActivePath = (current: string, target: string) =>
  current === target || current.startsWith(`${target}/`);

function menuItems(entry: Extract<TopEntry, { kind: "menu" }>): MenuLink[] {
  return entry.columns.flatMap((c) => c.items);
}

// Union of perms across a menu's items — controls whether the trigger shows at all.
function menuPerms(entry: Extract<TopEntry, { kind: "menu" }>): string[] {
  const all = menuItems(entry).flatMap((i) => i.perms ?? []);
  return [...new Set(all)];
}

function entryActive(current: string, entry: TopEntry): boolean {
  if (entry.kind === "link") return isActivePath(current, entry.path);
  return menuItems(entry).some((i) => !i.external && isActivePath(current, i.path));
}

export default function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const isDoctor = user?.ingresar === "D";
  const nav = isDoctor ? DOCTOR_TOP_NAV : TOP_NAV;
  const isAuthenticated = Boolean(user);

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<Record<string, boolean>>({});
  const headerRef = useRef<HTMLElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const authLabel = isAuthenticated ? "Cerrar sesión" : "Iniciar sesión";
  const AuthIcon = isAuthenticated ? LogOut : CircleUserRound;

  // Close menus on navigation.
  useEffect(() => {
    setOpenMenu(null);
    setMobileOpen(false);
  }, [location.pathname]);

  // Close open dropdown on outside click / Escape.
  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenMenu(null); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenu]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mobileOpen]);

  // Hover-intent: open on mouse-enter, close after a short grace period so the
  // cursor can travel from the trigger across the gap into the dropdown.
  useEffect(() => () => { if (hoverTimer.current) clearTimeout(hoverTimer.current); }, []);

  const openMenuNow = useCallback((id: string) => {
    if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null; }
    setOpenMenu(id);
  }, []);
  const scheduleCloseMenu = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setOpenMenu(null), 140);
  }, []);

  const handleAuth = useCallback(async () => {
    if (!isAuthenticated) { navigate(`${base}/login`); return; }
    try { await logout(); } finally { navigate(`${base}/login`, { replace: true }); }
  }, [isAuthenticated, logout, navigate]);

  const wrapPerm = useCallback(
    (node: ReactElement, perms?: string[], key?: string) =>
      !perms || perms.length === 0 ? node : (
        <RequirePermission key={key} anyOf={perms}>{node}</RequirePermission>
      ),
    [],
  );

  // ── Shared item link renderer (used in dropdowns and mobile drawer) ──────────
  const renderItem = (item: MenuLink) => {
    const Icon = item.icon;
    const active = !item.external && isActivePath(location.pathname, item.path);
    const cls = `${styles.item} ${active ? styles.itemActive : ""}`;
    const inner = (
      <>
        <span className={styles.itemIcon}><Icon size={16} /></span>
        <span className={styles.itemLabel}>{item.label}</span>
      </>
    );
    const node = item.external ? (
      <a href={item.path} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
    ) : (
      <Link to={item.path} className={cls} aria-current={active ? "page" : undefined}>{inner}</Link>
    );
    return wrapPerm(<li key={item.path}>{node}</li>, item.perms, item.path);
  };

  const renderColumns = (columns: MenuColumn[]) =>
    columns.map((col, i) => (
      <div key={col.heading ?? `col-${i}`} className={styles.dropdownCol}>
        {col.heading && <p className={styles.dropdownHeading}>{col.heading}</p>}
        <ul className={styles.dropdownList}>{col.items.map(renderItem)}</ul>
      </div>
    ));

  // ── Desktop top-level entry ──────────────────────────────────────────────────
  const renderTopEntry = (entry: TopEntry, idx: number, total: number) => {
    // Right-align the dropdowns of the trailing menus so they don't overflow.
    const alignEnd = idx >= total - 2;
    if (entry.kind === "link") {
      const active = isActivePath(location.pathname, entry.path);
      const node = (
        <Link
          key={entry.path}
          to={entry.path}
          className={`${styles.topLink} ${active ? styles.topActive : ""}`}
          aria-current={active ? "page" : undefined}
        >
          <span className={styles.topLabel}>{entry.label}</span>
        </Link>
      );
      return wrapPerm(node, entry.perms, entry.path);
    }

    const open = openMenu === entry.id;
    const active = entryActive(location.pathname, entry);
    const node = (
      <div
        key={entry.id}
        className={styles.menu}
        onMouseEnter={() => openMenuNow(entry.id)}
        onMouseLeave={scheduleCloseMenu}
      >
        <button
          type="button"
          className={`${styles.topLink} ${styles.topTrigger} ${active ? styles.topActive : ""} ${open ? styles.topOpen : ""}`}
          onClick={() => setOpenMenu((cur) => (cur === entry.id ? null : entry.id))}
          onFocus={() => openMenuNow(entry.id)}
          aria-expanded={open}
          aria-haspopup="true"
        >
          <span className={styles.topLabel}>{entry.label}</span>
          <ChevronDown size={15} className={`${styles.chev} ${open ? styles.chevOpen : ""}`} />
        </button>
        {open && (
          <div className={`${styles.dropdown} ${alignEnd ? styles.dropdownEnd : ""}`} role="menu">
            {renderColumns(entry.columns)}
          </div>
        )}
      </div>
    );
    return wrapPerm(node, menuPerms(entry), entry.id);
  };

  // ── Mobile accordion entry ───────────────────────────────────────────────────
  const renderMobileEntry = (entry: TopEntry) => {
    if (entry.kind === "link") {
      const Icon = entry.icon;
      const active = isActivePath(location.pathname, entry.path);
      const node = (
        <Link
          key={entry.path}
          to={entry.path}
          className={`${styles.mLink} ${active ? styles.itemActive : ""}`}
        >
          <span className={styles.itemIcon}><Icon size={17} /></span>
          <span className={styles.itemLabel}>{entry.label}</span>
        </Link>
      );
      return wrapPerm(node, entry.perms, entry.path);
    }

    const Icon = entry.icon;
    const open = Boolean(mobileExpanded[entry.id]);
    const node = (
      <div key={entry.id} className={styles.mGroup}>
        <button
          type="button"
          className={styles.mGroupBtn}
          onClick={() => setMobileExpanded((p) => ({ ...p, [entry.id]: !p[entry.id] }))}
          aria-expanded={open}
        >
          <span className={styles.itemIcon}><Icon size={17} /></span>
          <span className={styles.itemLabel}>{entry.label}</span>
          <ChevronDown size={16} className={`${styles.chev} ${open ? styles.chevOpen : ""}`} />
        </button>
        {open && (
          <div className={styles.mGroupBody}>{renderColumns(entry.columns)}</div>
        )}
      </div>
    );
    return wrapPerm(node, menuPerms(entry), entry.id);
  };

  return (
    <header className={styles.topbar} ref={headerRef}>
      <div className={styles.inner}>
        <Link to={`${base}/dashboard`} className={styles.brand} aria-label="Inicio">
          <img src={Logo} alt="CMC" className={styles.logo} />
        </Link>

        {/* Desktop menubar */}
        <nav className={styles.menubar} aria-label="Navegación principal">
          {nav.map((entry, i) => renderTopEntry(entry, i, nav.length))}
        </nav>

        <div className={styles.right}>
          <button
            type="button"
            className={styles.authButton}
            onClick={handleAuth}
            title={authLabel}
          >
            <AuthIcon size={17} />
            <span className={styles.authText}>{authLabel}</span>
          </button>

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

      {/* Mobile drawer */}
      <button
        type="button"
        className={`${styles.overlay} ${mobileOpen ? styles.overlayOn : ""}`}
        onClick={() => setMobileOpen(false)}
        aria-label="Cerrar menú"
        tabIndex={mobileOpen ? 0 : -1}
      />
      <aside className={`${styles.drawer} ${mobileOpen ? styles.drawerOpen : ""}`} aria-label="Menú">
        <div className={styles.drawerHead}>
          <span className={styles.brandText}>Menú</span>
          <button type="button" className={styles.drawerClose} onClick={() => setMobileOpen(false)} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className={styles.drawerBody}>
          {nav.map(renderMobileEntry)}
        </div>
        <div className={styles.drawerFoot}>
          <button type="button" className={styles.authButton} onClick={handleAuth}>
            <AuthIcon size={17} />
            <span className={styles.authText}>{authLabel}</span>
          </button>
        </div>
      </aside>
    </header>
  );
}
