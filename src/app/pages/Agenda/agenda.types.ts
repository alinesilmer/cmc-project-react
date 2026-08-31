// Los tres calendarios del Colegio: feriados, cumpleaños y tareas del mes.
// Una sola tabla discriminada por `tipo`; lo que cambia entre ellos es cómo se
// ubica el evento en el almanaque:
//
//     "unica"    usa `fecha`        un día puntual de un año puntual
//     "anual"    usa `dia` + `mes`  se repite cada año   (cumpleaños)
//     "mensual"  usa `dia`          se repite cada mes   (tareas)

export type TipoEvento = "feriado" | "cumpleanos" | "tarea";
export type Recurrencia = "unica" | "anual" | "mensual";

export interface EventoAgenda {
  id: number;
  tipo: TipoEvento;
  titulo: string;
  descripcion?: string | null;
  recurrencia: Recurrencia;
  /** `YYYY-MM-DD`. Sólo en `recurrencia: "unica"`. */
  fecha?: string | null;
  /** 1..31. En `anual` y `mensual`. */
  dia?: number | null;
  /** 1..12. Sólo en `anual`. */
  mes?: number | null;
  medico_id?: number | null;
  responsable?: string | null;
  color?: string | null;
  activo: boolean;
}

/**
 * Un evento ya ubicado en un día concreto del mes, tal como lo devuelve
 * `GET /api/agenda/mes`. La expansión la hace el backend: el 31 en un mes de 30
 * y el 29 de febrero son fáciles de resolver mal y habría que repetir la regla
 * en cada consumidor.
 */
export interface OcurrenciaAgenda extends EventoAgenda {
  /** `YYYY-MM-DD` dentro del mes pedido. */
  ocurre_el: string;
}

export type EventoInput = Omit<EventoAgenda, "id">;

/**
 * Alguien del personal del Colegio (rol ≠ `medico`), para el selector de
 * responsable. El evento guarda el nombre, no el `id`: `responsable` es texto
 * porque también admite un área ("Facturación").
 */
export interface Responsable {
  id: number;
  nombre: string;
  /** Uno o más: hay gente con `facturador` y `liquidador` a la vez. */
  roles: string[];
}

// ── Presentación ─────────────────────────────────────────────────────────────

export const TIPOS: { valor: TipoEvento; label: string; color: string }[] = [
  { valor: "feriado", label: "Feriados", color: "#cc2a2a" },
  { valor: "cumpleanos", label: "Cumpleaños", color: "#1d9148" },
  { valor: "tarea", label: "Tareas del mes", color: "#173f70" },
];

const COLOR_TIPO: Record<TipoEvento, string> = {
  feriado: "#cc2a2a",
  cumpleanos: "#1d9148",
  tarea: "#173f70",
};

/** Singular, para hablar de un evento suelto ("Nuevo feriado"). */
export const LABEL_TIPO: Record<TipoEvento, string> = {
  feriado: "feriado",
  cumpleanos: "cumpleaños",
  tarea: "tarea",
};

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** Lunes primero, que es como se lee un almanaque acá. */
export const DIAS_SEMANA = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/**
 * El color del evento si es un hex válido, si no el de su tipo.
 *
 * `color` es texto libre que viene de la API y termina en un `style`; sin
 * filtrarlo, un valor cargado a mano mete CSS arbitrario y rompe la grilla.
 */
export function colorDe(e: { color?: string | null; tipo: TipoEvento }): string {
  const c = e.color?.trim();
  return c && HEX.test(c) ? c : COLOR_TIPO[e.tipo];
}

/** "9 de julio de 2026", "14 de marzo, todos los años", "el 31 de cada mes". */
export function describirCuando(e: EventoAgenda): string {
  if (e.recurrencia === "unica" && e.fecha) {
    const [a, m, d] = e.fecha.split("-");
    return `${Number(d)} de ${MESES[Number(m) - 1].toLowerCase()} de ${a}`;
  }
  if (e.recurrencia === "anual" && e.dia && e.mes) {
    return `${e.dia} de ${MESES[e.mes - 1].toLowerCase()}, todos los años`;
  }
  if (e.recurrencia === "mensual" && e.dia) return `el ${e.dia} de cada mes`;
  return "—";
}

/**
 * En qué casilla arranca el mes, contando desde el lunes. Usa componentes
 * locales, sin el corrimiento de zona de `new Date("YYYY-MM-DD")`.
 */
export function offsetPrimerDia(anio: number, mes: number): number {
  return (new Date(anio, mes - 1, 1).getDay() + 6) % 7;
}

export function diasEnMes(anio: number, mes: number): number {
  return new Date(anio, mes, 0).getDate();
}
