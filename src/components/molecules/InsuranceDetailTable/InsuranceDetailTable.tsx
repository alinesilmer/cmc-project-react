"use client";

import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  useDeferredValue,
  useTransition,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Virtuoso, type Components } from "react-virtuoso";
import styles from "./InsuranceDetailTable.module.scss";
import Alert from "../../atoms/Alert/Alert";
import SearchBar from "../../../components/molecules/SearchBar/SearchBar";

/* ===================== Types ===================== */

export type InsuranceRow = {
  det_id: string | number; // DetalleLiquidacion.id
  socio: string | number;
  nombreSocio: string;
  matri: string | number;
  nroOrden: string | number;
  fecha: string;
  codigo: string | number;
  nroAfiliado: string | number;
  afiliado: string;
  xCant: string;
  porcentaje: number;
  honorarios: number;
  gastos: number;
  coseguro: number;
  importe: number;
  pagado: number;
  tipo?: "N" | "C" | "D";
  monto?: number;
  obs?: string | null;
  total?: number;
};

type Props = {
  period: string;
  rows: InsuranceRow[]; // TODAS las filas
  onChange: (rows: InsuranceRow[]) => void;
  onSaveRow?: (row: InsuranceRow) => Promise<void> | void;

  loading?: boolean; // overlay de carga (fetch)
  searchValue?: string; // valor controlado del buscador (padre)
  onSearchChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  canEdit?: boolean;
};

/* ===================== Utils ===================== */

const currency = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const fmt = (n: number | string | null | undefined) =>
  currency.format(Number(n ?? 0));

/* ===================== Row (memo) ===================== */

type DataRowProps = {
  row: InsuranceRow;
  showDetails: boolean;
  onEdit: (row: InsuranceRow) => void;
  onShowObs: (text: string) => void;
  canEdit: boolean;
};

const DataRow = memo(function DataRow({
  row,
  showDetails,
  onEdit,
  onShowObs,
  canEdit,
}: DataRowProps) {
  return (
    <div
      className={`${styles.tableGrid} ${styles.dataRow} ${
        showDetails ? styles.withDetails : ""
      }`}
    >
      <div className={styles.cell}>{row.socio}</div>
      <div className={`${styles.cell} ${styles.nameCell}`} title={row.nombreSocio}>
        {row.nombreSocio}
      </div>
      <div className={styles.cell}>{row.matri}</div>
      <div className={styles.cell}>{row.nroOrden}</div>
      <div className={styles.cell}>{row.fecha}</div>
      <div className={styles.cell}>{row.codigo}</div>
      <div className={styles.cell}>{row.nroAfiliado}</div>
      <div className={`${styles.cell} ${styles.nameCell}`} title={row.afiliado}>
        {row.afiliado}
      </div>
      <div className={styles.cell}>{row.xCant}</div>
      <div className={styles.cell}>
        <span className={styles.percentage}>{row.porcentaje}%</span>
      </div>
      <div className={styles.cell}>
        <span className={styles.currency}>${currency.format(row.honorarios)}</span>
      </div>
      <div className={styles.cell}>
        <span className={styles.currency}>${currency.format(row.gastos)}</span>
      </div>
      <div className={styles.cell}>
        <span className={styles.currency}>${currency.format(row.coseguro)}</span>
      </div>
      <div className={styles.cell}>
        <span className={styles.currency}>${currency.format(row.importe)}</span>
      </div>
      <div className={styles.cell}>
        <span className={styles.currency}>
          ${currency.format(Number.isFinite(row.pagado) ? row.pagado : 0)}
        </span>
      </div>

      {showDetails && (
        <>
          <div className={styles.cell}>
            {row.tipo ? (
              <span className={`${styles.typeBadge} ${styles[`type${row.tipo}`]}`}>
                {row.tipo}
              </span>
            ) : (
              <span className={styles.emptyValue}>—</span>
            )}
          </div>
          <div className={styles.cell}>
            {row.tipo === "N" || !row.monto || Number(row.monto) <= 0 ? (
              <span className={styles.emptyValue}>—</span>
            ) : (
              <span className={styles.currency}>
                ${currency.format(Number(row.monto))}
              </span>
            )}
          </div>
          <div className={`${styles.cell} ${styles.obsCell}`} title={row.obs || ""}>
            {row.obs && row.obs.toString().trim() !== "" ? (
              <button
                className={styles.obsButton}
                onClick={() => onShowObs(String(row.obs))}
              >
                {row.obs}
              </button>
            ) : (
              <span className={styles.emptyValue}>—</span>
            )}
          </div>
          <div className={styles.cell}>
            {row.total !== undefined ? (
              <span className={styles.currency}>${currency.format(row.total)}</span>
            ) : (
              <span className={styles.emptyValue}>—</span>
            )}
          </div>
        </>
      )}

      <div className={styles.cell}>
        <div className={styles.actionButtons}>
          {canEdit && (
            <button
              className={`${styles.actionBtn} ${styles.editBtn}`}
              onClick={() => onEdit(row)}
              title="Editar débito/crédito"
            >
              <span className={styles.actionIcon}>✏️</span>
            </button>

          )}
          
        </div>
      </div>
    </div>
  );
},
// Comparación superficial para evitar re-renders
(prev, next) => {
  const a = prev.row,
    b = next.row;
  return (
    prev.showDetails === next.showDetails &&
    prev.canEdit === next.canEdit &&
    a.det_id === b.det_id &&
    a.tipo === b.tipo &&
    a.monto === b.monto &&
    a.obs === b.obs &&
    a.total === b.total &&
    a.importe === b.importe &&
    a.pagado === b.pagado
  );
});

