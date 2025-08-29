"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Sidebar from "../../../components/molecules/Sidebar/Sidebar";
import SearchBar from "../../../components/molecules/SearchBar/SearchBar";
import Card from "../../../components/atoms/Card/Card";
import Button from "../../../components/atoms/Button/Button";
import styles from "./LiquidationPeriods.module.scss";
import PeriodsTable, {
  type Period,
} from "../../../components/molecules/PeriodsTable/PeriodsTable";
import Alert from "../../../components/atoms/Alert/Alert";

const LiquidationPeriods: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "" | "EN CURSO" | "FINALIZADO"
  >("");
  const [periods, setPeriods] = useState<Period[]>([
    {
      id: 1,
      period: "2024-05",
      grossTotal: 140000,
      discounts: 20000,
      netTotal: 120000,
      status: "EN CURSO",
    },
    {
      id: 2,
      period: "2024-04",
      grossTotal: 95000,
      discounts: 10000,
      netTotal: 85000,
      status: "FINALIZADO",
    },
    {
      id: 3,
      period: "2024-03",
      grossTotal: 135000,
      discounts: 18000,
      netTotal: 117000,
      status: "FINALIZADO",
    },
    {
      id: 4,
      period: "2024-02",
      grossTotal: 110000,
      discounts: 12000,
      netTotal: 98000,
      status: "FINALIZADO",
    },
    {
      id: 5,
      period: "2024-01",
      grossTotal: 120000,
      discounts: 15000,
      netTotal: 105000,
      status: "FINALIZADO",
    },
  ]);

  const [confirmRow, setConfirmRow] = useState<Period | null>(null);

  const handleDelete = (row: Period) => setConfirmRow(row);

  const confirmDelete = () => {
    if (!confirmRow) return;
    setPeriods((prev) => prev.filter((p) => p.id !== confirmRow.id));
    setConfirmRow(null);
  };

  const filtered = useMemo(() => {
    const s = searchTerm.trim().toLowerCase();
    return periods.filter((p) => {
      const matchesSearch =
        !s ||
        p.period.toLowerCase().includes(s) ||
        p.status.toLowerCase().includes(s);
      const matchesStatus = !statusFilter || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [periods, searchTerm, statusFilter]);

  const handleAddPeriod = () => {
    const nextId = (periods.at(-1)?.id ?? 0) + 1;
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    setPeriods((prev) => [
      {
        id: nextId,
        period: `${yyyy}-${mm}`,
        grossTotal: 0,
        discounts: 0,
        netTotal: 0,
        status: "EN CURSO",
      },
      ...prev,
    ]);
  };

  return (
    <div className={styles.liquidationPage}>
      <Sidebar />

      <div className={styles.content}>
        <motion.div
          className="fade-in"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <SearchBar
                placeholder="Buscar período..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className={styles.filters}>
                <select
                  className={styles.statusFilter}
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value as "" | "EN CURSO" | "FINALIZADO"
                    )
                  }
                >
                  <option value="">TODOS</option>
                  <option value="EN CURSO">EN CURSO</option>
                  <option value="FINALIZADO">FINALIZADO</option>
                </select>
              </div>
            </div>

            <Button variant="primary" onClick={handleAddPeriod}>
              Agregar Período
            </Button>
          </div>

          <Card className={`${styles.tableCard} scale-in`}>
            <PeriodsTable
              title="Períodos de Liquidación"
              data={filtered}
              onSeeMore={(row) =>
                alert(`Ver más sobre el período ${row.period}`)
              }
              onRequestDelete={handleDelete}
            />
            {confirmRow && (
              <Alert
                type="warning"
                title="Eliminar período"
                message={`¿Seguro que querés eliminar el período ${confirmRow.period}? Esta acción no se puede deshacer.`}
                onClose={() => setConfirmRow(null)}
                onCancel={() => setConfirmRow(null)}
                onConfirm={confirmDelete}
                confirmLabel="Sí, eliminar"
                cancelLabel="Cancelar"
                showActions
              />
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default LiquidationPeriods;
