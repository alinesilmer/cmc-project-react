import { getPublico } from "./http";

/** Espejo de BeneficioOut del backend (app/modules/beneficios/schemas.py). */
export interface BeneficioPublico {
  id: number;
  titulo: string;
  descripcion: string;
  descuento: string | null;
  categoria: string;
  color: string | null; // hex "#RRGGBB" — acento de la tarjeta
  ubicacion: string | null;
  vigencia_hasta: string | null; // ISO date (YYYY-MM-DD)
  activo: boolean;
  created_at: string;
  updated_at: string;
}

/** GET /api/beneficios/vigentes — ruta pública (app/auth/public.py): la consume un visitante anónimo del sitio, sin token. */
export const listBeneficiosVigentes = (limit?: number) =>
  getPublico<BeneficioPublico[]>(
    "/api/beneficios/vigentes",
    limit ? { limit } : undefined
  );

