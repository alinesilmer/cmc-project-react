# Migración — Nuevo componente `SelectableTable`

## 1. Relevamiento de tablas existentes

Contexto analizado: deducciones, débitos/créditos, refacturaciones y liquidaciones.

### DeduccionesList

**Archivo:** `src/app/pages/Deducciones/DeduccionesList.tsx`
**Columnas:** Médico · Concepto · Monto · Período · Cuota · Estado · Acciones
**Acciones por fila:** Agregar al pago / Pagar / Quitar / Editar / Eliminar / Cancelar (condicionales por estado)
**Selección múltiple:** No
**Observaciones:** Tiene filtros, paginación (50/pág) y exportación Excel + PDF.

### TabDeducciones (dentro del detalle de pago)

**Archivo:** `src/app/pages/Pagos/PagoDetalle/tabs/TabDeducciones.tsx`
**Columnas:** ID · Nombre · Nro. Colegio · Precio fijo · Porcentaje · Acciones
**Acciones por fila:** Generar / Deshacer / Editar (ocultas si `pago.estado = "C"`)
**Selección múltiple:** No
**Observaciones:** Acciones condicionales según si el descuento ya fue generado para el pago.

### DebitosCreditos (lista de lotes de ajuste)

**Archivo:** `src/app/pages/Pagos/DebitosCreditos/DebitosCreditos.tsx`
**Columnas:** Obra Social · Nro. Factura · Período · Estado · Pago · Débitos · Créditos · Acciones
**Acciones por fila:** Ver / Pasar al pago (si `C`) / Eliminar (si `A`)
**Selección múltiple:** No
**Observaciones:** Filtros por OS, mes, año y estado.

### RefacturacionesList

**Archivo:** `src/app/pages/Pagos/RefacturacionesList/RefacturacionesList.tsx`
**Columnas:** Obra Social · Nro. Factura · Período · Corrige · Estado · Pago · Débitos · Créditos · Acciones
**Acciones por fila:** Ver / Pasar al pago (si `C`) / Eliminar (si `A`)
**Selección múltiple:** No
**Observaciones:** Idéntico a DebitosCreditos pero con columna "Corrige".

### TabFacturas (detalle de pago)

**Archivo:** `src/app/pages/Pagos/PagoDetalle/tabs/TabFacturas.tsx`
**Columnas:** Obra Social · Período · Nro. Factura · Bruto · Débitos · Créditos · Neto · Acciones
**Acciones por fila:** Ver / Quitar (solo si `pago.estado = "A"`)
**Selección múltiple:** No

### TabResumen (vista previa del pago)

**Archivo:** `src/app/pages/Pagos/PagoDetalle/tabs/TabResumen.tsx`
**Tablas internas:**

- Liquidaciones: OS · Nro. Factura · Período · Bruto · Débitos · Créditos · Reconocido · Neto
- Deducciones: Concepto · Socios · Total Aplicado
- Lotes de Ajuste: OS · Período · Débitos · Créditos
- Refacturaciones: OS · Período · Débitos · Créditos

**Acciones por fila:** Ninguna (tablas de solo lectura/resumen)
**Selección múltiple:** No
**Observaciones:** Totales en `<tfoot>`. Exporta Excel y PDF.

---

## 2. Nuevo componente — `SelectableTable<T>`

### Propósito

Tabla genérica y reutilizable con:

- Selección de filas mediante checkboxes (primera columna).
- Columnas y datos completamente configurables por props.
- Header de acciones con un **Select MUI** (lista de acciones definidas externamente) y un botón **"Ejecutar"** que aplica la acción seleccionada a todas las filas marcadas.
- Usa los helpers HTTP del proyecto (`postJSON`, `putJSON`, `patchJSON`, `delJSON`, `getJSON`) para todas las peticiones.

### Ubicación

```
src/app/components/molecules/SelectableTable/
├── SelectableTable.tsx          # Componente principal
├── SelectableTable.module.scss  # Estilos
└── types.ts                     # Definición de tipos exportables
```

---

## 3. API del componente

### `types.ts`

