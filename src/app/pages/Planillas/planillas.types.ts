// Planillas de consulta que el Colegio publica para los médicos.

export interface Planilla {
  /** `avisos.ID` */
  id: number;
  /** `avisos.AVISO` — descripción que carga el Colegio. */
  descripcion: string;
  /** Nombre del PDF, sin ruta. */
  archivo: string;
  /** `avisos.FECHA` — tal cual viene: hay filas `YYYY-MM-DD` y otras `DD/MM/YYYY`. */
  fecha: string;
  /** Por dónde pedir el PDF, resuelto por el backend: `/api/archivos/planillas/…` para las que se subieron desde el panel. */
  url?: string | null;
}

const LEGACY_BASE = (
  (import.meta.env.VITE_URL_BASE_LEGACY as string | undefined) ??
  "https://legacy.colegiomedicocorrientes.com"
).replace(/\/+$/, "");

/** URL del PDF. Se usa la que resolvió el backend; el fallback al sitio legacy cubre el caso de una API sin `LEGACY_BASE_URL` configurada. */
export const urlPlanilla = (p: Planilla) =>
  p.url ?? `${LEGACY_BASE}/${encodeURIComponent(p.archivo)}`;

/** `FECHA` es un `varchar(10)` sin formato único: conviven `2026-05-16` y `11/02/2026`. */
function parseFechaPlanilla(fecha: string): Date | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  const ddmmyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(fecha);
  if (ddmmyyyy)
    return new Date(Number(ddmmyyyy[3]), Number(ddmmyyyy[2]) - 1, Number(ddmmyyyy[1]));

  return null;
}

/** Siempre `DD/MM/AAAA`; si la fecha no se entiende, se muestra tal cual vino. */
export function formatFechaPlanilla(fecha: string): string {
  const d = parseFechaPlanilla(fecha);
  if (!d) return fecha;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** Más nuevas primero. Las fechas ilegibles quedan al final. */
export function ordenarPlanillas(planillas: Planilla[]): Planilla[] {
  return [...planillas].sort((a, b) => {
    const fa = parseFechaPlanilla(a.fecha)?.getTime() ?? -Infinity;
    const fb = parseFechaPlanilla(b.fecha)?.getTime() ?? -Infinity;
    if (fa !== fb) return fb - fa;
    return b.id - a.id;
  });
}
