// components/molecules/PeriodsTable/PeriodsTable.tsx
"use client";

import React from "react";
import { saveAs } from "file-saver";
import ExcelJS from "exceljs";
import styles from "./PeriodsTable.module.scss";
import Button from "../../atoms/Button/Button";
import { Link } from "react-router-dom";

export type Period = {
  id: number;
  period: string;
  grossTotal: number;
  discounts: number;
  netTotal: number;
  status?: "EN CURSO" | "FINALIZADO";
};

type Props = {
  data: Period[];
  onRequestDelete?: (row: Period) => void;
  className?: string;
  title?: string;
  loading?: boolean;

  /** Ahora por defecto ocultamos la columna Estado para alinearlo con LiquidationPeriods */
  hideStatus?: boolean;

  getSeeLink?: (row: Period) => string;
  getSeeState?: (row: Period) => unknown;

  deletable?: boolean;
  onDeleteTable?: () => void;
};

async function exportPeriodsToExcel(
  rows: Period[],
  filename = "periodos.xlsx",
  includeStatus = true
) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Períodos");

  ws.columns = [
    { header: "Período", key: "period", width: 12 },
    { header: "Bruto", key: "grossTotal", width: 12 },
    { header: "Descuentos", key: "discounts", width: 14 },
    { header: "Neto", key: "netTotal", width: 12 },
    ...(includeStatus ? [{ header: "Estado", key: "status", width: 12 }] : []),
  ] as ExcelJS.Column[];

  rows.forEach((r) => {
    ws.addRow(
      includeStatus
        ? {
            period: r.period,
            grossTotal: r.grossTotal,
            discounts: r.discounts,
            netTotal: r.netTotal,
            status: r.status ?? "",
          }
        : {
            period: r.period,
            grossTotal: r.grossTotal,
            discounts: r.discounts,
            netTotal: r.netTotal,
          }
    );
  });

  ws.getRow(1).font = { bold: true };

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, filename);
}

const PeriodsTable: React.FC<Props> = ({
  data,
  onRequestDelete,
  className = "",
  title,
  loading,
  /** Por defecto true para ocultar la columna Estado */
  hideStatus = true,
  deletable = false,
  onDeleteTable,
  getSeeLink,
  getSeeState,
}) => {
  if (loading) {
    return (
      <div className={`${styles.tableWrap} ${className}`}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Cargando...</span>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={`${styles.tableWrap} ${className}`}>
        <div className={styles.empty}>No hay datos disponibles</div>
      </div>
    );
  }

  return (
    <div className={`${styles.tableWrap} scale-in ${className}`}>
      {title && (
        <div className={styles.tableTitle}>
          <span className={styles.tableTitleText}>{title}</span>
          {deletable && (
            <button
              type="button"
              aria-label="Eliminar período"
              className={styles.titleClose}
              onClick={onDeleteTable}
            >
              ×
            </button>
          )}
        </div>
      )}

      <div
        className={`${styles.headerRow} ${hideStatus ? styles.noStatus : ""}`}
      >
        <div>Período</div>
        <div>Bruto</div>
        <div>Descuentos</div>
        <div>Neto</div>
        {!hideStatus && <div>Estado</div>}
        <div>Acciones</div>
      </div>

      <div className={styles.body}>
        {data.map((row, i) => {
          const defaultSee = `/panel/liquidation/${encodeURIComponent(
            String(row.id)
          )}`;
          const seeHref = getSeeLink ? getSeeLink(row) : defaultSee;
          const seeState = getSeeState ? getSeeState(row) : undefined;

          return (
            <div
              key={row.id ?? i}
              className={`${styles.dataRow} ${
                hideStatus ? styles.noStatus : ""
              } fade-in`}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div>{row.period}</div>
              <div>${row.grossTotal.toLocaleString("es-AR")}</div>
              <div>- ${row.discounts.toLocaleString("es-AR")}</div>
              <div>${row.netTotal.toLocaleString("es-AR")}</div>

              {!hideStatus && (
                <div>
                  <span
                    className={`${styles.status} ${
                      row.status === "EN CURSO"
                        ? styles.inProgress
                        : styles.finished
                    }`}
                  >
                    {row.status}
                  </span>
                </div>
              )}

              <div className={styles.actions}>
                <Button
                  variant="success"
                  size="sm"
                  onClick={() =>
                    exportPeriodsToExcel(
                      [row],
                      `periodo_${row.period}.xlsx`,
                      !hideStatus
                    )
                  }
                >
                  Exportar
                </Button>

                <Link to={seeHref} state={seeState}>
                  <Button variant="primary" size="sm">
                    Ver
                  </Button>
                </Link>

                {row.status === "EN CURSO" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRequestDelete?.(row)}
                  >
                    ❌
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PeriodsTable;
