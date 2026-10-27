import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  BookUser,
  Building2,
  Calculator,
  CalendarClock,
  CalendarDays,
  CircleUserRound,
  ClipboardList,
  ClipboardPlus,
  DatabaseZap,
  DollarSign,
  FileBoxIcon,
  FileCode2,
  FileText,
  FileUp,
  Gift,
  Globe,
  History,
  Home,
  HousePlus,
  Inbox,
  Layers,
  ListOrdered,
  ListPlus,
  Medal,
  Megaphone,
  Monitor,
  Newspaper,
  Percent,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  ShieldCheck,
  ShieldUser,
  Sigma,
  Stethoscope,
  TrendingUp,
  UserPlus,
  UserSearch,
  Users,
  Wallet,
} from "lucide-react";

import { URL_BASE_LEGACY } from "@/app/shared/lib/urlLegacy";

// ─── Modelo ───────────────────────────────────────────────────────────────────

export type MenuLink = {
  path: string;
  icon: LucideIcon;
  label: string;
  perms?: string[];
  external?: boolean;
};
export type MenuColumn = { heading?: string; items: MenuLink[] };
export type TopLink = {
  kind: "link";
  path: string;
  icon: LucideIcon;
  label: string;
  perms?: string[];
};
export type TopMenu = {
  kind: "menu";
  id: string;
  icon: LucideIcon;
  label: string;
  columns: MenuColumn[];
};
export type TopEntry = TopLink | TopMenu;

export const base = "/panel";

// Un botón, no un menú: el hub ya lista todas las obras sociales.
export const VALIDACIONES_LINK: TopLink = {
  kind: "link",
  path: `${base}/validaciones`,
  icon: ShieldCheck,
  label: "Validaciones",
};

// El legajo propio: empleados y administradores también tienen ficha en `listado_medico`.
const MI_PERFIL: MenuLink = {
  path: `${base}/mi-perfil`,
  icon: CircleUserRound,
  label: "Mi perfil",
};

// ─── Personal del Colegio ─────────────────────────────────────────────────────

