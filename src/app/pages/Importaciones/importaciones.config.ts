// Catálogo de importadores.

import logoPrevencion from "@/app/assets/obras-sociales/prevencion.jpg";
import logoSwiss from "@/app/assets/obras-sociales/swiss-medical.png";
import logoUnne from "@/app/assets/obras-sociales/issunne.png";

export interface ImportadorConfig {
  slug: string;
  nombre: string;
  logo: string;
  /** Qué archivo espera y qué hace con él. Una línea. */
  disponible: boolean;
}

export const IMPORTADORES: ImportadorConfig[] = [
  {
    slug: "prevencion",
    nombre: "Prevención Salud",
    logo: logoPrevencion,
    disponible: true,
  },
  {
    slug: "swiss",
    nombre: "Swiss Medical",
    logo: logoSwiss,
    disponible: true,
  },
  {
    slug: "unne",
    nombre: "UNNE",
    logo: logoUnne,
    disponible: true,
  },
];
