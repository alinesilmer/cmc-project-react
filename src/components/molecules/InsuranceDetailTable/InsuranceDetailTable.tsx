"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./InsuranceDetailTable.module.scss";
import Alert from "../../atoms/Alert/Alert";

export type InsuranceRow = {
  det_id: string | number;      // DetalleLiquidacion.id
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
  rows: InsuranceRow[];
  onChange: (rows: InsuranceRow[]) => void;
  onSaveRow?: (row: InsuranceRow) => Promise<void> | void; // persistir DC
};

const currency = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const InsuranceDetailTable: React.FC<Props> = ({ period, rows, onChange, onSaveRow }) => {
  const [drawerRow, setDrawerRow] = useState<InsuranceRow | null>(null);
  const [confirmRow, setConfirmRow] = useState<InsuranceRow | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | number | null>(null);
  const [obsModal, setObsModal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {error && (
        <div className={styles.errorBanner}>
          {error}
          <button onClick={() => setError(null)} className={styles.closeErr}>×</button>
        </div>
      )}

      <div className={styles.tableHeader}>
        <div className={styles.headerContent}>
          <div className={styles.periodInfo}>
            <span className={styles.periodLabel}>Período</span>
            <span className={styles.periodBadge}>{period}</span>
          </div>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <div className={styles.scrollWrapper}>
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

          <div className={styles.tableBody}>
            <AnimatePresence>
              {rows.map((row, index) => (
                <motion.div
                  key={row.det_id}
                  className={`${styles.tableGrid} ${styles.dataRow} ${
                    showDetails ? styles.withDetails : ""
                  } ${hoveredRow === row.det_id ? styles.hovered : ""}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05 }}
                  onMouseEnter={() => setHoveredRow(row.det_id)}
                  onMouseLeave={() => setHoveredRow(null)}
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
                          <span className={styles.currency}>${currency.format(Number(row.monto))}</span>
                        )}
                      </div>
                      <div className={`${styles.cell} ${styles.obsCell}`} title={row.obs || ""}>
                        {row.obs && row.obs.toString().trim() !== "" ? (
                          <button className={styles.obsButton} onClick={() => setObsModal(String(row.obs))}>
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
                      <motion.button
                        className={`${styles.actionBtn} ${styles.editBtn}`}
                        onClick={() => setDrawerRow(row)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        title="Editar débito/crédito"
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

      <div className={styles.tableFooter}>
        <div className={styles.footerContent}>
          <div className={styles.summary}>
            <span className={styles.summaryLabel}>Total de filas:</span>
            <span className={styles.summaryValue}>{rows.length}</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {drawerRow && (
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
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
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
                  <motion.button
                    className={styles.cancelButton}
                    onClick={async () => {
                      if (!onSaveRow) return setDrawerRow(null);
                      try {
                        setSaving(true);
                        // “Quitar DC” => setear N/0
                        await onSaveRow({ ...drawerRow, tipo: "N", monto: 0, obs: "" });
                        setDrawerRow(null);
                      } catch (e: any) {
                        setError(e?.message || "No se pudo quitar el débito/crédito");
                      } finally {
                        setSaving(false);
                      }
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={saving}
                  >
                    Quitar débito/crédito
                  </motion.button>
                )}

                <motion.button
                  className={styles.cancelButton}
                  onClick={() => setDrawerRow(null)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={saving}
                >
                  Cancelar
                </motion.button>

                <motion.button
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
                      setError(e?.message || "No se pudo guardar el débito/crédito");
                    } finally {
                      setSaving(false);
                    }
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={saving}
                >
                  Guardar Cambios
                </motion.button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

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
                <button className={styles.modalClose} onClick={() => setObsModal(null)}>
                  ✕
                </button>
              </div>
              <div className={styles.modalBody}>{obsModal}</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
