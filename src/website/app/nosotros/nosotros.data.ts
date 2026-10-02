import type { LucideIcon } from "lucide-react";
import type { TarjetaIcono } from "../../components/UI/TarjetasIcono/TarjetasIcono";
import { ClipboardCheck, Eye, Handshake, HeartHandshake, Lightbulb, Network, ShieldCheck, Target, Telescope, Users } from "lucide-react";

type Tarjeta = { icono: LucideIcon; titulo: string; texto: string };

/** Qué hace el Colegio, en un verbo cada cosa. */
export const PILARES: Tarjeta[] = [
  { icono: HeartHandshake, titulo: "Acompañamos", texto: "Cerca de cada profesional, en su día a día." },
  { icono: ClipboardCheck, titulo: "Gestionamos", texto: "Trámites y servicios, más simples." },
  { icono: Network, titulo: "Conectamos", texto: "Una red con el sistema de salud." },
];

export const PROPOSITO = [
  {
    icono: Target,
    titulo: "Misión",
    texto:
      "Acompañar a los profesionales de la salud con herramientas, representación y servicios que potencien su crecimiento.",
  },
  {
    icono: Telescope,
    titulo: "Visión",
    texto: "Ser una institución de referencia en calidad e innovación, con impacto real en el sistema de salud.",
  },
] satisfies Tarjeta[];

export const VALORES: TarjetaIcono[] = [
  { icono: ShieldCheck, titulo: "Compromiso", texto: "Con la comunidad y la ética." },
  { icono: Eye, titulo: "Transparencia", texto: "En la gestión y la comunicación." },
  { icono: Handshake, titulo: "Colaboración", texto: "Mejorar juntos, siempre." },
  { icono: Lightbulb, titulo: "Innovación", texto: "Mejores servicios cada día." },
];

export const DESTACADOS = [
  { icono: ShieldCheck, texto: "Respaldo" },
  { icono: Users, texto: "Comunidad" },
  { icono: Lightbulb, texto: "Innovación" },
];