export const TOP_NAV: TopEntry[] = [
  { kind: "link", path: `${base}/dashboard`, icon: Home, label: "Inicio" },
  {
    kind: "menu",
    id: "prestaciones",
    icon: Receipt,
    label: "Prestaciones",
    columns: [
      {
        heading: "Carga",
        items: [
          { path: `${base}/facturacion/carga`, icon: DollarSign, label: "Cargar prestaciones", perms: ["facturacion:cargar"] },
          // La sección lista los importadores disponibles; sumar uno no toca el nav.
          { path: `${base}/importaciones`, icon: FileUp, label: "Importaciones", perms: ["facturacion:cargar"] },
          { path: `${base}/facturacion/complementarias`, icon: Layers, label: "Complementarias", perms: ["facturacion:complementar"] },
        ],
      },
      {
        heading: "Períodos",
        items: [
          { path: `${base}/facturacion/periodos`, icon: ClipboardList, label: "Ver períodos", perms: ["facturacion:leer"] },
          { path: `${base}/facturacion/cierre`, icon: CalendarDays, label: "Cerrar factura", perms: ["facturacion:cerrar"] },
          { path: `${base}/facturacion/recalculo`, icon: Calculator, label: "Recalcular precios", perms: ["facturacion:periodo"] },
        ],
      },
      {
        heading: "Consultas",
        items: [
          { path: `${base}/facturacion/consulta`, icon: Search, label: "Buscar prestación", perms: ["facturacion:leer"] },
          { path: `${base}/facturacion/detalle-medico`, icon: UserSearch, label: "Detalle por médico", perms: ["facturacion:leer"] },
          { path: `${base}/facturacion/registro`, icon: History, label: "Registro de facturación", perms: ["facturacion:registro"] },
        ],
      },
    ],
  },
  VALIDACIONES_LINK,
  {
    kind: "menu",
    id: "liquidacion",
    icon: Wallet,
    label: "Liquidación",
    columns: [
      {
        heading: "Pagos",
        items: [
          { path: `${base}/liquidation`, icon: DollarSign, label: "Pagos", perms: ["pago:leer"] },
          { path: `${base}/debitos-creditos`, icon: ArrowLeftRight, label: "Débitos y créditos", perms: ["lote:leer"] },
          { path: `${base}/refacturaciones`, icon: RotateCcw, label: "Refacturaciones", perms: ["lote:leer"] },
        ],
      },
      {
        heading: "Deducciones",
        items: [
          { path: `${base}/deducciones`, icon: Wallet, label: "Deducciones", perms: ["deduccion:leer"] },
          { path: `${base}/deducciones/nueva`, icon: Plus, label: "Nueva deducción", perms: ["deduccion:crear"] },
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
          { path: `${base}/users`, icon: BookUser, label: "Listado de socios", perms: ["medico:leer"] },
          { path: `${base}/register-socio`, icon: UserPlus, label: "Agregar socio", perms: ["medico:crear"] },
          { path: `${base}/afiliadospadron`, icon: Newspaper, label: "Padrones", perms: ["padron:leer"] },
          { path: `${base}/cobranzas`, icon: Wallet, label: "Cobranzas", perms: ["cobranza:leer"] },
          // `solicitud:leer` para verlas; aprobar o rechazar se gatea dentro de la pantalla.
          { path: `${base}/solicitudes-cambio`, icon: Inbox, label: "Solicitudes de cambio", perms: ["solicitud:leer"] },
        ],
      },
      {
        heading: "Catálogos",
        items: [
          { path: `${base}/especialidades`, icon: ClipboardPlus, label: "Especialidades", perms: ["catalogo:leer"] },
          { path: `${base}/servicios`, icon: Building2, label: "Servicios", perms: ["medico:leer"] },
        ],
      },
    ],
  },
  {
    kind: "menu",
    id: "valores",
    icon: BookOpen,
    label: "Valores",
    columns: [
      {
        heading: "Boletines",
        items: [
          { path: `${base}/boletin-consulta-comun`, icon: FileBoxIcon, label: "Editar boletín", perms: ["catalogo:leer"] },
          { path: `${base}/boletin-valores`, icon: FileText, label: "Boletín (vista del médico)", perms: ["nomenclador:leer"] },
          { path: `${base}/boletin`, icon: Medal, label: "Ranking de valores", perms: ["nomenclador:leer"] },
          { path: `${base}/nomenclador/actualizaciones`, icon: CalendarClock, label: "Obras sociales actualizadas", perms: ["nomenclador:leer"] },
          // Sin `perms`: las planillas las ve todo el personal.
          { path: `${base}/planillas`, icon: FileText, label: "Planillas de consulta" },
        ],
      },
      {
        heading: "Obras sociales",
        items: [
          { path: `${base}/convenios/obras-sociales`, icon: ClipboardList, label: "Listado de obras sociales", perms: ["catalogo:leer"] },
          { path: `${base}/convenios/obras-sociales/alta`, icon: HousePlus, label: "Alta de obra social", perms: ["catalogo:editar"] },
          { path: `${base}/historial-valores`, icon: History, label: "Historial de valores", perms: ["nomenclador:leer"] },
        ],
      },
      {
        heading: "Nomenclador",
        items: [
          // Flujo en etapas: el código (Catálogo) → alta en la O.S. → precio.
          { path: `${base}/nomenclador/codigos`, icon: FileCode2, label: "Catálogo de códigos CMC", perms: ["nomenclador:leer"] },
          { path: `${base}/nomenclador/codigos-por-os`, icon: ClipboardList, label: "Códigos por obra social", perms: ["nomenclador:leer"] },
          { path: `${base}/nomenclador/precios/por-obra-social`, icon: Building2, label: "Valor por obra social", perms: ["nomenclador:leer"] },
          { path: `${base}/nomenclador/por-especialidad`, icon: Stethoscope, label: "Códigos por especialidad", perms: ["nomenclador:leer"] },
          { path: `${base}/nomenclador/consulta-valores`, icon: Search, label: "Consulta de valores", perms: ["nomenclador:leer"] },
          { path: `${base}/nomenclador/nacional`, icon: Layers, label: "Nomenclador nacional", perms: ["nomenclador:leer"] },
          { path: `${base}/nomenclador/nivelados`, icon: ListOrdered, label: "Nomencladores nivelados", perms: ["nomenclador:leer"] },
          { path: `${base}/nomenclador/galenos`, icon: Sigma, label: "Galenos", perms: ["nomenclador:leer"] },
        ],
      },
      {
        heading: "Cambios masivos",
        items: [
          { path: `${base}/nomenclador/aumento-porcentual`, icon: Percent, label: "Aumento porcentual", perms: ["nomenclador:masivo"] },
          { path: `${base}/nomenclador/actualizar-precios`, icon: TrendingUp, label: "Actualizar unidades", perms: ["nomenclador:editar"] },
          // Completa galenos base + valores NN faltantes de una OS en $0, sin tocar lo que ya tiene.
          { path: `${base}/herramientas/completar-nomenclador-nn`, icon: DatabaseZap, label: "Completar nomenclador NN", perms: ["nomenclador:masivo"] },
          // Alta de un código como NE en $0 en varias obras sociales, sin tocar lo que ya tienen.
          { path: `${base}/herramientas/agregar-codigo-obras-sociales`, icon: ListPlus, label: "Agregar código a obras sociales", perms: ["nomenclador:masivo"] },
        ],
      },
    ],
  },
  { kind: "link", path: `${base}/reportes`, icon: BarChart3, label: "Reportes", perms: ["reporte:leer"] },
  {
    kind: "menu",
    id: "comunicacion",
    icon: Megaphone,
    label: "Comunicación",
    columns: [
      {
        // Lo que se administra acá se ve en el teléfono del médico (cmc-app).
        heading: "App de socios",
        items: [
          { path: `${base}/avisos`, icon: Megaphone, label: "Avisos App", perms: ["aviso:gestionar"] },
          { path: `${base}/beneficios`, icon: Gift, label: "Beneficios", perms: ["beneficio:gestionar"] },
        ],
      },
      {
        heading: "Colegio",
        items: [
          // Los componentes siguen en `src/website/`, pero la pantalla se monta en el panel.
          { path: `${base}/sitio`, icon: Globe, label: "Contenido del sitio", perms: ["contenido:editar"] },
          { path: `${base}/agenda`, icon: CalendarDays, label: "Calendario", perms: ["catalogo:leer"] },
        ],
      },
    ],
  },
];

