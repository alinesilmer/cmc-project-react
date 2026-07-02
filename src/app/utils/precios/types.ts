// Tipos compartidos del importador de precios (PDF / Excel / CSV).

/** Fila normalizada que consumen el preview, el CSV y la importación. */
export type PrecioRow = {
  codigo: string;
  precio_1: string;
  precio_2: string;
  por_presupuesto: boolean;
};

/** Celda cruda de una hoja de cálculo. */
export type Cell = string | number | boolean | null;

/** Una hoja del libro (Excel puede traer varias; CSV trae una). */
export type SheetData = { name: string; grid: Cell[][] };

/** Mapeo de columnas de una hoja. `precio2` opcional (cirujano/ayudante). */
export type ColMapping = { codigo: number; precio1: number; precio2: number | null };

/** Tipo de archivo elegido por el usuario. */
export type FileKind = "pdf" | "excel" | "csv";
