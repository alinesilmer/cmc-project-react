"use client";

import type React from "react";
import { motion } from "framer-motion";
import { Users, FileText, Calendar, DollarSign, Settings } from "lucide-react";
import Sidebar from "../../../components/molecules/Sidebar/Sidebar";
import Card from "../../../components/atoms/Card/Card";
import styles from "./Dashboard.module.scss";

const Dashboard: React.FC = () => {
  const quickActions = [
    { icon: Users, title: "Lista de Médicos", path: "/doctors" },
    { icon: FileText, title: "Débitos de Obra Social", path: "/social-work" },
    { icon: Calendar, title: "Lista de Períodos", path: "/liquidation" },
    { icon: DollarSign, title: "Cargar Débitos", path: "/liquidation-cycle" },
    { icon: Settings, title: "Soporte", path: "/support" },
  ];

  return (
    <div className={styles.dashboard}>
      <Sidebar />

      <div className={styles.content}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className={styles.header}>
            <h1 className={styles.welcome}>¡Bienvenido!</h1>
            <p className={styles.subtitle}>
              Elegí una opción del menú lateral o usá los accesos rápidos.
            </p>
          </div>

          <div className={styles.statusCards}>
            <Card className={styles.statusCard}>
              <h3>Período Activo</h3>
              <div className={styles.statusValue}>202507</div>
            </Card>

            <Card className={styles.statusCard}>
              <h3>Estado del Período</h3>
              <div className={styles.statusValue}>No Liquidado</div>
            </Card>

            <Card className={styles.statusCard}>
              <h3>Cierre del Período</h3>
              <div className={styles.statusValue}>30/07/2025</div>
            </Card>
          </div>

          <div className={styles.quickActions}>
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.div
                  key={action.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Card hoverable className={styles.actionCard}>
                    <Icon size={32} className={styles.actionIcon} />
                    <h3 className={styles.actionTitle}>{action.title}</h3>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