```ts
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * Restricción evaluada contra las filas seleccionadas antes de ejecutar.
 * Si `isAllowed` retorna false, el botón "Ejecutar" se deshabilita
 * y se muestra `message` en el action bar.
 */
export type Restriction<T> = {
  /** Mensaje que se muestra cuando la restricción bloquea la acción */
  message: string;
  /**
   * Retorna true si la ejecución está PERMITIDA.
   * Recibe el array completo de filas actualmente seleccionadas.
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
   * (Opcional) Restricciones evaluadas contra la selección actual.
   * Se evalúan en orden; se muestra el mensaje de la primera que falle.
   * Mientras alguna falle el botón "Ejecutar" permanece deshabilitado.
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
   * Ej: (row) => <span className={styles.badge}>{row.estado}</span>
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

  /** (Opcional) Mensaje cuando no hay filas */
  emptyMessage?: string;

  /** (Opcional) Estado de carga */
  loading?: boolean;

  /** (Opcional) Callback tras ejecutar cualquier acción (para refrescar datos) */
  onActionComplete?: () => void;
};
```

---

### `SelectableTable.tsx` — estructura interna

```tsx
import React, { useState } from "react";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import {
  getJSON,
  postJSON,
  putJSON,
  patchJSON,
  delJSON,
} from "../../../lib/http";
import Button from "../atoms/Button/Button";
import styles from "./SelectableTable.module.scss";
import type { SelectableTableProps, ActionDef } from "./types";

function buildUrl<T>(action: ActionDef<T>, row: T): string {
  const base = action.endpoint(row);
  if (!action.params) return base;
  const qs = new URLSearchParams(
    Object.entries(action.params(row)).reduce(
      (acc, [k, v]) => ({ ...acc, [k]: String(v) }),
      {} as Record<string, string>,
    ),
  ).toString();
  return qs ? `${base}?${qs}` : base;
}

async function executeRequest<T>(action: ActionDef<T>, row: T): Promise<void> {
  const url = buildUrl(action, row);
  const body = action.payload?.(row);
  switch (action.method) {
    case "GET":
      await getJSON(url);
      break;
    case "POST":
      await postJSON(url, body ?? {});
      break;
    case "PUT":
      await putJSON(url, body ?? {});
      break;
    case "PATCH":
      await patchJSON(url, body ?? {});
      break;
    case "DELETE":
      await delJSON(url);
      break;
  }
}

function SelectableTable<T extends { id: number | string }>({
  rows,
  columns,
  actions,
  isSelectable = () => true,
  emptyMessage = "Sin resultados.",
  loading = false,
  onActionComplete,
}: SelectableTableProps<T>) {
  const [selected, setSelected] = useState<Set<T["id"]>>(new Set());
  const [activeAction, setActiveAction] = useState<string>(
    actions[0]?.label ?? "",
  );
  const [executing, setExecuting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selectableRows = rows.filter(isSelectable);
  const allSelected =
    selectableRows.length > 0 &&
    selectableRows.every((r) => selected.has(r.id));
  const someSelected = selectableRows.some((r) => selected.has(r.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectableRows.map((r) => r.id)));
    }
  };

  const toggleRow = (id: T["id"]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const currentAction = actions.find((a) => a.label === activeAction);
  const selectedRows = rows.filter((r) => selected.has(r.id));

  const handleEjecutar = () => {
    if (!currentAction || selectedRows.length === 0) return;
    if (currentAction.confirmMessage) {
      setConfirmOpen(true);
    } else {
      runAction();
    }
  };

  const runAction = async () => {
    if (!currentAction) return;
    setExecuting(true);
    setConfirmOpen(false);
    let succeeded = 0;
    let failed = 0;
    await Promise.allSettled(
      selectedRows.map((row) =>
        executeRequest(currentAction, row)
          .then(() => succeeded++)
          .catch(() => failed++),
      ),
    );
    setExecuting(false);
    setSelected(new Set());
    currentAction.onSuccess?.(succeeded, failed);
    onActionComplete?.();
  };

  const colCount = columns.length + 1; // +1 por checkbox

  return (
    <div className={styles.wrapper}>
      {/* ── Toolbar de acciones ── */}
      <div className={styles.actionBar}>
        {/* Checkbox seleccionar todo — toggle: click selecciona todo, uncheck deseleecciona */}
        <label
          className={styles.selectAllLabel}
          title={allSelected ? "Deseleccionar todo" : "Seleccionar todo"}
        >
          <input
            ref={selectAllRef}
            type="checkbox"
            className={styles.selectAllCheckbox}
            checked={allSelected}
            onChange={toggleAll} // si hay cualquier selección, limpia; si no hay, selecciona todo
            disabled={loading || selectableRows.length === 0}
            aria-label="Seleccionar / deseleccionar todo"
          />
        </label>

        <span className={styles.actionLabel}>Acciones</span>
        <Select
          size="small"
          value={activeAction}
          onChange={(e) => setActiveAction(e.target.value)}
          disabled={executing || actions.length === 0}
          sx={{ minWidth: 200, fontSize: 13 }}
        >
          {actions.map((a) => (
            <MenuItem key={a.label} value={a.label} sx={{ fontSize: 13 }}>
              {a.label}
            </MenuItem>
          ))}
        </Select>
        <Button
          variant="primary"
          size="sm"
          onClick={handleEjecutar}
          disabled={executing || !someSelected || actions.length === 0}
        >
          {executing ? "Ejecutando…" : "Ejecutar"}
        </Button>
        {someSelected && (
          <span className={styles.selectionCount}>
            {selectedRows.length} seleccionada
            {selectedRows.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── Tabla ── */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.checkboxCell}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected && !allSelected;
                  }}
                  onChange={toggleAll}
                  disabled={loading || selectableRows.length === 0}
                  aria-label="Seleccionar todas"
                />
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={col.alignRight ? styles.numCell : undefined}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={colCount} className={styles.loadingCell}>
                  Cargando…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={colCount} className={styles.emptyCell}>
                  {emptyMessage}
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row) => {
                const selectable = isSelectable(row);
                const isChecked = selected.has(row.id);
                return (
                  <tr
                    key={row.id}
                    className={isChecked ? styles.rowSelected : undefined}
                  >
                    <td className={styles.checkboxCell}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleRow(row.id)}
                        disabled={!selectable}
                        aria-label={`Seleccionar fila ${row.id}`}
                      />
                    </td>
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={
                          [
                            col.alignRight ? styles.numCell : "",
                            col.className ?? "",
                          ]
                            .filter(Boolean)
                            .join(" ") || undefined
                        }
                      >
                        {col.render
                          ? col.render(row)
                          : String((row as any)[col.key] ?? "")}
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* ── Modal de confirmación ── */}
      {confirmOpen && currentAction?.confirmMessage && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalCard}>
            <p>{currentAction.confirmMessage(selectedRows.length)}</p>
            <div className={styles.modalActions}>
              <Button
                variant="secondary"
                onClick={() => setConfirmOpen(false)}
                disabled={executing}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={runAction}
                disabled={executing}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SelectableTable;
```

