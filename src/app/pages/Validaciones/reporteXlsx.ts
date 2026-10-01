// Utilidades compartidas para leer los reportes de facturación que mandan las
// obras sociales (Prevención Salud, Swiss Medical).
//
// Son planillas armadas por la obra social, no por nosotros: los encabezados
// cambian de acento, de mayúsculas y de posición entre una emisión y otra, y
// algunas traen hojas de resumen antes que las de datos. Todo lo que resuelve
// eso vive acá una sola vez; lo que cambia de un reporte a otro es qué columnas
// se buscan y qué se hace con cada fila, y eso queda en el parser de cada una.

/** Una columna buscada: la clave con la que la conoce el parser y los títulos
 * que la obra social pudo haber escrito, ya normalizados. */
export interface ColumnaSpec<K extends string> {
  key: K;
  alias: string[];
}

/** Dónde quedaron los datos dentro del libro. */
export interface Encabezado<K extends string> {
  hoja: string;
  grilla: unknown[][];
  /** Índice de la fila de títulos dentro de `grilla`. */
  fila: number;
  /** Índice de columna de cada clave encontrada. */
  columnas: Partial<Record<K, number>>;
}

/** Mayúsculas sin acentos, paréntesis ni puntuación: así "Práctica(s)
 * Realizada(s)", "PRACTICAS REALIZADAS" y "practicas realizadas" caen todas en
 * el mismo alias. Los guiones bajos de los títulos de Swiss ("Razón_Social")
 * cuentan como separador. */
export const normalizarTitulo = (valor: unknown): string =>
  String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[()]/g, "")
    .replace(/[._°ºª:,;-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

const dosDigitos = (n: number) => String(n).padStart(2, "0");

const esFechaValida = (d: Date) => !Number.isNaN(d.getTime());

/** Las celdas de fecha de Excel llegan a medianoche UTC, así que se leen con
 * los getters UTC: con los locales, en un huso al oeste de Greenwich —el
 * nuestro— toda fecha se corre un día para atrás. */
const fechaCorta = (d: Date) =>
  `${dosDigitos(d.getUTCDate())}/${dosDigitos(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;

const fechaISO = (d: Date) =>
  `${d.getUTCFullYear()}-${dosDigitos(d.getUTCMonth() + 1)}-${dosDigitos(d.getUTCDate())}`;

/** Texto de una celda, con la fecha ya formateada si vino como fecha.
 *
 * Recorta sólo las puntas: los reportes vienen con las columnas rellenadas a
 * ancho fijo ("42013200  ", "W-3972    "), pero el interior no se toca porque
 * hay nombres con doble espacio en los datos reales. */
export const textoCelda = (valor: unknown): string =>
  valor instanceof Date && esFechaValida(valor)
    ? fechaCorta(valor)
    : String(valor ?? "").trim();

/** Una fecha leída de la planilla, en los dos formatos que hacen falta:
 * `corta` para mostrar y `iso` para ordenar y comparar. `iso` queda en "" si la
 * celda no era una fecha reconocible. */
export interface FechaCelda {
  corta: string;
  iso: string;
}

const DD_MM_AAAA = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/;

/** Acepta las tres formas en las que llegan las fechas: celda de fecha de
 * Excel, "20/09/2026" y "20/09/2026   16:05:48" (Swiss manda la hora pegada en
 * la misma celda, separada por relleno). */
export const fechaDeCelda = (valor: unknown): FechaCelda => {
  if (valor instanceof Date && esFechaValida(valor)) {
    return { corta: fechaCorta(valor), iso: fechaISO(valor) };
  }

  const crudo = String(valor ?? "").trim();
  const m = crudo.match(DD_MM_AAAA);
  if (!m) return { corta: crudo, iso: "" };

  const [, dia, mes, anio] = m;
  return {
    corta: `${dosDigitos(Number(dia))}/${dosDigitos(Number(mes))}/${anio}`,
    iso: `${anio}-${dosDigitos(Number(mes))}-${dosDigitos(Number(dia))}`,
  };
};

/** Número de una celda que puede venir como número, como texto con coma
 * decimal o vacía. Devuelve 0 para lo que no se pueda leer: estos reportes
 * traen importes y cantidades, y un NaN propagado a un total es peor que un 0
 * visible. */
export const numeroDeCelda = (valor: unknown): number => {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
  const limpio = String(valor ?? "")
    .trim()
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(limpio);
  return Number.isFinite(n) ? n : 0;
};

/** Índice de cada columna buscada dentro de una fila de títulos. */
function mapearColumnas<K extends string>(
  fila: unknown[],
  columnas: ColumnaSpec<K>[]
): Partial<Record<K, number>> {
  const mapa: Partial<Record<K, number>> = {};
  fila.forEach((celda, i) => {
    const titulo = normalizarTitulo(celda);
    if (!titulo) return;
    const col = columnas.find(
      (c) => mapa[c.key] === undefined && c.alias.includes(titulo)
    );
    if (col) mapa[col.key] = i;
  });
  return mapa;
}

export interface OpcionesEncabezado {
  /** Cuántas columnas tienen que coincidir para dar la fila por buena. */
  minColumnas?: number;
  /** Hasta qué fila de cada hoja se busca el encabezado. */
  filasAExplorar?: number;
}

/** Cada hoja del libro como grilla de filas. */
export type Libro = {
  hojas: string[];
  grilla: (hoja: string) => unknown[][];
};

/** Abre el archivo y devuelve sus hojas. `xlsx` se importa acá adentro para que
 * no entre al bundle de quien nunca sube un reporte. */
export async function abrirLibro(file: File): Promise<Libro> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), {
    type: "array",
    cellDates: true,
  });

  return {
    hojas: wb.SheetNames,
    grilla: (nombre) => {
      const hoja = wb.Sheets[nombre];
      if (!hoja) return [];
      return XLSX.utils.sheet_to_json<unknown[]>(hoja, {
        header: 1,
        defval: "",
        blankrows: false,
      });
    },
  };
}

/**
 * Busca en qué hoja y en qué fila están los títulos.
 *
 * Recorre las hojas en orden y se queda con la primera fila que reconozca al
 * menos `minColumnas` de las buscadas, en lugar de asumir que los datos están
 * en la primera hoja y en la primera fila: Prevención Salud manda dos hojas sin
 * orden garantizado y algunos reportes arrancan con filas de membrete.
 */
export function ubicarEncabezado<K extends string>(
  libro: Libro,
  columnas: ColumnaSpec<K>[],
  { minColumnas = 3, filasAExplorar = 15 }: OpcionesEncabezado = {}
): Encabezado<K> | null {
  for (const hoja of libro.hojas) {
    const grilla = libro.grilla(hoja);
    const hasta = Math.min(grilla.length, filasAExplorar);
    for (let fila = 0; fila < hasta; fila++) {
      const mapa = mapearColumnas(grilla[fila] ?? [], columnas);
      if (Object.keys(mapa).length >= minColumnas) {
        return { hoja, grilla, fila, columnas: mapa };
      }
    }
  }
  return null;
}

/** Lector de celdas por clave de columna, ya atado a un encabezado. */
export const lectorDeFila =
  <K extends string>(enc: Encabezado<K>) =>
  (fila: unknown[], key: K): unknown => {
    const i = enc.columnas[key];
    return i === undefined ? "" : fila[i];
  };

/** Las filas de datos: lo que hay debajo del encabezado. */
export const filasDeDatos = <K extends string>(enc: Encabezado<K>): unknown[][] =>
  enc.grilla.slice(enc.fila + 1);