// Menú del usuario (arriba a la derecha): lo personal y la administración del sistema.
export const MENU_USUARIO: MenuLink[] = [
  // Mismos permisos que exige la ruta: sin ellos el enlace llevaría a una pantalla que lo rebota.
  { ...MI_PERFIL, perms: ["medico:leer_propio", "medico:leer"] },
  { path: `${base}/institucion`, icon: Building2, label: "Datos del Colegio", perms: ["catalogo:leer"] },
  { path: `${base}/admin/permissions`, icon: ShieldUser, label: "Permisos y roles", perms: ["rbac:gestionar"] },
  { path: `${base}/actividad`, icon: History, label: "Registro de actividad", perms: ["rbac:gestionar"] },
  // Atajo hacia el sistema legacy, sin scope propio.
  { path: `${URL_BASE_LEGACY}/principal.php`, icon: Monitor, label: "Sistema viejo", external: true },
];

// ─── Socio (INGRESAR = 'D') ───────────────────────────────────────────────────

export const DOCTOR_TOP_NAV: TopEntry[] = [
  { kind: "link", path: `${base}/dashboard`, icon: Home, label: "Inicio" },
  VALIDACIONES_LINK,
  { kind: "link", path: `${base}/nomenclador/consulta-precios`, icon: DollarSign, label: "Consulta de precios" },
  { kind: "link", path: `${base}/boletin-valores`, icon: FileBoxIcon, label: "Valores boletín" },
  { kind: "link", path: `${base}/planillas`, icon: FileText, label: "Planillas" },
  { kind: "link", path: `${base}/facturacion/mi-recepcion`, icon: Receipt, label: "Mi recepción" },
  { kind: "link", path: MI_PERFIL.path, icon: MI_PERFIL.icon, label: MI_PERFIL.label },
];

export const MENU_USUARIO_SOCIO: MenuLink[] = [MI_PERFIL];

// ─── Ayudas ───────────────────────────────────────────────────────────────────

export const isActivePath = (current: string, target: string) =>
  current === target || current.startsWith(`${target}/`);

function menuItems(entry: TopMenu): MenuLink[] {
  return entry.columns.flatMap((c) => c.items);
}

export function entryActive(current: string, entry: TopEntry): boolean {
  if (entry.kind === "link") return isActivePath(current, entry.path);
  return menuItems(entry).some((i) => !i.external && isActivePath(current, i.path));
}

// `perms` es «alcanza con uno»: sin perms, lo ve cualquier usuario con sesión.
export function passesPerms(perms: string[] | undefined, can: (code: string) => boolean): boolean {
  return !perms || perms.length === 0 || perms.some(can);
}

// Una columna sin ningún ítem visible se oculta entera, título incluido.
export function columnVisible(col: MenuColumn, can: (code: string) => boolean): boolean {
  return col.items.some((i) => passesPerms(i.perms, can));
}

// El disparador de un menú se oculta si ninguna de sus columnas tiene algo para mostrar.
export function menuVisible(entry: TopMenu, can: (code: string) => boolean): boolean {
  return entry.columns.some((c) => columnVisible(c, can));
}

/** Una pantalla que el buscador puede ofrecer: el enlace y la sección a la que pertenece. */
export type Destino = MenuLink & { seccion: string };

/** Todas las pantallas que este usuario puede abrir, en el orden del menú. */
export function destinosVisibles(
  nav: TopEntry[],
  usuario: MenuLink[],
  can: (code: string) => boolean,
): Destino[] {
  const lista: Destino[] = [];
  for (const e of nav) {
    if (e.kind === "link") {
      if (passesPerms(e.perms, can)) lista.push({ path: e.path, icon: e.icon, label: e.label, perms: e.perms, seccion: e.label });
    } else {
      for (const i of menuItems(e)) if (passesPerms(i.perms, can)) lista.push({ ...i, seccion: e.label });
    }
  }
  for (const i of usuario) if (passesPerms(i.perms, can)) lista.push({ ...i, seccion: "Mi cuenta" });
  // Una misma ruta puede estar dos veces (Mi perfil del socio): queda la primera.
  const vistos = new Set<string>();
  return lista.filter((d) => (vistos.has(d.path) ? false : (vistos.add(d.path), true)));
}
