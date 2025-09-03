// app/pages/InsuranceDetail/InsuranceDetail.tsx
"use client";

import React, { useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import Sidebar from "../../../components/molecules/Sidebar/Sidebar";
import Button from "../../../components/atoms/Button/Button";
import InsuranceTable, {
  type InsuranceRow,
} from "../../../components/molecules/InsuranceDetailTable/InsuranceDetailTable";
import styles from "./InsuranceDetail.module.scss";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

type LocationState =
  | {
      insurance?: string;
      period?: string;
      rows?: InsuranceRow[];
    }
  | undefined;

const currency = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0 });

function mockRows(): InsuranceRow[] {
  const base: Omit<InsuranceRow, "id"> = {
    socio: "3105",
    nombreSocio: "ABUD FEDERICO",
    matri: "7100",
    nroOrden: "122871409",
    fecha: new Date().toLocaleDateString("es-AR"),
    codigo: "420361",
    nroAfiliado: "2093065/06",
    afiliado: "SALVANAK*FLOREN",
    xCant: "1-1",
    porcentaje: 100,
    honorarios: 19443,
    gastos: 0,
    coseguro: 0,
    importe: 19443,
    pagado: 0,
    tipo: "N",
    monto: 0,
    obs: "",
    total: 0,
  };

  return Array.from({ length: 6 }).map((_, i) => ({
    id: crypto.randomUUID(),
    ...base,
    socio: String(3100 + i),
    nombreSocio: i % 2 ? "GOMEZ CIUCCIO" : "MONJE*ANALIA",
    nroOrden: String(122871409 + i * 73),
    afiliado:
      i % 3 === 0
        ? "SOSA*NOELIA CON"
        : i % 3 === 1
        ? "ORTIZ*CENTURION"
        : "AQUINO MARIA",
    honorarios: 18000 + i * 900,
    importe: 18000 + i * 900,
    total: 18000 + i * 900, // para que el total se vea con datos de prueba
  }));
}

async function exportInsuranceRowsToExcel(
  period: string,
  rows: InsuranceRow[]
) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`Período ${period}`);

  ws.columns = [
    { header: "Socio", key: "socio", width: 10 },
    { header: "Nombre Socio", key: "nombreSocio", width: 22 },
    { header: "Matri.", key: "matri", width: 8 },
    { header: "Nro. Orden", key: "nroOrden", width: 14 },
    { header: "Fecha", key: "fecha", width: 12 },
    { header: "Código", key: "codigo", width: 10 },
    { header: "Nro. Afiliado", key: "nroAfiliado", width: 16 },
    { header: "Afiliado", key: "afiliado", width: 22 },
    { header: "X-Cant.", key: "xCant", width: 8 },
    { header: "%", key: "porcentaje", width: 6 },
    { header: "Honorarios", key: "honorarios", width: 14 },
    { header: "Gastos", key: "gastos", width: 10 },
    { header: "Coseguro", key: "coseguro", width: 12 },
    { header: "Importe", key: "importe", width: 12 },
    { header: "A Pagar", key: "pagado", width: 12 }, // numérico
    { header: "Tipo", key: "tipo", width: 6 },
    { header: "Monto", key: "monto", width: 12 },
    { header: "Obs", key: "obs", width: 20 },
    { header: "Total", key: "total", width: 12 },
  ] as ExcelJS.Column[];

  rows.forEach((r) =>
    ws.addRow({
      ...r,
      // pagado ya es numérico; no lo convertimos a "Sí/No"
    })
  );

  ws.getRow(1).font = { bold: true };

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `detalle_${period}.xlsx`);
}

const InsuranceDetail: React.FC = () => {
  const params = useParams<{ insurance?: string; period?: string }>();
  const location = useLocation();
  const state = location.state as LocationState;

  const rawInsurance = params.insurance ?? state?.insurance ?? "Obra social";
  const insuranceName = rawInsurance
    ? decodeURIComponent(rawInsurance)
    : "Obra social";

  const period = params.period ?? state?.period ?? "YYYY-MM";

  const initialRows = useMemo<InsuranceRow[]>(
    () => (state?.rows && state.rows.length ? state.rows : mockRows()),
    [state]
  );

  const [rows, setRows] = useState<InsuranceRow[]>(initialRows);

  // El pill debe sumar la columna "total"
  const totalImporte = useMemo(
    () => rows.reduce((s, r) => s + (r.total ?? 0), 0),
    [rows]
  );

  return (
    <div className={styles.page}>
      <Sidebar />
      <div className={styles.content}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className={styles.header}>
            <div>
              <div className={styles.breadcrumb}>Detalle de Obra Social</div>
              <h1 className={styles.title}>
                {insuranceName} —{" "}
                <span className={styles.period}>Período {period}</span>
              </h1>
            </div>
            <div className={styles.headerRight}>
              <div className={styles.totalPill}>
                Total Importe: <strong>${currency.format(totalImporte)}</strong>
              </div>
              <Button
                variant="success"
                onClick={() => exportInsuranceRowsToExcel(period, rows)}
              >
                Exportar
              </Button>
            </div>
          </div>

          <div className={styles.tableSection}>
            <InsuranceTable period={period} rows={rows} onChange={setRows} />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default InsuranceDetail;
