import type React from "react";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * Restricción que evalúa las filas seleccionadas antes de permitir ejecutar.
 * Si `isAllowed` retorna false, el botón "Ejecutar" se deshabilita
 * y se muestra `message` al usuario.
 */
export type Restriction<T> = {
  /** Mensaje explicativo que se muestra cuando la restricción bloquea la acción */
  message: string;
  /**
   * Retorna true si la ejecución está PERMITIDA dado el conjunto de filas seleccionadas.
   * Retorna false para bloquear.
   */
  isAllowed: (selectedRows: T[]) => boolean;
};

/**
 * Define una acción aplicable a una o más filas seleccionadas.
 * Todos los campos que reciben `row` se evalúan una vez por fila seleccionada.
 */
export type ActionDef<T> = {
  /** Texto que aparece en el Select MUI */
  label: string;

  /** Método HTTP a utilizar */
  method: HttpMethod;

  /**
   * Función que recibe la fila y devuelve el endpoint relativo.
   * Ej: (row) => `/api/deducciones/${row.id}/colegio/deshacer`
   */
  endpoint: (row: T) => string;

  /**
   * (Opcional) Body de la request. Solo relevante para POST / PUT / PATCH.
   * Si no se provee, se envía sin body.
   */
  payload?: (row: T) => Record<string, unknown>;

  /**
   * (Opcional) Query params adicionales.
   * Se serializan con URLSearchParams y se concatenan al endpoint.
   */
  params?: (row: T) => Record<string, string | number | boolean>;

  /**
   * (Opcional) Restricciones que se evalúan contra las filas seleccionadas.
   * Si alguna falla, el botón "Ejecutar" se deshabilita y se muestra el mensaje.
   * Se evalúan en orden; se muestra el mensaje de la primera que falle.
   */
  restrictions?: Restriction<T>[];

  /**
   * (Opcional) Mensaje de confirmación antes de ejecutar.
   * Si se omite, se ejecuta directamente al hacer click en "Ejecutar".
   */
  confirmMessage?: (selectedCount: number) => string;

  /**
   * (Opcional) Callback ejecutado tras completar TODAS las peticiones.
   * Recibe cuántas se completaron y cuántas fallaron.
   */
  onSuccess?: (succeeded: number, failed: number) => void;
};

/**
 * Define una columna de la tabla.
 */
export type ColumnDef<T> = {
  /** Identificador único de la columna */
  key: string;

  /** Texto del encabezado */
  header: string;

  /**
   * Renderizador personalizado. Si se omite, se usa `String(row[key])`.
   */
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

  /**
   * (Opcional) Función que determina si una fila puede ser seleccionada.
   * Por defecto todas las filas son seleccionables.
   */
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
