// components/molecules/InsuranceCard/InsuranceCard.tsx
"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
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
          <Button variant="primary" onClick={() => setOpenMonthModal(true)}>
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

      <Dialog
        open={openMonthModal}
        onClose={() => setOpenMonthModal(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Seleccionar nuevo período</DialogTitle>
        <DialogContent className={styles.dialogContent}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              views={["year", "month"]}
              value={pickDate}
              onChange={(d) => setPickDate(d)}
              format="yyyy-MM"
              slotProps={{
                textField: { fullWidth: true, placeholder: "Elegir mes y año" },
              }}
            />
          </LocalizationProvider>
          {dupError && <div className={styles.error}>{dupError}</div>}
        </DialogContent>
        <DialogActions className={styles.dialogActions}>
          <Button variant="secondary" onClick={() => setOpenMonthModal(false)}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleAddPeriod}
            disabled={!pickDate}
          >
            Agregar
          </Button>
        </DialogActions>
      </Dialog>

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
