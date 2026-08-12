// Espejo de app/modules/reportes/schemas.py.
//
// Todo lo que devuelve el módulo son AGREGADOS calculados en la base, salvo
// `PrestacionReporte`, que es el único listado fila por fila (y va paginado).

export interface ResumenReporte {
  periodo: string;
  prestaciones: number;
  importe_total: number;
  honorarios: number;
  gastos: number;
  medicos: number;
  obras_sociales: number;
  codigos: number;
}

export interface CodigoStat {
  codigo: string;
  descripcion: string | null;
  cantidad: number;
  prestaciones: number;
  importe_total: number;
  medicos: number;
}

export interface MedicoStat {
  nro_socio: string;
  nombre: string | null;
  prestaciones: number;
  cantidad: number;
  importe_total: number;
}

export interface ObraSocialStat {
  obra_social_nro: string;
  nombre: string | null;
  prestaciones: number;
  importe_total: number;
  medicos: number;
}

/** Estado que devolvió la obra social. `null` = la fila no pasó por validaciones. */
export type ValidacionEstado =
  | "autorizada"
  | "rechazada"
  | "pendiente"
  | "cargada";

export interface PrestacionReporte {
  id: number;
  fecha: string | null;
  periodo: string;
  codigo: string | null;
  descripcion: string | null;
  nro_socio: string;
  medico: string | null;
  afiliado: string | null;
  nro_afiliado: string | null;
  cantidad: number;
  importe_total: number;
  autorizacion: string | null;
  validacion_estado: ValidacionEstado | null;
}

export interface PaginaPrestaciones {
  items: PrestacionReporte[];
  total: number;
}

export interface PuntoSerie {
  periodo: string;
  prestaciones: number;
  importe_total: number;
}

export type OrdenCodigos = "importe" | "cantidad" | "prestaciones" | "codigo";

// ─── Helpers de presentación ──────────────────────────────────────────────────

/** "202602" → "Febrero 2026" */
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function periodoLargo(periodo: string): string {
  if (!/^\d{6}$/.test(periodo)) return periodo;
  const anio = periodo.slice(0, 4);
  const mes = Number(periodo.slice(4, 6));
  return mes >= 1 && mes <= 12 ? `${MESES[mes - 1]} ${anio}` : periodo;
}

/** "202602" → "02/26", para los ejes de los gráficos. */
export function periodoCorto(periodo: string): string {
  if (!/^\d{6}$/.test(periodo)) return periodo;
  return `${periodo.slice(4, 6)}/${periodo.slice(2, 4)}`;
}

/** Período actual en YYYYMM. */
export function periodoActual(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Los últimos N períodos, del más nuevo al más viejo, para el selector. */
export function ultimosPeriodos(n = 24): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 0; i < n; i++) {
    out.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`);
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}

export const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export const moneyExacto = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const numero = new Intl.NumberFormat("es-AR");

/** Importes grandes en los ejes: 35.716.523 → "35,7 M". */
export function moneyCompacto(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} M`;
  if (Math.abs(v) >= 1_000) return `${Math.round(v / 1_000)} k`;
  return String(v);
}

// ─── Tamaño del ranking ───────────────────────────────────────────────────────

/**
 * Sobre cuántos registros se arma un ranking.
 *
 * `0` = todos, acotado por el tope del servidor. Cambia lo que se PIDE a la
 * API, no lo que se filtra en pantalla: pedir 200 para mostrar 5 desperdicia
 * la consulta y hace más lenta la vista.
 */
export const TOPES = [5, 10, 25, 50, 0] as const;
export type Tope = (typeof TOPES)[number];

/** Espejo de `service.MAX_LIMIT` del backend: "Todos" no puede pasarse de acá. */
export const TOPE_MAXIMO = 200;

export const aLimite = (t: Tope): number => (t === 0 ? TOPE_MAXIMO : t);

export const etiquetaTope = (t: Tope): string => (t === 0 ? "Todos" : `Top ${t}`);

export const ESTADO_LABEL: Record<ValidacionEstado, string> = {
  autorizada: "Autorizada",
  rechazada: "Rechazada",
  pendiente: "Pendiente",
  cargada: "Cargada",
};
