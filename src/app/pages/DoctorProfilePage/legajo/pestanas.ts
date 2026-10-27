import {
  BarChart3,
  Building2,
  Contact,
  FileText,
  HandCoins,
  ScrollText,
  ShieldCheck,
  Stethoscope,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TabKey } from "./legajo.types";

// El resto de las pestañas se rotula con su clave capitalizada.
export const TAB_LABELS: Partial<Record<TabKey, string>> = {
  valoresPdf: "Valores PDF",
};

// Íconos de las pestañas, en "Mi perfil" y en el legajo del Colegio.
export const TAB_ICONS: Partial<Record<TabKey, LucideIcon>> = {
  datos: User,
  documentos: FileText,
  conceptos: HandCoins,
  especialidades: Stethoscope,
  padrones: Building2,
  credencial: Contact,
  valoresPdf: ScrollText,
  reportes: BarChart3,
  permisos: ShieldCheck,
};
