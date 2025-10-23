"use client";

import type React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Users, FileText, Calendar, DollarSign, Settings } from "lucide-react";
import Card from "../../../components/atoms/Card/Card";
import styles from "./Dashboard.module.scss";

const Dashboard: React.FC = () => {
  const activePeriod = "202507";
  const whatsappUrl =
    "https://wa.me/5493794532335?text=¡Hola!,%20necesito%20soporte%20con%20el%20sistema%20de%20liquidación";

  const quickActions = [
    { icon: Users, title: "Gestor de usuarios", link: "/users-manager" },
    // {
    //   icon: FileText,
    //   title: "Débitos de Obra Social",
    //   link: `/dashboard`,
    // },
    { icon: Calendar, title: "Liquidaciones", link: "/liquidation" },
    // {
    //   icon: DollarSign,
    //   title: "Descuentos",
    //   link: `/dashboard`,
    // },
    { icon: Settings, title: "Soporte", link: whatsappUrl, external: true },
  ];

  return (
    <div className={styles.dashboard}>
      <div className={styles.content}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.12, ease: "linear" }}
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
              <div className={styles.statusValue}>{activePeriod}</div>
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
              const tileClass = [
                styles.tileYellow,
                styles.tilePink,
                styles.tilePurple,
                styles.tileBlue,
                styles.tileOrange,
              ][index % 5];

              const content = (
                <Card hoverable className={`${styles.actionCard} ${tileClass}`}>
                  <div className={styles.actionTop}>
                    <Icon size={32} className={styles.actionIcon} />
                  </div>
                  <h3 className={styles.actionTitle}>{action.title}</h3>
                  <span className={styles.actionHint}>Abrir</span>
                </Card>
              );

              return (
                <motion.div
                  key={action.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.02 }}
                >
                  {action.external ? (
                    <a
                      className={styles.actionLink}
                      href={action.link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {content}
                    </a>
                  ) : (
                    <Link className={styles.actionLink} to={action.link}>
                      {content}
                    </Link>
                  )}
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
