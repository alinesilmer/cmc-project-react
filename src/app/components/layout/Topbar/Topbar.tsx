import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Home,
  DollarSign,
  ArrowLeftRight,
  RotateCcw,
  Wallet,
  Plus,
  Users,
  UserPlus,
  BookUser,
  ClipboardPlus,
  Building2,
  Newspaper,
  Flower2,
  FileBoxIcon,
  CalendarClock,
  Medal,
  ClipboardList,
  HousePlus,
  History,
  FileCode2,
  Search,
  FileText,
  FileUp,
  Percent,
  Sigma,
  TrendingUp,
  PencilRuler,
  ShieldUser,
  Monitor,
  Receipt,
  CalendarDays,
  Calculator,
  LogOut,
  CircleUserRound,
  ChevronDown,
  Menu,
  X,
  Layers,
  Smartphone,
  Gift,
  Inbox,
  Megaphone,
  ShieldCheck,
  BarChart3,
  Stethoscope,
  UserSearch,
  Globe,
  DatabaseZap,
  ListPlus,
  ListOrdered,
} from "lucide-react";

import styles from "./Topbar.module.scss";
import { useAuth } from "@/app/auth/AuthProvider";
import { esOrganizacion, isMedico } from "@/app/auth/roles";
import { usePermisos } from "@/app/auth/usePermisos";
import Logo from "@/app/assets/logoCMC.png";

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
  | {
      kind: "link";
      path: string;
      icon: LucideIcon;
      label: string;
      perms?: string[];
    }
  | {
      kind: "menu";
      id: string;
      icon: LucideIcon;
      label: string;
      columns: MenuColumn[];
    };

const base = "/panel";

// Un botón, no un menú: el hub ya lista todas las obras sociales —las que se
// validan acá y las que abren un portal externo— y duplicar unas pocas en un
// desplegable obligaba a mantener las dos listas en sincronía.
const VALIDACIONES_LINK: Extract<TopEntry, { kind: "link" }> = {
  kind: "link",
  path: `${base}/validaciones`,
  icon: ShieldCheck,
  label: "Validaciones",
};

// TEMPORAL — atajos para revisar el portal del socio desde una cuenta admin.
// Sin permisos reales todavía, es la única forma de ver estas pantallas sin un
// login 'D'. Borrar esta constante, su uso en TOP_NAV y la ruta
// /panel/preview/inicio-medico (routes.tsx) cuando estén los permisos.
const VISTA_MEDICO_MENU: Extract<TopEntry, { kind: "menu" }> = {
  kind: "menu",
  id: "vista-medico",
  icon: CircleUserRound,
  label: "Vista médico",
  columns: [
    {
      items: [
        {
          path: `${base}/preview/inicio-medico`,
          icon: Home,
          label: "Inicio del médico",
        },
        {
          path: `${base}/nomenclador/consulta-precios`,
          icon: DollarSign,
          label: "Consulta de Precios",
        },
        { path: `${base}/planillas`, icon: FileText, label: "Planillas" },
        {
          path: `${base}/mi-perfil`,
          icon: CircleUserRound,
          label: "Mi perfil (solo lectura)",
        },
        {
          path: `${base}/validaciones/omint`,
          icon: ClipboardList,
          label: "Omint",
          perms: ["validacion:cargar"],
        },
        {
          path: `${base}/validaciones/boreal`,
          icon: ClipboardList,
          label: "Boreal Salud",
          perms: ["validacion:cargar"],
        },
        {
          path: `${base}/validaciones`,
          icon: ShieldCheck,
          label: "Ver todas",
          perms: ["validacion:cargar"],
        },
      ],
    },
  ],
};