---

## 4. Estilos — `SelectableTable.module.scss`

```scss
.wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Toolbar */
.actionBar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.actionLabel {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
}

.selectionCount {
  font-size: 12px;
  color: #64748b;
  margin-left: 4px;
}

/* Tabla */
.tableWrap {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;

  th,
  td {
    padding: 9px 12px;
    text-align: left;
    border-bottom: 1px solid #e2e8f0;
  }

  thead th {
    background: #f1f5f9;
    font-weight: 600;
    color: #475569;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  tbody tr:hover {
    background: #f8fafc;
  }
}

.checkboxCell {
  width: 40px;
  text-align: center !important;
  padding: 0 8px !important;
}

.numCell {
  text-align: right !important;
  font-variant-numeric: tabular-nums;
}

.rowSelected {
  background: #eff6ff !important;
}

.emptyCell,
.loadingCell {
  text-align: center !important;
  color: #94a3b8;
  padding: 32px 0 !important;
}

/* Modal confirmación */
.modalBackdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modalCard {
  background: #fff;
  border-radius: 12px;
  padding: 24px 28px;
  max-width: 420px;
  width: 100%;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);

  p {
    font-size: 14px;
    color: #1e293b;
    margin: 0 0 20px;
  }
}

.modalActions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
```

---

## 5. Ejemplo de uso — migración de `DeduccionesList`

Este ejemplo usa los tipos, helpers y estilos reales del archivo
`src/app/pages/Deducciones/DeduccionesList.tsx`.

### 5.1 Imports y columnas

```tsx
import SelectableTable from "../../components/molecules/SelectableTable/SelectableTable";
import type { ColumnDef, ActionDef } from "../../components/molecules/SelectableTable/types";
import { useAppSnackbar } from "../../hooks/useAppSnackbar";
import type { DeduccionHistorialItem } from "./types";
import { formatMoney, monthLabel, ESTADO_LABEL } from "./types";
import styles from "./DeduccionesList.module.scss";

// statusClass ya existe en el archivo — mapea DeduccionEstado → className del badge
const columns: ColumnDef<DeduccionHistorialItem>[] = [
  { key: "medico_nombre",    header: "Médico" },
  { key: "descuento_nombre", header: "Concepto" },
  {
    key: "monto",
    header: "Monto",
    alignRight: true,
    render: (r) => formatMoney(r.monto),
  },
  {
    key: "periodo",
    header: "Período",
    render: (r) => monthLabel(r.mes_periodo, r.anio_periodo),
  },
  {
    key: "cuota",
    header: "Cuota",
    render: (r) =>
      r.origen === "manual" ? `${r.cuota_nro}/${r.cuotas_total ?? "—"}` : "—",
  },
  {
    key: "estado",
    header: "Estado",
    render: (r) => (
      <span className={`${styles.badge} ${statusClass(r.estado)}`}>
        {ESTADO_LABEL[r.estado]}
      </span>
    ),
  },
];
```

