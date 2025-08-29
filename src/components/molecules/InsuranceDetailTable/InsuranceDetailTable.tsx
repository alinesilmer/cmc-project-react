"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./InsuranceDetailTable.module.scss";
import Alert from "../../atoms/Alert/Alert";

export type InsuranceRow = {
  id: string | number;
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
  obs?: string;
  total?: number;
};

type Props = {
  period: string;
  rows: InsuranceRow[];
  onChange: (rows: InsuranceRow[]) => void;
};

const currency = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const makeBlank = (): InsuranceRow => ({
  id: crypto.randomUUID(),
  socio: "-",
  nombreSocio: "-",
  matri: "-",
  nroOrden: "-",
  fecha: new Date().toLocaleDateString("es-AR"),
  codigo: "-",
  nroAfiliado: "-",
  afiliado: "-",
  xCant: "1-1",
  porcentaje: 100,
  honorarios: 0,
  gastos: 0,
  coseguro: 0,
  importe: 0,
  pagado: 0,
});

const InsuranceDetailTable: React.FC<Props> = ({ period, rows, onChange }) => {
  const [drawerRow, setDrawerRow] = useState<InsuranceRow | null>(null);
  const [confirmRow, setConfirmRow] = useState<InsuranceRow | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | number | null>(null);

  const addRow = () => onChange([...rows, makeBlank()]);
  const updateRow = (id: InsuranceRow["id"], patch: Partial<InsuranceRow>) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeRow = (id: InsuranceRow["id"]) =>
    onChange(rows.filter((r) => r.id !== id));

  const totalImporte = useMemo(
    () => rows.reduce((s, r) => s + (r.importe || 0), 0),
    [rows]
  );

  const showDetails = useMemo(
    () =>
      rows.some(
        (r) =>
          r.tipo !== undefined ||
          (r.monto !== undefined && r.monto !== 0) ||
          (r.obs !== undefined && r.obs.trim() !== "") ||
          r.total !== undefined
      ),
    [rows]
  );

  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Enhanced Header */}
      <div className={styles.tableHeader}>
        <div className={styles.headerContent}>
          <div className={styles.periodInfo}>
            <span className={styles.periodLabel}>Período</span>
            <span className={styles.periodBadge}>{period}</span>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className={styles.tableContainer}>
        <div className={styles.scrollWrapper}>
          {/* Sticky Header */}
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
            <div className={styles.headerCell}>A Pagar</div>

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

          {/* Table Body */}
          <div className={styles.tableBody}>
            <AnimatePresence>
              {rows.map((row, index) => (
                <motion.div
                  key={row.id}
                  className={`${styles.tableGrid} ${styles.dataRow} ${
                    showDetails ? styles.withDetails : ""
                  } ${hoveredRow === row.id ? styles.hovered : ""}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05 }}
                  onMouseEnter={() => setHoveredRow(row.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <div className={styles.cell}>{row.socio}</div>
                  <div
                    className={`${styles.cell} ${styles.nameCell}`}
                    title={row.nombreSocio}
                  >
                    {row.nombreSocio}
                  </div>
                  <div className={styles.cell}>{row.matri}</div>
                  <div className={styles.cell}>{row.nroOrden}</div>
                  <div className={styles.cell}>{row.fecha}</div>
                  <div className={styles.cell}>{row.codigo}</div>
                  <div className={styles.cell}>{row.nroAfiliado}</div>
                  <div
                    className={`${styles.cell} ${styles.nameCell}`}
                    title={row.afiliado}
                  >
                    {row.afiliado}
                  </div>
                  <div className={styles.cell}>{row.xCant}</div>
                  <div className={styles.cell}>
                    <span className={styles.percentage}>{row.porcentaje}%</span>
                  </div>
                  <div className={styles.cell}>
                    <span className={styles.currency}>
                      ${currency.format(row.honorarios)}
                    </span>
                  </div>
                  <div className={styles.cell}>
                    <span className={styles.currency}>
                      ${currency.format(row.gastos)}
                    </span>
                  </div>
                  <div className={styles.cell}>
                    <span className={styles.currency}>
                      ${currency.format(row.coseguro)}
                    </span>
                  </div>
                  <div className={styles.cell}>
                    <span className={styles.currency}>
                      ${currency.format(row.importe)}
                    </span>
                  </div>

                  {/* Pagado */}
                  <div className={styles.cell}>
                    <span className={styles.currency}>
                      $
                      {currency.format(
                        Number.isFinite(row.pagado) ? row.pagado : 0
                      )}
                    </span>
                  </div>

                  {/* Detail Columns */}
                  {showDetails && (
                    <>
                      <div className={styles.cell}>
                        {row.tipo ? (
                          <span
                            className={`${styles.typeBadge} ${
                              styles[`type${row.tipo}`]
                            }`}
                          >
                            {row.tipo}
                          </span>
                        ) : (
                          <span className={styles.emptyValue}>—</span>
                        )}
                      </div>
                      <div className={styles.cell}>
                        {row.monto !== undefined && row.monto > 0 ? (
                          <span className={styles.currency}>
                            ${currency.format(row.monto)}
                          </span>
                        ) : (
                          <span className={styles.emptyValue}>—</span>
                        )}
                      </div>
                      <div
                        className={`${styles.cell} ${styles.obsCell}`}
                        title={row.obs || ""}
                      >
                        {row.obs && row.obs.trim() !== "" ? (
                          row.obs
                        ) : (
                          <span className={styles.emptyValue}>—</span>
                        )}
                      </div>
                      <div className={styles.cell}>
                        {row.total !== undefined ? (
                          <span className={styles.currency}>
                            ${currency.format(row.total)}
                          </span>
                        ) : (
                          <span className={styles.emptyValue}>—</span>
                        )}
                      </div>
                    </>
                  )}

                  {/* Actions */}
                  <div className={styles.cell}>
                    <div className={styles.actionButtons}>
                      <motion.button
                        className={`${styles.actionBtn} ${styles.editBtn}`}
                        onClick={() => setDrawerRow(row)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        title="Editar"
                      >
                        <span className={styles.actionIcon}>✏️</span>
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Enhanced Footer */}
      <div className={styles.tableFooter}>
        <div className={styles.footerContent}>
          <div className={styles.summary}>
            <span className={styles.summaryLabel}>Total de filas:</span>
            <span className={styles.summaryValue}>{rows.length}</span>
          </div>
          <div className={styles.totalAmount}>
            <span className={styles.totalLabel}>Total Importe:</span>
            <span className={styles.totalValue}>
              ${currency.format(totalImporte)}
            </span>
          </div>
        </div>
      </div>

      {/* Enhanced Drawer */}
      <AnimatePresence>
        {drawerRow && (
          <>
            <motion.div
              className={styles.drawerBackdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerRow(null)}
            />
            <motion.aside
              className={styles.drawer}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              <div className={styles.drawerHeader}>
                <h3 className={styles.drawerTitle}>Detalle de Fila</h3>
                <button
                  className={styles.closeButton}
                  onClick={() => setDrawerRow(null)}
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
                      className={styles.formInput}
                      type="number"
                      min={0}
                      step="0.01"
                      value={drawerRow.monto ?? 0}
                      onChange={(e) =>
                        setDrawerRow({
                          ...drawerRow,
                          monto: Number(e.target.value || 0),
                        })
                      }
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
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Total</label>
                  <div className={styles.inputWrapper}>
                    <span className={styles.currencySymbol}>$</span>
                    <input
                      className={styles.formInput}
                      type="number"
                      min={0}
                      step="0.01"
                      value={drawerRow.total ?? drawerRow.monto ?? 0}
                      onChange={(e) =>
                        setDrawerRow({
                          ...drawerRow,
                          total: Number(e.target.value || 0),
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className={styles.drawerFooter}>
                <motion.button
                  className={styles.cancelButton}
                  onClick={() => setDrawerRow(null)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancelar
                </motion.button>
                <motion.button
                  className={styles.saveButton}
                  onClick={() => {
                    const updatedRow = {
                      ...drawerRow,
                      tipo: drawerRow.tipo ?? "N",
                      monto: drawerRow.monto ?? 0,
                      obs: drawerRow.obs ?? "",
                      total: drawerRow.total ?? drawerRow.monto ?? 0,
                    };
                    updateRow(updatedRow.id, updatedRow);
                    setDrawerRow(null);
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Guardar Cambios
                </motion.button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      {confirmRow && (
        <Alert
          type="warning"
          title="Eliminar fila"
          message="¿Está seguro que desea eliminar esta fila? Esta acción no se puede deshacer."
          onClose={() => setConfirmRow(null)}
          onCancel={() => setConfirmRow(null)}
          onConfirm={() => {
            removeRow(confirmRow.id);
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
