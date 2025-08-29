"use client";

import React from "react";
import { saveAs } from "file-saver";
import ExcelJS from "exceljs";
import styles from "./InsuranceTable.module.scss";
import Button from "../../atoms/Button/Button";
import { Link } from "react-router-dom";

export type Period = {
  id: number;
  period: string;
  grossTotal: number;
  discounts: number;
  netTotal: number;
};

type Props = {
  periodLabel: string;
  data: Period[];
  className?: string;
  title?: string;
  loading?: boolean;
  onDeleteTable?: () => void;
  seeDetailsLink?: string;
  seeDetailsState?: unknown;
  onSeeDetails?: () => void;
};

async function exportPeriodsToExcel(rows: Period[], filename = "periodo.xlsx") {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Períodos");

  ws.columns = [
    { header: "Período", key: "period", width: 12 },
    { header: "Bruto", key: "grossTotal", width: 12 },
    { header: "Descuentos", key: "discounts", width: 14 },
    { header: "Neto", key: "netTotal", width: 12 },
  ] as ExcelJS.Column[];

  rows.forEach((r) =>
    ws.addRow({
      period: r.period,
      grossTotal: r.grossTotal,
      discounts: r.discounts,
      netTotal: r.netTotal,
    })
  );

  ws.getRow(1).font = { bold: true };

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, filename);
}

const InsuranceTable: React.FC<Props> = ({
  periodLabel,
  data,
  className = "",
  title = "Períodos",
  loading,
  onDeleteTable,
  seeDetailsLink,
  seeDetailsState,
  onSeeDetails,
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
      <div className={styles.tableTitle}>
        <div className={styles.left}>
          <span className={styles.tableTitleText}>{title}</span>
          <span className={styles.periodBadge}>Período {periodLabel}</span>
        </div>

        <div className={styles.titleActions}>
          {seeDetailsLink ? (
            <Link to={"/insurance-detail"}>
              <Button variant="primary" size="sm">
                Ver Detalles
              </Button>
            </Link>
          ) : (
            <Button variant="primary" size="sm" onClick={onSeeDetails}>
              Ver Detalles
            </Button>
          )}

          <button
            type="button"
            aria-label="Eliminar período"
            className={styles.titleClose}
            onClick={onDeleteTable}
          >
            ×
          </button>
        </div>
      </div>

      <div className={`${styles.headerRow} ${styles.noStatus}`}>
        <div>Período</div>
        <div>Bruto</div>
        <div>Descuentos</div>
        <div>Neto</div>
        <div>Acciones</div>
      </div>

      <div className={styles.body}>
        {data.map((row, i) => (
          <div
            key={row.id ?? i}
            className={`${styles.dataRow} ${styles.noStatus} fade-in`}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div>{row.period}</div>
            <div>${row.grossTotal.toLocaleString()}</div>
            <div>-${row.discounts.toLocaleString()}</div>
            <div>${row.netTotal.toLocaleString()}</div>

            <div className={styles.actions}>
              <Button
                variant="success"
                size="sm"
                onClick={() =>
                  exportPeriodsToExcel([row], `periodo_${row.period}.xlsx`)
                }
              >
                Exportar
              </Button>

              {seeDetailsLink ? (
                <Link to={seeDetailsLink} state={seeDetailsState}>
                  <Button variant="secondary" size="sm">
                    Ver
                  </Button>
                </Link>
              ) : (
                <Button variant="secondary" size="sm" onClick={onSeeDetails}>
                  Ver
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InsuranceTable;