### 5.2 Acciones con restricciones

```tsx
const buildActions = (
  notify: ReturnType<typeof useAppSnackbar>,
  onDone: () => void,
): ActionDef<DeduccionHistorialItem>[] => [

  // ── Quitar del pago ───────────────────────────────────────────────────
  // Solo ejecutable si TODAS las seleccionadas tienen estado "en_pago".
  // Si se mezcla con una "pendiente", la restricción bloquea y muestra el mensaje.
  {
    label: "Quitar del pago",
    method: "PATCH",
    endpoint: (r) => `/api/deducciones/historial/${r.id}/estado`,
    payload:  () => ({ estado: "pendiente" }),
    restrictions: [
      {
        message: 'Solo podés quitar deducciones con estado "En pago". Hay seleccionadas con otro estado.',
        isAllowed: (rows) => rows.every((r) => r.estado === "en_pago"),
      },
    ],
    confirmMessage: (n) =>
      `¿Quitar ${n} deducción${n !== 1 ? "es" : ""} del pago? Volverán a estado pendiente.`,
    onSuccess: (ok, fail) => {
      notify(
        `${ok} deducción${ok !== 1 ? "es" : ""} quitada${ok !== 1 ? "s" : ""} del pago${fail ? `, ${fail} fallaron` : ""}.`,
      );
      onDone();
    },
  },

  // ── Agregar al pago ───────────────────────────────────────────────────
  // Solo ejecutable si TODAS son "pendiente" o "vencida".
  {
    label: "Agregar al pago",
    method: "PATCH",
    endpoint: (r) => `/api/deducciones/historial/${r.id}/estado`,
    payload:  () => ({ estado: "en_pago" }),
    restrictions: [
      {
        message: 'Solo podés agregar deducciones con estado "Pendiente" o "Vencida".',
        isAllowed: (rows) =>
          rows.every((r) => r.estado === "pendiente" || r.estado === "vencida"),
      },
    ],
    confirmMessage: (n) =>
      `¿Agregar ${n} deducción${n !== 1 ? "es" : ""} al pago activo?`,
    onSuccess: (ok, fail) => {
      notify(
        `${ok} agregada${ok !== 1 ? "s" : ""} al pago${fail ? `, ${fail} fallaron` : ""}.`,
      );
      onDone();
    },
  },

  // ── Eliminar ──────────────────────────────────────────────────────────
  // Bloqueado si alguna tiene estado "aplicado" (ya fue procesada).
  {
    label: "Eliminar",
    method: "DELETE",
    endpoint: (r) => `/api/deducciones/historial/${r.id}`,
    restrictions: [
      {
        message: 'No se pueden eliminar deducciones con estado "Aplicado".',
        isAllowed: (rows) => rows.every((r) => r.estado !== "aplicado"),
      },
    ],
    confirmMessage: (n) =>
      `¿Eliminar ${n} deducción${n !== 1 ? "es" : ""}? Esta acción no se puede deshacer.`,
    onSuccess: (ok, fail) => {
      notify(
        `${ok} eliminada${ok !== 1 ? "s" : ""}${fail ? `, ${fail} fallaron` : ""}.`,
      );
      onDone();
    },
  },
];
```

### 5.3 Reemplazo en el render

Dentro del componente `DeduccionesList`, la `<Card>` que hoy contiene el
`<table>` manual se reemplaza por:

```tsx
<Card className={styles.tableCard}>
  <SelectableTable
    rows={filteredItems}
    columns={columns}
    actions={buildActions(notify, refreshAll)}
    // "aplicado" y "cancelado" no son seleccionables: no tiene sentido
    // ejecutar acciones bulk sobre ellas y evita que pasen las restricciones.
    isSelectable={(r) => r.estado !== "aplicado" && r.estado !== "cancelado"}
    emptyMessage="Sin deducciones para los filtros actuales."
    loading={loading}
    onActionComplete={refreshAll}
  />
</Card>
```

### 5.4 Flujo para "Quitar del pago" con selección mixta

