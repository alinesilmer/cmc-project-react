// components/molecules/InsuranceTable/InsuranceTable.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
// import { saveAs } from "file-saver";
// import ExcelJS from "exceljs";
import styles from "./InsuranceTable.module.scss";
import Button from "../../atoms/Button/Button";
import { Link } from "react-router-dom";

export type Period = {
  id: number | string;
  period: string;
  grossTotal: number;
  discounts: number;
  netTotal: number;

  /** Datos del backend para operar y mostrar */
  nroLiquidacion?: string;
  liquidacionId?: number | string;
  estado?: "A" | "C"; // A = abierta, C = cerrada
};

type Props = {
  periodLabel: string;
  data: Period[];
  className?: string;
  title?: string;
  loading?: boolean;

  /** Eliminar la tabla (p. ej. borrar período) */
  onDeleteTable?: () => void;

  seeDetailsLink?: string;
  seeDetailsState?: unknown;
  onSeeDetails?: () => void;

  /** Callbacks para sincronizar con el padre (InsuranceCard) */
  onRowStateChange?: (next: Period) => void; // tras cerrar / reabrir simple
  onAddVersion?: (row: Period) => void;      // tras refacturar (nueva versión)
};

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000";
const LIQ_CERRAR     = (id: number | string) => `${API_BASE}/api/liquidacion/liquidaciones_por_os/${id}/cerrar`;
const LIQ_REABRIR    = (id: number | string) => `${API_BASE}/api/liquidacion/liquidaciones_por_os/${id}/reabrir`;      // reabrir simple (mismo id)
const LIQ_REFACTURAR = (id: number | string) => `${API_BASE}/api/liquidacion/liquidaciones_por_os/${id}/refacturar`;   // nueva versión

// async function exportPeriodsToExcel(rows: Period[], filename = "periodo.xlsx") {
//   const wb = new ExcelJS.Workbook();
//   const ws = wb.addWorksheet("Períodos");

//   ws.columns = [
//     { header: "Período", key: "period", width: 12 },
//     { header: "Bruto", key: "grossTotal", width: 12 },
//     { header: "Débitos", key: "discounts", width: 14 },
//     { header: "Neto", key: "netTotal", width: 12 },
//     { header: "Nro. Factura", key: "nroLiquidacion", width: 18 },
//     { header: "Estado", key: "estado", width: 10 },
//   ] as ExcelJS.Column[];

//   rows.forEach((r) =>
//     ws.addRow({
//       period: r.period,
//       grossTotal: r.grossTotal,
//       discounts: r.discounts,
//       netTotal: r.netTotal,
//       nroLiquidacion: r.nroLiquidacion ?? "",
//       estado: r.estado ?? "A",
//     })
//   );

