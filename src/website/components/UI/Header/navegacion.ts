import type { LucideIcon } from "lucide-react";
import {
  Gift,
  GraduationCap,
  Handshake,
  HeartPulse,
  HelpCircle,
  House,
  LayoutGrid,
  MessageCircle,
  Newspaper,
  ShieldCheck,
  Stethoscope,
  Trees,
  UserPlus,
  Users,
} from "lucide-react";

type EnlaceNav = { etiqueta: string; ruta: string; icono: LucideIcon };
export type ItemNav = EnlaceNav & { hijos?: EnlaceNav[] };

/**
 * El menú del sitio, con un ícono por sección: el escritorio y el celular lo
 * dibujan cada uno a su manera, pero la lista es una sola.
 */
export const NAVEGACION: ItemNav[] = [
  { etiqueta: "Inicio", ruta: "/", icono: House },
  { etiqueta: "Nosotros", ruta: "/nosotros", icono: Users },
  {
    etiqueta: "Servicios",
    ruta: "/servicios",
    icono: LayoutGrid,
    hijos: [
      { etiqueta: "Quiero ser socio", ruta: "/socios", icono: UserPlus },
      { etiqueta: "Seguro médico", ruta: "/seguros", icono: ShieldCheck },
      { etiqueta: "Convenios", ruta: "/convenios", icono: Handshake },
      { etiqueta: "Quinta", ruta: "/quinta", icono: Trees },
      { etiqueta: "Prevención Salud", ruta: "/prevencion-salud", icono: HeartPulse },
      { etiqueta: "Preguntas", ruta: "/preguntas-frecuentes", icono: HelpCircle },
    ],
  },
  { etiqueta: "Beneficios", ruta: "/beneficios", icono: Gift },
  { etiqueta: "Cursos", ruta: "/cursos", icono: GraduationCap },
  { etiqueta: "Noticias", ruta: "/noticias", icono: Newspaper },
  { etiqueta: "Médicos", ruta: "/medicos-asociados", icono: Stethoscope },
  { etiqueta: "Contacto", ruta: "/contacto", icono: MessageCircle },
];

/** `true` si la ruta actual está dentro de esa sección. */
export function esActiva(pathname: string, item: ItemNav): boolean {
  const coincide = (ruta: string) => (ruta === "/" ? pathname === "/" : pathname === ruta || pathname.startsWith(`${ruta}/`));
  return coincide(item.ruta) || Boolean(item.hijos?.some((h) => coincide(h.ruta)));
}
