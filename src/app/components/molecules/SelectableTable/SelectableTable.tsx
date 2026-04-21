import React, { useRef, useState } from "react";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { getJSON, postJSON, putJSON, patchJSON, delJSON } from "../../../lib/http";
import Button from "../../atoms/Button/Button";
import styles from "./SelectableTable.module.scss";
import type { ActionDef, SelectableTableProps } from "./types";

function buildUrl<T>(action: ActionDef<T>, row: T): string {
  const base = action.endpoint(row);
  if (!action.params) return base;
  const qs = new URLSearchParams(
    Object.entries(action.params(row)).reduce(
      (acc, [k, v]) => ({ ...acc, [k]: String(v) }),
      {} as Record<string, string>
    )
  ).toString();
  return qs ? `${base}?${qs}` : base;
}

async function executeRequest<T>(action: ActionDef<T>, row: T): Promise<void> {
  const url = buildUrl(action, row);
  const body = action.payload?.(row);
  switch (action.method) {
    case "GET":    await getJSON(url); break;
    case "POST":   await postJSON(url, body ?? {}); break;
    case "PUT":    await putJSON(url, body ?? {}); break;
    case "PATCH":  await patchJSON(url, body ?? {}); break;
    case "DELETE": await delJSON(url); break;
  }
}

function SelectableTable<T extends { id: number | string }>({
  rows,
  columns,
  actions,
  isSelectable = () => true,
  rowClassName,
  emptyMessage = "Sin resultados.",
  loading = false,
  onActionComplete,
}: SelectableTableProps<T>) {
  const [selected, setSelected] = useState<Set<T["id"]>>(new Set());
  const [activeAction, setActiveAction] = useState<string>("");
  const [executing, setExecuting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selectAllRef = useRef<HTMLInputElement>(null);

  const selectableRows = rows.filter(isSelectable);
  const allSelected =
    selectableRows.length > 0 && selectableRows.every((r) => selected.has(r.id));
  const someSelected = selectableRows.some((r) => selected.has(r.id));

  // Sync indeterminate state on the actionBar checkbox
  if (selectAllRef.current) {
    selectAllRef.current.indeterminate = someSelected && !allSelected;
  }

  const toggleAll = () => {
    if (allSelected || someSelected) {
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

  // Evaluate restrictions for the current action against selected rows
  const failingRestriction =
    selectedRows.length > 0
      ? currentAction?.restrictions?.find((r) => !r.isAllowed(selectedRows))
      : undefined;

  const canExecute =
    !executing && someSelected && !!activeAction && !failingRestriction;

  const handleEjecutar = () => {
    if (!canExecute || !currentAction) return;
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
          .catch(() => failed++)
      )
    );
    setExecuting(false);
    setSelected(new Set());
    currentAction.onSuccess?.(succeeded, failed);
    onActionComplete?.();
  };

  const colCount = columns.length + 1; // +1 por checkbox

  return (
    <div className={styles.wrapper}>
      {/* ── Action bar ── */}
      <div className={styles.actionBar}>
        {/* Checkbox seleccionar todo (toggle) */}
        <label className={styles.selectAllLabel} title={allSelected ? "Deseleccionar todo" : "Seleccionar todo"}>
          <input
            ref={selectAllRef}
            type="checkbox"
            className={styles.selectAllCheckbox}
            checked={allSelected}
            onChange={toggleAll}
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
          displayEmpty
          sx={{ minWidth: 200, fontSize: 13 }}
          renderValue={(val) =>
            val ? val : <span style={{ color: "#94a3b8" }}>Seleccionar...</span>
          }
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
          disabled={!canExecute}
        >
          {executing ? "Ejecutando…" : "Ejecutar"}
        </Button>

        <div className={styles.statusArea}>
          {someSelected && !failingRestriction && (
            <span className={styles.selectionCount}>
              {selectedRows.length} seleccionada{selectedRows.length !== 1 ? "s" : ""}
            </span>
          )}
          {someSelected && failingRestriction && (
            <span className={styles.restrictionMsg}>
              {failingRestriction.message}
            </span>
          )}
        </div>
      </div>

      {/* ── Tabla ── */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.checkboxCell} />
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
                <td colSpan={colCount} className={styles.stateCell}>
                  Cargando…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={colCount} className={styles.stateCell}>
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
                    className={
                      [isChecked ? styles.rowSelected : "", rowClassName?.(row) ?? ""]
                        .filter(Boolean)
                        .join(" ") || undefined
                    }
                    onClick={() => selectable && toggleRow(row.id)}
                    style={selectable ? { cursor: "pointer" } : undefined}
                  >
                    <td className={styles.checkboxCell} onClick={(e) => e.stopPropagation()}>
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
                          [col.alignRight ? styles.numCell : "", col.className ?? ""]
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
        <div className={styles.modalBackdrop} onClick={() => !executing && setConfirmOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <p>{currentAction.confirmMessage(selectedRows.length)}</p>
            <div className={styles.modalActions}>
              <Button
                variant="secondary"
                onClick={() => setConfirmOpen(false)}
                disabled={executing}
              >
                Cancelar
              </Button>
              <Button variant="primary" onClick={runAction} disabled={executing}>
                {executing ? "Ejecutando…" : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SelectableTable;
