"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Sidebar from "../../../components/molecules/Sidebar/Sidebar";
import SearchBar from "../../../components/molecules/SearchBar/SearchBar";
import Button from "../../../components/atoms/Button/Button";
import InsuranceCard from "../../../components/molecules/InsuranceCard/InsuranceCard";
import styles from "./LiquidationCycle.module.scss";

type InsuranceItem = { id: string; name: string };

const LiquidationCycle: React.FC = () => {
  const [query, setQuery] = useState("");
  const [insurances, setInsurances] = useState<InsuranceItem[]>([
    { id: "sancor", name: "Sancor" },
    { id: "medife", name: "Medifé" },
  ]);

  const filtered = useMemo(
    () =>
      insurances.filter((i) =>
        i.name.toLowerCase().includes(query.trim().toLowerCase())
      ),
    [insurances, query]
  );

  const removeInsurance = (id: string) =>
    setInsurances((prev) => prev.filter((i) => i.id !== id));

  return (
    <div className={styles.liquidationCyclePage}>
      <Sidebar />

      <div className={styles.content}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className={styles.header}>
            <div>
              <div className={styles.breadcrumb}>CICLO DE LIQUIDACIÓN</div>
              <h1 className={styles.title}>Período 2</h1>
            </div>
            <button className={styles.closeLiquidation}>
              Cerrar Liquidación
            </button>
            <div className={styles.rightActions}>
              <Button variant="primary">Pre-Visualizar</Button>
              <Button variant="success">Exportar Todo</Button>
            </div>
          </div>

          <div className={styles.tabs}>
            <button className={`${styles.tab} ${styles.active}`}>
              Obras Sociales
            </button>
            <button className={styles.tab}>Débitos de Colegio</button>
          </div>

          <div className={styles.searchSection}>
            <SearchBar
              placeholder="Buscar..."
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setQuery(e.target.value)
              }
            />
          </div>

          <div className={styles.socialWorksList}>
            {filtered.map((ins) => (
              <InsuranceCard
                key={ins.id}
                name={ins.name}
                onSummary={(periods) =>
                  console.log("Resumen", ins.name, periods)
                }
                onExport={(periods) =>
                  console.log("Exportar", ins.name, periods)
                }
                onDelete={() => removeInsurance(ins.id)}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LiquidationCycle;
