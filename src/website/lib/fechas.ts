export type Fechable = string | number | Date | null | undefined;

const FORMATOS = {
  /** 30 de septiembre de 2026 */
  larga: { year: "numeric", month: "long", day: "numeric" },
  /** 30 sept 2026 */
  corta: { day: "2-digit", month: "short", year: "numeric" },
  /** 30 sept 2026, 14:05 */
  conHora: {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

export type FormatoFecha = keyof typeof FORMATOS;

/** Fecha en castellano rioplatense; cadena vacía si no es una fecha válida. */
export function formatearFecha(fecha: Fechable, formato: FormatoFecha = "larga"): string {
  if (fecha === null || fecha === undefined || fecha === "") return "";
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-AR", FORMATOS[formato]).format(d);
}

/**
 * DD/MM/AAAA de una fecha ISO (`YYYY-MM-DD`) sin construir un `Date`: así no
 * se corre un día por la zona horaria.
 */
export function formatearFechaISO(iso: string | null): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}