/* ===================== Componente principal ===================== */

const InsuranceDetailTable = ({
  period,
  rows,
  onChange,
  onSaveRow,
  loading = false,
  searchValue = "",
  onSearchChange,
  canEdit = true
}: Props) => {
  const [drawerRow, setDrawerRow] = useState<InsuranceRow | null>(null);
  const [confirmRow, setConfirmRow] = useState<InsuranceRow | null>(null);
  const [obsModal, setObsModal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Índices de filas visibles (resultado del worker)
  const [visibleIdx, setVisibleIdx] = useState<number[]>([]);
  const [filtering, setFiltering] = useState(false);
  const deferredQ = useDeferredValue(searchValue);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!canEdit) setDrawerRow(null);
  }, [canEdit]);

  // Worker de filtrado
  const workerRef = useRef<Worker | null>(null);
  useEffect(() => {
    const w = new Worker(new URL("./filterRows.worker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = w;
    w.onmessage = (e: MessageEvent) => {
      const { type, payload } = e.data || {};
      if (type === "result") {
        startTransition(() => {
          setVisibleIdx(payload.indexes || []);
          setFiltering(false);
        });
      }
    };
    return () => {
      w.terminate();
      workerRef.current = null;
    };
  }, []);

  // Cargar dataset en el worker cuando cambian las filas
  useEffect(() => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({ type: "setData", payload: { rows } });
    // Ejecutar búsqueda actual con el dataset nuevo
    workerRef.current.postMessage({
      type: "search",
      payload: { q: (deferredQ || "").trim() },
    });
    setFiltering(!!deferredQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  // Búsqueda: sólo mandamos el query (sin copiar filas)
  useEffect(() => {
    if (!workerRef.current) return;
    setFiltering(true);
    workerRef.current.postMessage({
      type: "search",
      payload: { q: (deferredQ || "").trim() },
    });
  }, [deferredQ]);

  // Fallback inicial (sin worker listo aún)
  useEffect(() => {
    if (visibleIdx.length === 0 && rows.length > 0 && !searchValue) {
      setVisibleIdx(Array.from({ length: rows.length }, (_, i) => i));
    }
  }, [rows, searchValue, visibleIdx.length]);

  const updateRow = (id: InsuranceRow["det_id"], patch: Partial<InsuranceRow>) =>
    onChange(rows.map((r) => (r.det_id === id ? { ...r, ...patch } : r)));
  const removeRow = (id: InsuranceRow["det_id"]) =>
    onChange(rows.filter((r) => r.det_id !== id));

  const showDetails = useMemo(
    () =>
      rows.some(
        (r) =>
          r.tipo !== undefined ||
          (r.monto !== undefined && r.monto !== 0) ||
          (r.obs !== undefined && (r.obs ?? "").toString().trim() !== "") ||
          r.total !== undefined
      ),
    [rows]
  );

  // Encabezado pegajoso para Virtuoso
  const HeaderComp: Components["Header"] = useCallback(() => {
    return (
      <div className={styles.headerStickyWrap}>
        <div
          className={`${styles.tableGrid} ${styles.headerRow} ${
            showDetails ? styles.withDetails : ""
          }`}
        >
          <div className={styles.headerCell}>Socio</div>
          <div className={styles.headerCell}>Nombre Socio</div>
          <div className={styles.headerCell}>Matri.</div>
          <div className={styles.headerCell}>Nro. Orden</div>
          <div className={styles.headerCell}>Fecha</div>
          <div className={styles.headerCell}>Código</div>
          <div className={styles.headerCell}>Nro. Afiliado</div>
          <div className={styles.headerCell}>Afiliado</div>
          <div className={styles.headerCell}>X-Cant.</div>
          <div className={styles.headerCell}>%</div>
          <div className={styles.headerCell}>Honorarios</div>
          <div className={styles.headerCell}>Gastos</div>
          <div className={styles.headerCell}>Coseguro</div>
          <div className={styles.headerCell}>Importe</div>
          <div className={styles.headerCell}>Pagado</div>
          {showDetails && (
            <>
              <div className={styles.headerCell}>Tipo</div>
              <div className={styles.headerCell}>Monto</div>
              <div className={styles.headerCell}>Obs</div>
              <div className={styles.headerCell}>Total</div>
            </>
          )}
          <div className={styles.headerCell}>Acciones</div>
        </div>
      </div>
    );
  }, [showDetails]);

  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {error && (
        <div className={styles.errorBanner}>
          {error}
          <button onClick={() => setError(null)} className={styles.closeErr}>
            ×
          </button>
        </div>
      )}

      {/* Header de la tabla (gradiente) + SearchBar */}
      <div className={styles.tableHeader}>
        <div className={styles.headerContent}>
          <div className={styles.periodInfo}>
            <span className={styles.periodLabel}>Período</span>
            <span className={styles.periodBadge}>{period}</span>
          </div>
          <div className={styles.headerActions}>
            <SearchBar
              placeholder="Buscar en todos los campos…"
              value={searchValue}
              onChange={onSearchChange}
              className={styles.headerSearch}
            />
            {(filtering || isPending) && (
              <div className={styles.searchSpinner} aria-hidden />
            )}
          </div>
        </div>
      </div>

      {/* Contenedor scrolleable virtualizado */}
      <div className={styles.tableContainer}>
        <Virtuoso
          style={{ height: "100%", width: "100%" }}
          totalCount={visibleIdx.length}
          components={{ Header: HeaderComp }}
          itemContent={(index) => {
            const row = rows[visibleIdx[index]];
            if (!row) return null;
            return (
              <DataRow
                row={row}
                showDetails={showDetails}
                onEdit={(r) => setDrawerRow(r)}
                onShowObs={(txt) => setObsModal(txt)}
                canEdit = {canEdit}
              />
            );
          }}
        />

        {/* Overlay de carga (fetch inicial / refrescos) */}
        {loading && (
          <div
            className={styles.loadingOverlay}
            aria-live="polite"
            aria-busy="true"
          >
            <div className={styles.spinner} />
            <div className={styles.loadingText}>Cargando…</div>
          </div>
        )}
      </div>

      {/* Drawer de edición */}
      <AnimatePresence>
        {/* {drawerRow && (
          <>
            <motion.div
              className={styles.drawerBackdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !saving && setDrawerRow(null)}
            />
            <motion.aside
              className={styles.drawer}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
            >
              <div className={styles.drawerHeader}>
                <h3 className={styles.drawerTitle}>Débito / Crédito</h3>
                <button
                  className={styles.closeButton}
                  onClick={() => !saving && setDrawerRow(null)}
                  disabled={saving}
                >
                  ✕
                </button>
              </div>

              <div className={styles.drawerBody}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Tipo</label>
                  <select
                    className={styles.formSelect}
                    value={drawerRow.tipo ?? "N"}
                    onChange={(e) =>
                      setDrawerRow({
                        ...drawerRow,
                        tipo: e.target.value as "N" | "C" | "D",
                      })
                    }
                    disabled={saving}
                  >
                    <option value="N">Nada (N)</option>
                    <option value="C">Crédito (C)</option>
                    <option value="D">Débito (D)</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Monto</label>
                  <div className={styles.inputWrapper}>
                    <span className={styles.currencySymbol}>$</span>
                    <input
                      className={`${styles.formInput} ${styles.formInputCurrency}`}
                      type="number"
                      min={0}
                      step="0.01"
                      value={drawerRow.monto ?? 0}
                      onChange={(e) =>
                        setDrawerRow({
                          ...drawerRow,
                          monto: Number.isFinite(e.currentTarget.valueAsNumber)
                            ? e.currentTarget.valueAsNumber
                            : 0,
                        })
                      }
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Observaciones</label>
                  <textarea
                    className={styles.formTextarea}
                    rows={4}
                    placeholder="Ingrese observaciones..."
                    value={drawerRow.obs ?? ""}
                    onChange={(e) =>
                      setDrawerRow({ ...drawerRow, obs: e.target.value })
                    }
                    disabled={saving}
                  />
                </div>
              </div>

              <div className={styles.drawerFooter}>
                {drawerRow.tipo !== "N" && (drawerRow.monto ?? 0) > 0 && (
                  <button
                    className={styles.cancelButton}
                    onClick={async () => {
                      if (!onSaveRow) return setDrawerRow(null);
                      try {
                        setSaving(true);
                        await onSaveRow({
                          ...drawerRow,
                          tipo: "N",
                          monto: 0,
                          obs: "",
                        });
                        setDrawerRow(null);
                      } catch (e: any) {
                        setError(
                          e?.message || "No se pudo quitar el débito/crédito"
                        );
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving}
                  >
                    Quitar débito/crédito
                  </button>
                )}

                <button
                  className={styles.cancelButton}
                  onClick={() => setDrawerRow(null)}
                  disabled={saving}
                >
                  Cancelar
                </button>

                <button
                  className={styles.saveButton}
                  onClick={async () => {
                    if (!drawerRow) return;
                    if (!onSaveRow) {
                      const applied = {
                        ...drawerRow,
                        total:
                          drawerRow.tipo === "D"
                            ? drawerRow.importe - (drawerRow.monto ?? 0)
                            : drawerRow.tipo === "C"
                            ? drawerRow.importe + (drawerRow.monto ?? 0)
                            : drawerRow.importe,
                      };
                      updateRow(applied.det_id, applied);
                      setDrawerRow(null);
                      return;
                    }
                    try {
                      setSaving(true);
                      await onSaveRow({
                        ...drawerRow,
                        tipo: drawerRow.tipo ?? "N",
                        monto: drawerRow.monto ?? 0,
                        obs: drawerRow.obs ?? "",
                      });
                      setDrawerRow(null);
                    } catch (e: any) {
                      setError("No se pudo guardar el débito/crédito");
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                >
                  Guardar Cambios
                </button>
              </div>
            </motion.aside>
          </>
        )} */}
        {canEdit && drawerRow && (
          <>
            <motion.div
              className={styles.drawerBackdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !saving && setDrawerRow(null)}
            />
            <motion.aside
              className={styles.drawer}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
            >
              <div className={styles.drawerHeader}>
                <h3 className={styles.drawerTitle}>Débito / Crédito</h3>
                <button
                  className={styles.closeButton}
                  onClick={() => !saving && setDrawerRow(null)}
                  disabled={saving}
                >
                  ✕
                </button>
              </div>

              {/* ---- CONTEXTO DEL DETALLE SELECCIONADO ---- */}
              {drawerRow && (
                <div className={styles.rowContext}>
                  <div className={styles.rowContextTitle}>Detalle seleccionado</div>

                  <div className={styles.rowContextGrid}>
                    <div className={styles.ctxItem}>
                      <span className={styles.ctxLabel}>Socio</span>
                      <span className={styles.ctxValue}>{drawerRow.socio}</span>
                    </div>
                    <div className={styles.ctxItem}>
                      <span className={styles.ctxLabel}>Nombre Socio</span>
                      <span className={styles.ctxValue} title={drawerRow.nombreSocio}>
                        {drawerRow.nombreSocio}
                      </span>
                    </div>
                    {/* <div className={styles.ctxItem}>
                      <span className={styles.ctxLabel}>Matrícula</span>
                      <span className={styles.ctxValue}>{drawerRow.matri}</span>
                    </div> */}
                    <div className={styles.ctxItem}>
                      <span className={styles.ctxLabel}>N° Orden</span>
                      <span className={styles.ctxValue}>{drawerRow.nroOrden}</span>
                    </div>
                    {/* <div className={styles.ctxItem}>
                      <span className={styles.ctxLabel}>Fecha</span>
                      <span className={styles.ctxValue}>{drawerRow.fecha}</span>
                    </div> */}
                    <div className={styles.ctxItem}>
                      <span className={styles.ctxLabel}>Código</span>
                      <span className={styles.ctxValue}>{drawerRow.codigo}</span>
                    </div>
                    <div className={styles.ctxItem}>
                      <span className={styles.ctxLabel}>Afiliado</span>
                      <span className={styles.ctxValue} title={drawerRow.afiliado}>
                        {drawerRow.afiliado}
                      </span>
                    </div>
                    <div className={styles.ctxItem}>
                      <span className={styles.ctxLabel}>N° Afiliado</span>
                      <span className={styles.ctxValue}>{drawerRow.nroAfiliado}</span>
                    </div>
                    {/* <div className={styles.ctxItem}>
                      <span className={styles.ctxLabel}>X-Cant.</span>
                      <span className={styles.ctxValue}>{drawerRow.xCant}</span>
                    </div> */}
                  </div>

                  {/* Totales y simulación */}
                  {(() => {
                    const tipoSel = (drawerRow.tipo ?? "N") as "N" | "C" | "D";
                    const montoNum = Number(drawerRow.monto ?? 0);
                    const baseImporte = Number(drawerRow.importe ?? 0);
                    const totalActual = Number(
                      drawerRow.total ?? drawerRow.importe ?? 0
                    );
                    const totalSim =
                      tipoSel === "D"
                        ? baseImporte - (Number.isFinite(montoNum) ? montoNum : 0)
                        : tipoSel === "C"
                        ? baseImporte + (Number.isFinite(montoNum) ? montoNum : 0)
                        : baseImporte;
                    const delta = totalSim - totalActual;

                    return (
                      <div className={styles.rowContextTotals}>
                        <div className={styles.rowTotalLine}>
                          <span className={styles.totalLabel}>Importe base:</span>
                          <span className={styles.totalValue}>${fmt(baseImporte)}</span>
                        </div>

                        <div className={styles.rowTotalLine}>
                          <span className={styles.totalLabel}>Total actual:</span>
                          <span className={styles.totalValueMuted}>${fmt(totalActual)}</span>
                        </div>

                        <div className={styles.rowTotalLine}>
                          <span className={styles.totalLabel}>Aplicando:</span>
                          <span className={styles.totalValueMuted}>
                            {tipoSel === "N" ? "—" : tipoSel === "C" ? "Crédito" : "Débito"}{" "}
                            {tipoSel !== "N" && `($${fmt(montoNum)})`}
                          </span>
                        </div>

                        <div className={styles.rowTotalPreview}>
                          <span className={styles.previewLabel}>Total simulado:</span>
                          <span className={styles.previewValue}>${fmt(totalSim)}</span>
                          {delta !== 0 && (
                            <span
                              className={`${styles.previewDelta} ${
                                delta > 0 ? styles.deltaPositive : styles.deltaNegative
                              }`}
                            >
                              {delta > 0 ? "▲" : "▼"} ${fmt(Math.abs(delta))}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className={styles.drawerBody}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Tipo</label>
                  <select
                    className={styles.formSelect}
                    value={drawerRow.tipo ?? "N"}
                    onChange={(e) =>
                      setDrawerRow({ ...drawerRow, tipo: e.target.value as "N" | "C" | "D" })
                    }
                    disabled={saving}
                  >
                    <option value="N">Nada (N)</option>
                    <option value="C">Crédito (C)</option>
                    <option value="D">Débito (D)</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Monto</label>
                  <div className={styles.inputWrapper}>
                    <span className={styles.currencySymbol}>$</span>
                    <input
                      className={`${styles.formInput} ${styles.formInputCurrency}`}
                      type="number"
                      min={0}
                      step="0.01"
                      value={drawerRow.monto ?? 0}
                      onChange={(e) =>
                        setDrawerRow({
                          ...drawerRow,
                          monto: Number.isFinite(e.currentTarget.valueAsNumber)
                            ? e.currentTarget.valueAsNumber
                            : 0,
                        })
                      }
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Observaciones</label>
                  <textarea
                    className={styles.formTextarea}
                    rows={4}
                    placeholder="Ingrese observaciones..."
                    value={drawerRow.obs ?? ""}
                    onChange={(e) => setDrawerRow({ ...drawerRow, obs: e.target.value })}
                    disabled={saving}
                  />
                </div>
              </div>

              <div className={styles.drawerFooter}>
                {drawerRow.tipo !== "N" && (drawerRow.monto ?? 0) > 0 && (
                  <button
                    className={styles.cancelButton}
                    onClick={async () => {
                      if (!onSaveRow) return setDrawerRow(null);
                      try {
                        setSaving(true);
                        await onSaveRow({ ...drawerRow, tipo: "N", monto: 0, obs: "" });
                        setDrawerRow(null);
                      } catch (e: any) {
                        setError(e?.message || "No se pudo quitar el débito/crédito");
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving}
                  >
                    Quitar débito/crédito
                  </button>
                )}

                <button
                  className={styles.cancelButton}
                  onClick={() => setDrawerRow(null)}
                  disabled={saving}
                >
                  Cancelar
                </button>

                <button
                  className={styles.saveButton}
                  onClick={async () => {
                    if (!drawerRow) return;
                    if (!onSaveRow) {
                      // solo local
                      const applied = {
                        ...drawerRow,
                        total:
                          drawerRow.tipo === "D"
                            ? drawerRow.importe - (drawerRow.monto ?? 0)
                            : drawerRow.tipo === "C"
                            ? drawerRow.importe + (drawerRow.monto ?? 0)
                            : drawerRow.importe,
                      };
                      updateRow(applied.det_id, applied);
                      setDrawerRow(null);
                      return;
                    }
                    try {
                      setSaving(true);
                      await onSaveRow({
                        ...drawerRow,
                        tipo: drawerRow.tipo ?? "N",
                        monto: drawerRow.monto ?? 0,
                        obs: drawerRow.obs ?? "",
                      });
                      setDrawerRow(null);
                    } catch (e: any) {
                      setError("No se pudo guardar el débito/crédito");
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                >
                  Guardar Cambios
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Modal de Observación */}
      <AnimatePresence>
        {obsModal && (
          <>
            <motion.div
              className={styles.modalOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setObsModal(null)}
            />
            <motion.div
              className={styles.modal}
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
            >
              <div className={styles.modalHeader}>
                <h4 className={styles.modalTitle}>Observación</h4>
                <button
                  className={styles.modalClose}
                  onClick={() => setObsModal(null)}
                >
                  ✕
                </button>
              </div>
              <div className={styles.modalBody}>{obsModal}</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Confirm de eliminación (si lo usás) */}
      {confirmRow && (
        <Alert
          type="warning"
          title="Eliminar fila"
          message="¿Está seguro que desea eliminar esta fila? Esta acción no se puede deshacer."
          onClose={() => setConfirmRow(null)}
          onCancel={() => setConfirmRow(null)}
          onConfirm={() => {
            removeRow(confirmRow.det_id);
            setConfirmRow(null);
          }}
          confirmLabel="Sí, eliminar"
          cancelLabel="Cancelar"
          showActions
        />
      )}
    </motion.div>
  );
};

export default InsuranceDetailTable;
