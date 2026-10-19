import type React from "react";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Restricción que evalúa las filas seleccionadas antes de permitir ejecutar. */
type Restriction<T> = {
  /** Mensaje explicativo que se muestra cuando la restricción bloquea la acción */
  message: string;
  /** Retorna true si la ejecución está PERMITIDA dado el conjunto de filas seleccionadas. */
  isAllowed: (selectedRows: T[]) => boolean;
};

/** Define una acción aplicable a una o más filas seleccionadas. */
export type ActionDef<T> = {
  /** Texto que aparece en el Select MUI */
  label: string;

  /** Método HTTP a utilizar */
  method: HttpMethod;

  endpoint: (row: T) => string;

  /** (Opcional) Body de la request. */
  payload?: (row: T) => Record<string, unknown>;

  /** (Opcional) Query params adicionales. */
  params?: (row: T) => Record<string, string | number | boolean>;

  /** (Opcional) Restricciones que se evalúan contra las filas seleccionadas. */
  restrictions?: Restriction<T>[];

  /** (Opcional) Mensaje de confirmación antes de ejecutar. */
  confirmMessage?: (selectedCount: number) => string;

  /** (Opcional) Callback ejecutado tras completar TODAS las peticiones. */
  onSuccess?: (succeeded: number, failed: number) => void;
};

/** Define una columna de la tabla. */
export type ColumnDef<T> = {
  /** Identificador único de la columna */
  key: string;

  /** Texto del encabezado */
  header: string;

  /** Renderizador personalizado. Si se omite, se usa `String(row[key])`. */
  render?: (row: T) => React.ReactNode;

  /** Clase CSS adicional para las celdas de esta columna */
  className?: string;

  /** Alinear el contenido a la derecha (útil para montos) */
  alignRight?: boolean;
};

/** Props del componente SelectableTable */
export type SelectableTableProps<T extends { id: number | string }> = {
  /** Filas de datos */
  rows: T[];

  /** Definición de columnas (en orden) */
  columns: ColumnDef<T>[];

  /** Acciones disponibles en el header */
  actions: ActionDef<T>[];

  /** (Opcional) Función que determina si una fila puede ser seleccionada. */
  isSelectable?: (row: T) => boolean;

  /** (Opcional) Clase CSS adicional por fila. Útil para indicar estados de carga. */
  rowClassName?: (row: T) => string | undefined;

  /** (Opcional) Mensaje cuando no hay filas */
  emptyMessage?: string;

  /** (Opcional) Estado de carga */
  loading?: boolean;

  /** (Opcional) Callback tras ejecutar cualquier acción (para refrescar datos) */
  onActionComplete?: () => void;
};