const TOP_NAV: TopEntry[] = [
  { kind: "link", path: `${base}/dashboard`, icon: Home, label: "Inicio" },
  VALIDACIONES_LINK,
  // La sección lista los importadores disponibles; sumar uno no toca el nav.
  {
    kind: "link",
    path: `${base}/importaciones`,
    icon: FileUp,
    label: "Importaciones",
    perms: ["facturacion:cargar"],
  },
  {
    kind: "menu",
    id: "facturacion",
    icon: Receipt,
    label: "Facturación",
    columns: [
      {
        items: [
          {
            path: `${base}/facturacion/carga`,
            icon: DollarSign,
            label: "Cargar Prestaciones",
            perms: ["facturacion:cargar"],
          },
          {
            path: `${base}/facturacion/cierre`,
            icon: CalendarDays,
            label: "Cerrar Factura",
            perms: ["facturacion:cerrar"],
          },
          {
            path: `${base}/facturacion/recalculo`,
            icon: Calculator,
            label: "Recalcular precios",
            perms: ["facturacion:periodo"],
          },
          {
            path: `${base}/facturacion/periodos`,
            icon: ClipboardList,
            label: "Ver períodos",
            perms: ["facturacion:leer"],
          },
          {
            path: `${base}/facturacion/consulta`,
            icon: Search,
            label: "Buscar prestación",
            perms: ["facturacion:leer"],
          },
          {
            path: `${base}/facturacion/detalle-medico`,
            icon: UserSearch,
            label: "Detalle por médico",
            perms: ["facturacion:leer"],
          },
          {
            path: `${base}/facturacion/complementarias`,
            icon: Layers,
            label: "Complementarias",
            perms: ["facturacion:complementar"],
          },
          {
            path: `${base}/facturacion/registro`,
            icon: History,
            label: "Registro de Facturación",
            perms: ["facturacion:registro"],
          },
        ],
      },
    ],
  },
  {
    kind: "menu",
    id: "liquidacion",
    icon: DollarSign,
    label: "Liquidación",
    columns: [
      {
        items: [
          {
            path: `${base}/liquidation`,
            icon: DollarSign,
            label: "Liquidación",
            perms: ["pago:leer"],
          },
          {
            path: `${base}/debitos-creditos`,
            icon: ArrowLeftRight,
            label: "Débitos y Créditos",
            perms: ["lote:leer"],
          },
          {
            path: `${base}/refacturaciones`,
            icon: RotateCcw,
            label: "Refacturaciones",
            perms: ["lote:leer"],
          },
        ],
      },
      {
        heading: "Deducciones",
        items: [
          {
            path: `${base}/deducciones`,
            icon: Wallet,
            label: "Lista",
            perms: ["deduccion:leer"],
          },
          {
            path: `${base}/deducciones/nueva`,
            icon: Plus,
            label: "Nueva deducción",
            perms: ["deduccion:crear"],
          },
        ],
      },
    ],
  },
  {
    kind: "menu",
    id: "socios",
    icon: Users,
    label: "Socios",
    columns: [
      {
        heading: "Socios",
        items: [
          {
            path: `${base}/users`,
            icon: BookUser,
            label: "Listado de Socios",
            perms: ["medico:leer"],
          },
          {
            path: `${base}/register-socio`,
            icon: UserPlus,
            label: "Agregar socio",
            perms: ["medico:crear"],
          },
          {
            path: `${base}/especialidades`,
            icon: ClipboardPlus,
            label: "Especialidades",
            perms: ["catalogo:leer"],
          },
          {
            path: `${base}/servicios`,
            icon: Building2,
            label: "Servicios",
            perms: ["medico:leer"],
          },
          {
            path: `${base}/cobranzas`,
            icon: Wallet,
            label: "Cobranzas",
            perms: ["cobranza:leer"],
          },
        ],
      },
      {
        heading: "Padrones",
        items: [
          {
            path: `${base}/afiliadospadron`,
            icon: Newspaper,
            label: "Padrones",
            perms: ["padron:leer"],
          },
          {
            path: `${base}/padron-socio`,
            icon: BookUser,
            label: "Padrón por Socio",
            perms: ["medico:leer"],
          },
        ],
      },
    ],
  },
  {
    // Contenido y bandejas que alimentan la app de socios (cmc-app): lo que se
    // administra acá se ve en el teléfono del médico, no en el panel.
    kind: "menu",
    id: "movil",
    icon: Smartphone,
    label: "App Móvil",
    columns: [
      {
        items: [
          {
            path: `${base}/beneficios`,
            icon: Gift,
            label: "Beneficios",
            perms: ["beneficio:gestionar"],
          },
          {
            path: `${base}/avisos`,
            icon: Megaphone,
            label: "Avisos",
            perms: ["aviso:gestionar"],
          },
          // Bandeja de solicitudes: `solicitud:leer` para verlas, distinto de
          // `solicitud:resolver` (aprobar/rechazar), que se gatea dentro de la
          // pantalla en cada acción.
          {
            path: `${base}/solicitudes-cambio`,
            icon: Inbox,
            label: "Solicitudes de cambio",
            perms: ["solicitud:leer"],
          },
        ],
      },
    ],
  },
  {
    kind: "link",
    path: `${base}/reportes`,
    icon: BarChart3,
    label: "Reportes",
    perms: ["reporte:leer"],
  },
  {
    kind: "menu",
    id: "auditoria",
    icon: Flower2,
    label: "Auditoría",
    columns: [
      {
        heading: "Boletín",
        items: [
          {
            path: `${base}/boletin-consulta-comun`,
            icon: FileBoxIcon,
            label: "Boletín Mensual",
            perms: ["catalogo:leer"],
          },
          {
            path: `${base}/boletin-valores-galenos`,
            icon: Sigma,
            label: "Boletín Galenos",
            perms: ["nomenclador:leer"],
          },
          {
            path: `${base}/boletin`,
            icon: Medal,
            label: "Ranking O.S.",
            perms: ["nomenclador:leer"],
          },
          {
            path: `${base}/nomenclador/actualizaciones`,
            icon: CalendarClock,
            label: "O.S. Actualizadas (LISTADO)",
            perms: ["nomenclador:leer"],
          },
        ],
      },
      {
        heading: "Convenios",
        items: [
          {
            path: `${base}/convenios/planillas`,
            icon: FileText,
            label: "Planillas de Consulta",
            perms: ["contenido:editar"],
          },
          {
            path: `${base}/convenios/obras-sociales`,
            icon: ClipboardList,
            label: "Listado de Obras Sociales",
            perms: ["catalogo:leer"],
          },
          {
            path: `${base}/convenios/obras-sociales/alta`,
            icon: HousePlus,
            label: "Alta Obra Social",
            perms: ["catalogo:editar"],
          },
          {
            path: `${base}/historial-valores`,
            icon: History,
            label: "Historial de Valores",
            perms: ["nomenclador:leer"],
          },
        ],
      },
    ],
  },
  {
    kind: "menu",
    id: "nomenclador",
    icon: FileCode2,
    label: "Nomenclador",
    columns: [
      {
        heading: "Códigos",
        items: [
          {
            path: `${base}/nomenclador/codigos`,
            icon: FileCode2,
            label: "Catálogo Códigos CMC",
            perms: ["nomenclador:leer"],
          },
          // Flujo en 4 etapas: el código (Catálogo) → alta en la O.S. → precio.
          {
            path: `${base}/nomenclador/codigos-por-os`,
            icon: ClipboardList,
            label: "Códigos por Obra Social",
            perms: ["nomenclador:leer"],
          },
          {
            path: `${base}/nomenclador/precios/por-obra-social`,
            icon: Building2,
            label: "Valor por Obra Social",
            perms: ["nomenclador:leer"],
          },
          {
            path: `${base}/nomenclador/por-especialidad`,
            icon: Stethoscope,
            label: "Códigos por Especialidad",
            perms: ["nomenclador:leer"],
          },
          {
            path: `${base}/nomenclador/consulta-valores`,
            icon: Search,
            label: "Consulta de Valores",
            perms: ["nomenclador:leer"],
          },
          {
            path: `${base}/nomenclador/aumento-porcentual`,
            icon: Percent,
            label: "Aumento Porcentual",
            perms: ["nomenclador:masivo"],
          },
        ],
      },
      {
        heading: "Nomencladores",
        items: [
          {
            path: `${base}/nomenclador/nacional`,
            icon: Layers,
            label: "Nomenclador Nacional",
            perms: ["nomenclador:leer"],
          },
          {
            path: `${base}/nomenclador/nivelados`,
            icon: ListOrdered,
            label: "Nomencladores Nivelados",
            perms: ["nomenclador:leer"],
          },
        ],
      },
      {
        heading: "Galenos",
        items: [
          {
            path: `${base}/nomenclador/galenos`,
            icon: Sigma,
            label: "Galenos",
            perms: ["nomenclador:leer"],
          },
          {
            path: `${base}/nomenclador/actualizar-precios`,
            icon: TrendingUp,
            label: "Actualizar Unidades",
            perms: ["nomenclador:editar"],
          },
        ],
      },
    ],
  },
  {
    kind: "menu",
    id: "herramientas",
    icon: PencilRuler,
    label: "Herramientas",
    columns: [
      {
        heading: "Colegio",
        items: [
          {
            path: `${base}/institucion`,
            icon: Building2,
            label: "Datos del Colegio",
            perms: ["catalogo:leer"],
          },
          {
            path: `${base}/agenda`,
            icon: CalendarDays,
            label: "Calendario",
            perms: ["catalogo:leer"],
          },
          // Administra el contenido del sitio público desde el panel: los
          // componentes siguen en `src/website/` pero la pantalla se monta acá.
          // `contenido:editar` es el permiso que el backend ya exige para
          // noticias y avisos, así que el médico no lo ve.
          {
            path: `${base}/sitio`,
            icon: Globe,
            label: "Contenido del sitio",
            perms: ["contenido:editar"],
          },
        ],
      },
      {
        heading: "Nomenclador",
        items: [
          // Completa galenos base + valores NN faltantes de una OS (nueva o
          // existente) en $0, sin tocar lo que ya tiene.
          {
            path: `${base}/herramientas/completar-nomenclador-nn`,
            icon: DatabaseZap,
            label: "Completar nomenclador NN",
            perms: ["nomenclador:masivo"],
          },
          // Da de alta un código como NE en $0 (por especialidad de su plantilla) en
          // varias obras sociales, sin tocar lo que ya tienen.
          {
            path: `${base}/herramientas/agregar-codigo-obras-sociales`,
            icon: ListPlus,
            label: "Agregar código a obras sociales",
            perms: ["nomenclador:masivo"],
          },
        ],
      },
      {
        heading: "Sistema",
        items: [
          {
            path: `${base}/admin/permissions`,
            icon: ShieldUser,
            label: "Permisos y roles",
            perms: ["rbac:gestionar"],
          },
          {
            path: `${base}/actividad`,
            icon: History,
            label: "Registro de actividad",
            perms: ["rbac:gestionar"],
          },
          // Atajo de conveniencia hacia el sistema legacy, sin scope propio:
          // no hay ningún permiso en la tabla que gobierne "ver este link
          // desde el panel nuevo" (distinto de `system_new:access`, que hace
          // lo inverso — lo consume el legacy para mostrar el link al panel
          // nuevo). Visible para cualquier staff autenticado no-médico.
          {
            path: "https://legacy.colegiomedicocorrientes.com/principal.php",
            icon: Monitor,
            label: "Sistema Viejo",
            external: true,
          },
        ],
      },
    ],
  },
];