//   ws.getRow(1).font = { bold: true };
//   const buf = await wb.xlsx.writeBuffer();
//   saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
// }

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
  onRowStateChange,
  onAddVersion,
}) => {
  const [busyId, setBusyId] = useState<number | string | null>(null);

  // Estado local optimista del primer row (este componente muestra 1 período)
  const [selfRow, setSelfRow] = useState<Period | null>(null);

  // Solo adoptamos el prop si cambia el liquidacionId (evita pisar el estado local)
  useEffect(() => {
    const incoming = data?.[0] ?? null;
    if (!incoming) return;
    setSelfRow(prev =>
      !prev || incoming.liquidacionId !== prev.liquidacionId ? incoming : prev
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.[0]?.liquidacionId]);

  const row = useMemo(() => selfRow ?? data?.[0], [selfRow, data]);
  const nro = row?.nroLiquidacion ?? "";
  const estado = (row?.estado ?? "A").toUpperCase() as "A" | "C";
  const isOpen = estado === "A";

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

  // --- acciones ---
  const cerrar = async () => {
    if (!row?.liquidacionId) return;
    setBusyId(row.liquidacionId);
    try {
      const r = await fetch(LIQ_CERRAR(row.liquidacionId), { method: "POST" });
      if (!r.ok) throw new Error(`No se pudo cerrar (HTTP ${r.status})`);
      const next: Period = { ...row, estado: "C" };
      setSelfRow(next);         // UI inmediata
      onRowStateChange?.(next); // sincroniza con el padre
    } catch (e: any) {
      alert(e?.message || "Error al cerrar");
    } finally {
      setBusyId(null);
    }
  };

  const reabrirSimple = async () => {
    if (!row?.liquidacionId) return;
    setBusyId(row.liquidacionId);
    try {
      const r = await fetch(LIQ_REABRIR(row.liquidacionId), { method: "POST" });
      if (!r.ok) throw new Error(`No se pudo reabrir (HTTP ${r.status})`);
      const data = await r.json();
      const next: Period = {
        ...row,
        estado: String(data?.estado ?? "A").toUpperCase() as "A" | "C",
        nroLiquidacion: data?.nro_liquidacion ?? row.nroLiquidacion,
        grossTotal: Number(data?.total_bruto ?? row.grossTotal),
        discounts: Number(data?.total_debitos ?? row.discounts),
        netTotal: Number(data?.total_neto ?? row.netTotal),
      };
      setSelfRow(next);         // UI inmediata
      onRowStateChange?.(next); // sincroniza con el padre
    } catch (e: any) {
      alert(e?.message || "Error al reabrir");
    } finally {
      setBusyId(null);
    }
  };

  const refacturar = async () => {
    if (!row?.liquidacionId) return;
    const base = window.prompt(
      "Nro base para la nueva factura (ej: 000123)",
      (row.nroLiquidacion ?? "").split("-")[1] ?? ""
    );
    if (!base || !base.trim()) return;

    setBusyId(row.liquidacionId);
    try {
      const r = await fetch(LIQ_REFACTURAR(row.liquidacionId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nro_liquidacion: base.trim() }),
      });
      if (!r.ok) throw new Error(`No se pudo refacturar (HTTP ${r.status})`);
      const nueva = await r.json(); // nueva liquidación (versión+1)

      const newRow: Period = {
        id: nueva?.id,
        liquidacionId: nueva?.id,
        period: periodLabel,
        grossTotal: Number(nueva?.total_bruto || 0),
        discounts: Number(nueva?.total_debitos || 0),
        netTotal:
          nueva?.total_neto != null
            ? Number(nueva.total_neto)
            : Number(nueva?.total_bruto || 0) - Number(nueva?.total_debitos || 0),
        nroLiquidacion: nueva?.nro_liquidacion ?? "",
        estado: String(nueva?.estado ?? "A").toUpperCase() as "A" | "C",
      };

      onAddVersion?.(newRow); // el padre agrega la nueva fila a la lista
      alert("Refacturación creada. Ya podés ingresar al detalle de la nueva versión.");
    } catch (e: any) {
      alert(e?.message || "Error al refacturar");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={`${styles.tableWrap} scale-in ${className}`}>
      <div className={styles.tableTitle}>
        <div className={styles.left}>
          <span className={styles.tableTitleText}>{title}</span>
          <span className={styles.periodBadge}>Período {periodLabel}</span>
          {nro && <span className={styles.periodBadge}>Nro. Factura: {nro}</span>}
          <span className={`${styles.stateBadge} ${isOpen ? styles.open : styles.closed}`}>
            {isOpen ? "ABIERTA" : "CERRADA"}
          </span>
        </div>

        <div className={styles.titleActions}>
          {seeDetailsLink ? (
            <Link to={seeDetailsLink} state={seeDetailsState}>
              <Button variant="primary" size="sm">Ver Detalles</Button>
            </Link>
          ) : (
            <Button variant="primary" size="sm" onClick={onSeeDetails}>Ver Detalles</Button>
          )}

          {/* <Button
            variant="success"
            size="sm"
            onClick={() => exportPeriodsToExcel(data, `periodo_${periodLabel}.xlsx`)}
          >
            Exportar
          </Button> */}

          {isOpen ? (
            <Button
              variant="danger"
              size="sm"
              onClick={cerrar}
              disabled={busyId === row?.liquidacionId}
            >
              {busyId === row?.liquidacionId ? "Cerrando..." : "Cerrar"}
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={reabrirSimple}
                disabled={busyId === row?.liquidacionId}
              >
                {busyId === row?.liquidacionId ? "Procesando..." : "Reabrir"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={refacturar}
                disabled={busyId === row?.liquidacionId}
              >
                {busyId === row?.liquidacionId ? "Procesando..." : "Refacturar"}
              </Button>
            </>
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
        <div>Débitos</div>
        <div>Neto</div>
      </div>

      <div className={styles.body}>
        {data.map((r, i) => (
          <div
            key={r.id ?? i}
            className={`${styles.dataRow} ${styles.noStatus} fade-in`}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div>{r.period}</div>
            <div>${r.grossTotal.toLocaleString()}</div>
            <div>-${r.discounts.toLocaleString()}</div>
            <div>${r.netTotal.toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InsuranceTable;
