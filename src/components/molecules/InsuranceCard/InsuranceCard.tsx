// components/molecules/InsuranceCard/InsuranceCard.tsx
"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import styles from "./InsuranceCard.module.scss";
import InsuranceTable, {
  type Period as InsurancePeriod,
} from "../InsuranceTable/InsuranceTable";
import Button from "../../atoms/Button/Button";
import { Link } from "react-router-dom";
import Alert from "../../atoms/Alert/Alert";

type MonthKey = string;

type PeriodBucket = {
  period: MonthKey;
  grossTotal: number;
  discounts: number;
  netTotal: number;
};

type Props = {
  name: string;
  onExport?: (periods: PeriodBucket[]) => void;
  onSummary?: (periods: PeriodBucket[]) => void;
  onDelete?: () => void;
};

const fmtMonthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const sortByPeriodAsc = (a: PeriodBucket, b: PeriodBucket) =>
  a.period.localeCompare(b.period);

const InsuranceCard: React.FC<Props> = ({ name, onExport, onSummary }) => {
  const [periods, setPeriods] = useState<PeriodBucket[]>([]);
  const [openMonthModal, setOpenMonthModal] = useState(false);
  const [pickDate, setPickDate] = useState<Date | null>(new Date());
  const [dupError, setDupError] = useState("");
  const [confirmDeletePeriod, setConfirmDeletePeriod] = useState<null | string>(
    null
  );

  const monthSet = useMemo(
    () => new Set(periods.map((p) => p.period)),
    [periods]
  );

  const handleAddPeriod = () => {
    if (!pickDate) return;
    const key = fmtMonthKey(pickDate);
    if (monthSet.has(key)) {
      setDupError("Ese mes ya existe en esta obra social.");
      return;
    }
    const toAdd: PeriodBucket = {
      period: key,
      grossTotal: 0,
      discounts: 0,
      netTotal: 0,
    };
    setPeriods((prev) => {
      const next = [...prev, toAdd];
      next.sort(sortByPeriodAsc);
      return next;
    });
    setDupError("");
    setOpenMonthModal(false);
  };

  const orderedPeriods = useMemo(
    () => [...periods].sort(sortByPeriodAsc),
    [periods]
  );

  return (
    <motion.div
      className={styles.card}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className={styles.header}>
        <h3 className={styles.title}>{name}</h3>
        <div className={styles.headerActions}>
          <Link to={"insurance-detail"}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onSummary?.(orderedPeriods)}
            >
              Ver Resumen
            </Button>
          </Link>
          <Button
            variant="success"
            size="sm"
            onClick={() => onExport?.(orderedPeriods)}
          >
            Exportar
          </Button>
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.colLabel}>Período</div>
        <div className={styles.colActions}>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setOpenMonthModal(true)}
          >
            Agregar período
          </Button>
        </div>
      </div>

      <div className={styles.tablesWrap}>
        {orderedPeriods.map((b, i) => {
          const oneRow: InsurancePeriod = {
            id: i + 1,
            period: b.period,
            grossTotal: b.grossTotal,
            discounts: b.discounts,
            netTotal: b.netTotal,
          };
          return (
            <InsuranceTable
              key={b.period}
              title="Período:"
              periodLabel={b.period}
              data={[oneRow]}
              seeDetailsLink={`/insurance/${encodeURIComponent(name)}/${
                b.period
              }`}
              seeDetailsState={{ insurance: name, period: b.period }}
              onDeleteTable={() => setConfirmDeletePeriod(b.period)}
            />
          );
        })}
      </div>

      {openMonthModal && (
        <div className={styles.modalBackdrop}>
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
          >
            <div className={styles.modalHeader}>
              <h4>Agregar período</h4>
              <button
                className={styles.iconClose}
                onClick={() => setOpenMonthModal(false)}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <DatePicker
                selected={pickDate}
                onChange={(d: Date | null) => setPickDate(d)}
                dateFormat="yyyy-MM"
                showMonthYearPicker
                inline
                calendarClassName={styles.datepicker}
              />
              {dupError && <div className={styles.error}>{dupError}</div>}
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.btnGhost}
                onClick={() => setOpenMonthModal(false)}
              >
                Cancelar
              </button>
              <button className={styles.btnPrimary} onClick={handleAddPeriod}>
                Agregar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {confirmDeletePeriod && (
        <Alert
          type="warning"
          title="Eliminar período"
          message={`¿Seguro que querés eliminar el período ${confirmDeletePeriod}?`}
          showActions
          confirmLabel="Sí, eliminar"
          cancelLabel="Cancelar"
          onConfirm={() => {
            setPeriods((prev) =>
              prev.filter((p) => p.period !== confirmDeletePeriod)
            );
            setConfirmDeletePeriod(null);
          }}
          onCancel={() => setConfirmDeletePeriod(null)}
          onClose={() => setConfirmDeletePeriod(null)}
        />
      )}
    </motion.div>
  );
};

export default InsuranceCard;
