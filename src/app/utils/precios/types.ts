// Tipos compartidos del importador de precios (PDF / Excel / CSV).

/** Fila normalizada que consumen el preview, el CSV y la importación. */
export type PrecioRow = {
  codigo: string;
  /** Honorarios (cirujano). */
  precio_1: string;
  /** Ayudante. */
  precio_2: string;
  /** Gastos. */
  gastos: string;
  por_presupuesto: boolean;
};

/** Celda cruda de una hoja de cálculo. */
export type Cell = string | number | boolean | null;

/** Una hoja del libro (Excel puede traer varias; CSV trae una). */
export type SheetData = { name: string; grid: Cell[][] };

/**
 * Mapeo de columnas de una hoja. `precio1` = Honorarios (cirujano),
 * `precio2` = Ayudante y `gastos` = Gastos; los dos últimos son opcionales.
 */
export type ColMapping = {
  codigo: number;
  precio1: number;
  precio2: number | null;
  gastos: number | null;
};

/** Tipo de archivo elegido por el usuario. */
export type FileKind = "pdf" | "excel" | "csv";