// Nav del socio (INGRESAR = 'D'). Debe quedar alineado con MEDICO_ALLOWED_PATHS:
// lo que no está acá tampoco es alcanzable por URL (ver MedicoRouteGuard).
const DOCTOR_TOP_NAV: TopEntry[] = [
  { kind: "link", path: `${base}/dashboard`, icon: Home, label: "Inicio" },
  VALIDACIONES_LINK,
  {
    kind: "link",
    path: `${base}/nomenclador/consulta-precios`,
    icon: DollarSign,
    label: "Consulta de Precios",
  },
  {
    kind: "link",
    path: `${base}/boletin-valores`,
    icon: FileBoxIcon,
    label: "Valores Boletín",
  },
  {
    kind: "link",
    path: `${base}/planillas`,
    icon: FileText,
    label: "Planillas",
  },
  {
    kind: "link",
    path: `${base}/facturacion/mi-recepcion`,
    icon: Receipt,
    label: "Mi recepción",
  },
  {
    kind: "link",
    path: `${base}/mi-perfil`,
    icon: CircleUserRound,
    label: "Mi perfil",
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

const isActivePath = (current: string, target: string) =>
  current === target || current.startsWith(`${target}/`);

function menuItems(entry: Extract<TopEntry, { kind: "menu" }>): MenuLink[] {
  return entry.columns.flatMap((c) => c.items);
}

function entryActive(current: string, entry: TopEntry): boolean {
  if (entry.kind === "link") return isActivePath(current, entry.path);
  return menuItems(entry).some(
    (i) => !i.external && isActivePath(current, i.path),
  );
}

// `perms` es semántica "anyOf": sin perms declarados, visible para cualquier
// autenticado; con perms, alcanza con tener uno solo.
function passesPerms(
  perms: string[] | undefined,
  can: (code: string) => boolean,
): boolean {
  return !perms || perms.length === 0 || perms.some(can);
}

// Una columna de un dropdown se oculta entera (heading incluido) si ninguno
// de sus ítems es visible para el usuario — si no, queda un título de sección
// colgando sobre una lista vacía.
function columnVisible(
  col: MenuColumn,
  can: (code: string) => boolean,
): boolean {
  return col.items.some((i) => passesPerms(i.perms, can));
}

// El trigger de un menú desplegable se oculta si ninguna de sus columnas
// tiene algo para mostrar.
function menuVisible(
  entry: Extract<TopEntry, { kind: "menu" }>,
  can: (code: string) => boolean,
): boolean {
  return entry.columns.some((c) => columnVisible(c, can));
}

// Pantallas donde la barra NO acompaña el scroll. El formulario de carga de
// prestaciones es largo (formulario + listado del médico debajo) y la barra fija le
// come alto útil mientras el operador baja; ahí se deja estática y se recupera al
// volver arriba. Cubre alta, edición y carga en complementaria — es el mismo
// formulario en las tres rutas.
const RUTAS_SIN_STICKY = [
  `${base}/facturacion/carga`,
  `${base}/facturacion/complementarias/`,
];

function sinSticky(pathname: string): boolean {
  return (
    pathname.startsWith(RUTAS_SIN_STICKY[0]) ||
    (pathname.startsWith(RUTAS_SIN_STICKY[1]) && pathname.endsWith("/cargar"))
  );
}

export default function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { can } = usePermisos();

  const nav = useMemo(() => {
    const entries = isMedico(user) ? DOCTOR_TOP_NAV : TOP_NAV;
    return esOrganizacion(user)
      ? entries.filter((e) => e !== VALIDACIONES_LINK)
      : entries;
  }, [user]);
  const isAuthenticated = Boolean(user);

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<Record<string, boolean>>(
    {},
  );
  const headerRef = useRef<HTMLElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // El chip del usuario no cabe junto al menú en pantallas chicas: ahí el nombre
  // se muestra en la cabecera del drawer (ver más abajo), no en la barra.
  const userName = user?.nombre?.trim() ?? "";
  const userInitials = useMemo(() => {
    const partes = userName.split(/\s+/).filter(Boolean);
    if (!partes.length) return "";
    // Nombre y apellido; con una sola palabra alcanza su inicial.
    return partes
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");
  }, [userName]);

  const authLabel = isAuthenticated ? "Salir" : "Iniciar sesión";
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
      if (headerRef.current && !headerRef.current.contains(e.target as Node))
        setOpenMenu(null);
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

  // Con el drawer abierto: sin scroll de fondo y Escape lo cierra. El Escape de
  // arriba sólo atiende los desplegables de escritorio, que no existen acá.
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

  // Hover-intent: open on mouse-enter, close after a short grace period so the
  // cursor can travel from the trigger across the gap into the dropdown.
  useEffect(
    () => () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    },
    [],
  );

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

  /** Cierra el menú abierto, sea el desplegable de escritorio o el drawer.
   *
   * Va en el click del enlace y no sólo en el cambio de ruta: ir a la página en
   * la que ya estás no cambia `location.pathname`, y un enlace externo abre
   * otra pestaña sin cambiarlo nunca. En los dos casos el menú quedaba abierto. */
  const cerrarMenus = useCallback(() => {
    setOpenMenu(null);
    setMobileOpen(false);
  }, []);

  // ── Shared item link renderer (used in dropdowns and mobile drawer) ──────────
  const renderItem = (item: MenuLink) => {
    if (!passesPerms(item.perms, can)) return null;

    const Icon = item.icon;
    const active = !item.external && isActivePath(location.pathname, item.path);
    const cls = `${styles.item} ${active ? styles.itemActive : ""}`;
    const inner = (
      <>
        <span className={styles.itemIcon}>
          <Icon size={16} />
        </span>
        <span className={styles.itemLabel}>{item.label}</span>
      </>
    );
    const node = item.external ? (
      <a
        href={item.path}
        target="_blank"
        rel="noopener noreferrer"
        className={cls}
        onClick={cerrarMenus}
      >
        {inner}
      </a>
    ) : (
      <Link
        to={item.path}
        className={cls}
        aria-current={active ? "page" : undefined}
        onClick={cerrarMenus}
      >
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
          {col.heading && (
            <p className={styles.dropdownHeading}>{col.heading}</p>
          )}
          <ul className={styles.dropdownList}>{col.items.map(renderItem)}</ul>
        </div>
      ));

  // ── Desktop top-level entry ──────────────────────────────────────────────────
  const renderTopEntry = (entry: TopEntry, idx: number, total: number) => {
    // Right-align the dropdowns of the trailing menus so they don't overflow.
    const alignEnd = idx >= total - 2;
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
          <span className={styles.topLabel}>{entry.label}</span>
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
          className={`${styles.topLink} ${styles.topTrigger} ${active ? styles.topActive : ""} ${open ? styles.topOpen : ""}`}
          onClick={() =>
            setOpenMenu((cur) => (cur === entry.id ? null : entry.id))
          }
          onFocus={() => openMenuNow(entry.id)}
          aria-expanded={open}
          aria-haspopup="true"
        >
          <span className={styles.topLabel}>{entry.label}</span>
          <ChevronDown
            size={15}
            className={`${styles.chev} ${open ? styles.chevOpen : ""}`}
          />
        </button>
        {open && (
          <div
            className={`${styles.dropdown} ${alignEnd ? styles.dropdownEnd : ""}`}
            role="menu"
          >
            {renderColumns(entry.columns)}
          </div>
        )}
      </div>
    );
  };

  // ── Mobile accordion entry ───────────────────────────────────────────────────
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
          onClick={() =>
            setMobileExpanded((p) => ({ ...p, [entry.id]: !p[entry.id] }))
          }
          aria-expanded={open}
        >
          <span className={styles.itemIcon}>
            <Icon size={17} />
          </span>
          <span className={styles.itemLabel}>{entry.label}</span>
          <ChevronDown
            size={16}
            className={`${styles.chev} ${open ? styles.chevOpen : ""}`}
          />
        </button>
        {open && (
          <div className={styles.mGroupBody}>
            {renderColumns(entry.columns)}
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
        <Link
          to={`${base}/dashboard`}
          className={styles.brand}
          aria-label="Inicio"
        >
          <img src={Logo} alt="CMC" className={styles.logo} />
        </Link>

        {/* Desktop menubar */}
        <nav className={styles.menubar} aria-label="Navegación principal">
          {nav.map((entry, i) => renderTopEntry(entry, i, nav.length))}
        </nav>

        <div className={styles.right}>
          {isAuthenticated && userName && (
            <div className={styles.userChip} title={userName}>
              <span className={styles.userAvatar} aria-hidden="true">
                {userInitials}
              </span>
              <span className={styles.userName}>{userName}</span>
            </div>
          )}

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
      <aside
        className={`${styles.drawer} ${mobileOpen ? styles.drawerOpen : ""}`}
        aria-label="Menú"
      >
        <div className={styles.drawerHead}>
          {isAuthenticated && userName ? (
            <div className={styles.drawerUser}>
              <span className={styles.userAvatar} aria-hidden="true">
                {userInitials}
              </span>
              <span className={styles.drawerUserName}>{userName}</span>
            </div>
          ) : (
            <span className={styles.brandText}>Menú</span>
          )}
          <button
            type="button"
            className={styles.drawerClose}
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>
        <div className={styles.drawerBody}>{nav.map(renderMobileEntry)}</div>
        <div className={styles.drawerFoot}>
          <button
            type="button"
            className={styles.authButton}
            onClick={handleAuth}
          >
            <AuthIcon size={17} />
            <span className={styles.authText}>{authLabel}</span>
          </button>
        </div>
      </aside>
    </header>
  );
}
