// components/molecules/InsuranceCard/InsuranceCard.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
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
  period: MonthKey;     // "YYYY-MM"
  grossTotal: number;
  discounts: number;
  netTotal: number;
  /** Datos que vienen del backend */
  liquidacionId?: number | string;
  nroLiquidacion?: string;
  estado?: "A" | "C";
};

type Props = {
  name: string;
  onExport?: (periods: PeriodBucket[]) => void;
  onSummary?: (periods: PeriodBucket[]) => void;
  onDelete?: () => void;

  /** Precarga desde el padre (puede venir vacío) */
  initialPeriods?: PeriodBucket[];

  /** Necesarios para los POST/DELETE */
  osId: number | string;      // NRO_OBRASOCIAL
  resumenId: number | string; // params:id de la página
};

const fmtMonthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const sortByPeriodAsc = (a: PeriodBucket, b: PeriodBucket) =>
  a.period.localeCompare(b.period);

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000";
const CREATE_LIQ_URL = `${API_BASE}/api/liquidacion/liquidaciones_por_os/crear`;
const DELETE_LIQ_URL = (id: number | string) =>
  `${API_BASE}/api/liquidacion/liquidaciones_por_os/${id}`;

const InsuranceCard: React.FC<Props> = ({
  name,
  onExport,
  onSummary,
  onDelete, // opcional
  initialPeriods = [],
  osId,
  resumenId,
}) => {
  // Estado interno de períodos, precargado desde props
  const [periods, setPeriods] = useState<PeriodBucket[]>(
    () => [...(initialPeriods ?? [])].sort(sortByPeriodAsc)
  );

  // Si cambian las props, sincronizamos
  useEffect(() => {
    setPeriods([...(initialPeriods ?? [])].sort(sortByPeriodAsc));
  }, [initialPeriods]);

  const [openMonthModal, setOpenMonthModal] = useState(false);
  const [pickDate, setPickDate] = useState<Date | null>(new Date());
  const [nroInput, setNroInput] = useState<string>("");
  const [dupError, setDupError] = useState("");
  const [confirmDeletePeriod, setConfirmDeletePeriod] =
    useState<null | PeriodBucket>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  const monthSet = useMemo(
    () => new Set(periods.map((p) => p.period)),
    [periods]
  );

  // Crear período -> POST
  const handleAddPeriod = async () => {
    if (!pickDate) return;
    const key = fmtMonthKey(pickDate);
    if (monthSet.has(key)) {
      setDupError("Ese mes ya existe en esta obra social.");
      return;
    }
    if (!nroInput.trim()) {
      setDupError("Ingresá el Nro. de liquidación.");
      return;
    }

    const y = pickDate.getFullYear();
    const m = pickDate.getMonth() + 1;

    setSaving(true);
    setApiError(null);
    try {
      const res = await fetch(CREATE_LIQ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumen_id: Number(resumenId),
          obra_social_id: Number(osId),
          mes_periodo: m,
          anio_periodo: y,
          nro_liquidacion: nroInput.trim(),
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Error ${res.status}: ${txt || "no se pudo crear"}`);
      }
      const created: any = await res.json();

      const toAdd: PeriodBucket = {
        period: key,
        grossTotal: Number(created?.total_bruto) || 0,
        discounts:
          (Number(created?.total_debitos) || 0) +
          (Number(created?.total_deduccion) || 0),
        netTotal:
          created?.total_neto != null
            ? Number(created.total_neto) || 0
            : (Number(created?.total_bruto) || 0) -
              ((Number(created?.total_debitos) || 0) +
                (Number(created?.total_deduccion) || 0)),
        liquidacionId: created?.id,
        nroLiquidacion: created?.nro_liquidacion ?? nroInput.trim(),
        estado: "A", // recién creada está abierta
      };

      setPeriods((prev) => {
        const next = [...prev, toAdd];
        next.sort(sortByPeriodAsc);
        return next;
      });
      setDupError("");
      setOpenMonthModal(false);
      setNroInput("");
    } catch (e: any) {
      setApiError(e?.message || "No se pudo crear la liquidación.");
    } finally {
      setSaving(false);
    }
  };

  // Eliminar período -> DELETE
  const confirmDelete = async () => {
    if (!confirmDeletePeriod) return;

    const lid = confirmDeletePeriod.liquidacionId;
    if (lid != null) {
      setSaving(true);
      setApiError(null);
      try {
        const res = await fetch(DELETE_LIQ_URL(lid), { method: "DELETE" });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`Error ${res.status}: ${txt || "no se pudo eliminar"}`);
        }
      } catch (e: any) {
        setSaving(false);
        setApiError(e?.message || "No se pudo eliminar la liquidación.");
        return;
      }
      setSaving(false);
    }

    // actualizar estado front
    setPeriods((prev) =>
      prev.filter((p) => p.period !== confirmDeletePeriod.period)
    );
    setConfirmDeletePeriod(null);
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
            id: b.liquidacionId ?? i + 1, // usa id del backend si existe
            period: b.period,
            grossTotal: b.grossTotal,
            discounts: b.discounts,
            netTotal: b.netTotal,
            nroLiquidacion: b.nroLiquidacion,
            liquidacionId: b.liquidacionId,
            estado: b.estado, // pasa el estado a la tabla
          };
          return (
            <InsuranceTable
              key={`${b.period}-${oneRow.id}`}
              title="Período:"
              periodLabel={b.period}
              data={[oneRow]}
              seeDetailsLink={`/liquidation/${resumenId}/insurance/${osId}/${b.period}/${oneRow.liquidacionId ?? b.liquidacionId}`}
              seeDetailsState={{ insurance: name }}
              onDeleteTable={() => setConfirmDeletePeriod(b)}
              // 🔗 sincronización con el card (y por ende con la página)
              onRowStateChange={(next) =>
                setPeriods(prev =>
                  prev.map(p =>
                    p.liquidacionId === next.liquidacionId
                      ? {
                          ...p,
                          estado: next.estado,
                          nroLiquidacion: next.nroLiquidacion,
                          grossTotal: next.grossTotal,
                          discounts: next.discounts,
                          netTotal: next.netTotal,
                        }
                      : p
                  )
                )
              }
              onAddVersion={(newRow) =>
                setPeriods(prev => {
                  const toAdd: PeriodBucket = {
                    period: newRow.period,
                    grossTotal: newRow.grossTotal,
                    discounts: newRow.discounts,
                    netTotal: newRow.netTotal,
                    liquidacionId: newRow.liquidacionId,
                    nroLiquidacion: newRow.nroLiquidacion,
                    estado: newRow.estado,
                  };
                  return [...prev, toAdd].sort((a, b) => a.period.localeCompare(b.period));
                })
              }
            />
          );
        })}
      </div>

      {/* Modal crear período */}
      <Dialog
        open={openMonthModal}
        onClose={() => setOpenMonthModal(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Nuevo período</DialogTitle>
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

          <TextField
            fullWidth
            label="Nro. de factura"
            value={nroInput}
            onChange={(e) => setNroInput(e.target.value)}
            margin="normal"
          />

          {(dupError || apiError) && (
            <div className={styles.error}>{dupError || apiError}</div>
          )}
        </DialogContent>
        <DialogActions className={styles.dialogActions}>
          <Button variant="secondary" onClick={() => setOpenMonthModal(false)}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleAddPeriod}
            disabled={!pickDate || saving}
          >
            {saving ? "Guardando..." : "Agregar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmación borrar */}
      {confirmDeletePeriod && (
        <Alert
          type="warning"
          title="Eliminar período"
          message={
            confirmDeletePeriod.nroLiquidacion
              ? `¿Eliminar la liquidación Nro ${confirmDeletePeriod.nroLiquidacion} (${confirmDeletePeriod.period})?`
              : `¿Eliminar el período ${confirmDeletePeriod.period}?`
          }
          showActions
          confirmLabel={saving ? "Eliminando..." : "Sí, eliminar"}
          cancelLabel="Cancelar"
          onConfirm={() => !saving && confirmDelete()}
          onCancel={() => setConfirmDeletePeriod(null)}
          onClose={() => setConfirmDeletePeriod(null)}
        />
      )}
    </motion.div>
  );
};

export default InsuranceCard;