```
Usuario selecciona fila A (en_pago) + fila B (pendiente)
  → restriction.isAllowed([A, B])
  → rows.every(r => r.estado === "en_pago")  →  false  (B falla)
  → botón "Ejecutar" deshabilitado
  → action bar muestra: ⚠ Solo podés quitar deducciones con estado "En pago"...

Usuario deselecciona fila B → quedan solo filas con estado "en_pago"
  → restriction.isAllowed([A])  →  true
  → botón "Ejecutar" habilitado
  → click → modal de confirmación
  → confirmar → PATCH /api/deducciones/historial/{A.id}/estado  { estado: "pendiente" }
  → onSuccess → notify + refreshAll
```

---

## 6. Posibles migraciones

| Tabla actual                 | Acción bulk potencial            | Prioridad |
| ---------------------------- | -------------------------------- | --------- |
| `DeduccionesList`            | Agregar al pago / Eliminar       | Alta      |
| `DebitosCreditos`            | Pasar al pago / Eliminar         | Alta      |
| `RefacturacionesList`        | Pasar al pago / Eliminar         | Alta      |
| `TabFacturas` (detalle pago) | Quitar del pago                  | Media     |
| `TabDeducciones`             | Generar / Deshacer por descuento | Media     |

---

## 7. Comportamiento del checkbox "Seleccionar todo"

El checkbox se ubica a la izquierda del label "Acciones" en el action bar. Funciona como toggle:

| Estado actual                         | Click → resultado                                |
| ------------------------------------- | ------------------------------------------------ |
| Ninguna seleccionada                  | Selecciona todas las filas `isSelectable = true` |
| Algunas seleccionadas (indeterminate) | Deseleecciona todas                              |
| Todas seleccionadas                   | Deseleecciona todas                              |

El estado `indeterminate` se aplica directamente via `ref` al DOM del input para respetar el comportamiento nativo del checkbox.

---

## 8. Comportamiento de restricciones

Las restricciones se definen por acción en `ActionDef.restrictions`. Se evalúan **en tiempo real** cada vez que cambia la selección o la acción activa.

**Lógica:**

1. Se recorre el array `restrictions` en orden.
2. Se llama `isAllowed(selectedRows)` en cada una.
3. Si alguna retorna `false` → el botón "Ejecutar" se deshabilita y se muestra el `message` de esa restricción en el action bar (con estilo de advertencia en rojo).
4. Si todas retornan `true` → el botón se habilita normalmente.

**Ejemplo de restricciones comunes:**

```ts
// Solo una fila a la vez
{ message: "Esta acción solo puede ejecutarse sobre una fila a la vez.", isAllowed: (rows) => rows.length === 1 }

// Solo filas con estado "pendiente"
{ message: "Solo se pueden procesar deducciones en estado pendiente.", isAllowed: (rows) => rows.every(r => r.estado === "pendiente") }

// No mezclar tipos
{ message: "No podés mezclar débitos y créditos en la misma ejecución.", isAllowed: (rows) => rows.every(r => r.tipo === rows[0].tipo) }

// Requerir al menos 2
{ message: "Seleccioná al menos 2 filas para usar esta acción.", isAllowed: (rows) => rows.length >= 2 }
```

---

## 9. Notas de implementación

- **Requests concurrentes:** `runAction` usa `Promise.allSettled` para disparar todas las peticiones en paralelo y no abortar si una falla.
- **HTTP helpers:** Siempre se usa `getJSON` / `postJSON` / `putJSON` / `patchJSON` / `delJSON` de `src/app/lib/http.ts`. Nunca `fetch` ni `axios` directo.
- **indeterminate checkbox:** Tanto el checkbox del action bar usa `ref` para setear `.indeterminate` directamente en el DOM (no es prop de React). El `<thead>` no tiene checkbox propio; la selección total se gestiona desde el action bar.
- **Toggle all:** Si hay cualquier selección activa (total o parcial), el click limpia todo. Solo si no hay nada seleccionado, selecciona todas las filas elegibles.
- **Click en fila:** Además del checkbox, el click en cualquier celda de una fila `isSelectable` también la selecciona/deselecciona.
- **Restricciones reactivas:** Se re-evalúan en cada render sin efecto secundario. No hay estado propio; son funciones puras sobre `selectedRows`.
- **Accesibilidad:** Cada checkbox tiene `aria-label`. El toolbar no bloquea el foco.
- **Genérico:** El componente usa `T extends { id: number | string }` como único requisito sobre la forma de los datos.
