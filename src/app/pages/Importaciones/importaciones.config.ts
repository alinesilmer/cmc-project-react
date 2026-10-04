// Catálogo de importadores.
//
// Sumar uno es agregar una entrada acá y su ruta en `routes.tsx`: el hub se
// arma solo con esta lista. No hay nada por importador en la pantalla del hub.

import logoPrevencion from "@/app/assets/obras-sociales/prevencion.jpg";
import logoSwiss from "@/app/assets/obras-sociales/swiss-medical.png";
import logoUnne from "@/app/assets/obras-sociales/issunne.png";

export interface ImportadorConfig {
  slug: string;
  nombre: string;
  /** Número de obra social, para buscarla por número igual que en Validaciones. */
  codigo?: number;
  logo: string;
  /** Qué archivo espera y qué hace con él. Una línea. */
  descripcion: string;
  /** `false` mientras el importador está a medio hacer: la tarjeta lo aclara. */
  disponible: boolean;
}

export const IMPORTADORES: ImportadorConfig[] = [
  {
    slug: "prevencion",
    nombre: "Prevención Salud",
    codigo: 103,
    logo: logoPrevencion,
    descripcion:
      "Reporte mensual de facturación. Reparte las prácticas entre los médicos por matrícula.",
    disponible: true,
  },
  {
    slug: "swiss",
    nombre: "Swiss Medical",
    codigo: 256,
    logo: logoSwiss,
    descripcion:
      "Reporte de liquidación. Traduce los códigos de Swiss y descuenta el copago ya cobrado.",
    disponible: true,
  },
  {
    slug: "unne",
    nombre: "UNNE",
    codigo: 81,
    logo: logoUnne,
    descripcion:
      "Excel de liquidación web del sistema de UNNE. Guarda el importe de UNNE y separa Hon+Gto.",
    disponible: true,
  },
];
