import { getJSON } from "./http";

/** Espejo de BeneficioOut del backend (app/modules/beneficios/schemas.py).
 *  Es la misma fila que administra el panel en src/app/pages/Beneficios —la
 *  base de la Revista de Beneficios para Socios—, sólo que `/vigentes` ya
 *  descarta los dados de baja y los vencidos. */
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

/** GET /api/beneficios/vigentes — ruta pública (app/auth/public.py): la
 *  consume un visitante anónimo del sitio, sin token. El tope del backend es
 *  24 y no pagina. */
export const listBeneficiosVigentes = (limit?: number) =>
  getJSON<BeneficioPublico[]>(
    "/api/beneficios/vigentes",
    limit ? { limit } : undefined
  );

/** DD/MM/AAAA sin construir un Date (evita el corrimiento por zona horaria). */
export function formatVigencia(iso: string | null): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}
