"use client";

import type React from "react";
import { useNavigate } from "react-router-dom";
import styles from "./UsersManagerDashboard.module.scss";
import MetricCard from "../../components/molecules/MetricCard/MetricCard";
// import LineChart from "../../components/molecules/LineChart/LineChart";
// import type { ApplicationStatus } from "../../../types/types";
import { useEffect, useState } from "react";
import { getJSON } from "../../lib/http";

// type MedicoRow = {
//   id: number;
//   nro_socio: number;
//   nombre: string;
//   // ...otros campos si los necesitás
// };

// type SolicitudApi = {
//   id: number;
//   status: ApplicationStatus; // "nueva" | "pendiente" | "aprobada" | "rechazada"
//   submitted_date?: string | null;
//   // ...otros campos si los necesitás
// };

const UsersManagerDashboard: React.FC = () => {
  const navigate = useNavigate();
  // Métricas
  const [totalSocios, setTotalSocios] = useState<number>(0);
  const [nuevas, setNuevas] = useState<number>(0);
  const [pendientes, setPendientes] = useState<number>(0);
  const [aprobadas, setAprobadas] = useState<number>(0);

  // const chartData = [
  //   { month: "Ene", value: 45 },
  //   { month: "Feb", value: 52 },
  //   { month: "Mar", value: 48 },
  //   { month: "Abr", value: 61 },
  //   { month: "May", value: 55 },
  //   { month: "Jun", value: 67 },
  // ];

  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        // 1) Total de socios (nuevo endpoint)
        const { count } = await getJSON<{ count: number }>(
          "/api/medicos/count"
        );
        if (!ignore) setTotalSocios(count ?? 0);

        // 2) Solicitudes: conteos reales (nuevo endpoint)
        type Counts = {
          total: number;
          nueva: number;
          pendiente: number;
          aprobada: number;
          rechazada: number;
        };
        const stats = await getJSON<Counts>("/api/solicitudes/stats/counts");
        if (!ignore) {
          setNuevas(stats.nueva ?? 0);
          setPendientes(stats.pendiente ?? 0);
          setAprobadas(stats.aprobada ?? 0);
        }
      } catch (e) {
        console.error(e);
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Gestión de Socios</h1>
          <p className={styles.subtitle}>
            Panel con indicadores clave y accesos rápidos
          </p>
        </div>
      </header>

      <div className={styles.metricsGrid}>
        <MetricCard
          title="Total de socios"
          value={String(totalSocios)}
          change="+0%"
          trend="up"
          color="blue"
        />
        <MetricCard
          title="Solicitudes nuevas"
          value={String(nuevas)}
          change="+0%"
          trend="up"
          color="orange"
        />
        <MetricCard
          title="Solicitudes pendientes"
          value={String(pendientes)}
          change="+0%"
          trend="down"
          color="purple"
        />
        <MetricCard
          title="Solicitudes aprobadas"
          value={String(aprobadas)}
          change="+0%"
          trend="up"
          color="green"
        />
      </div>

     <div className={styles.actionsGrid}>
        <div
          className={`${styles.actionCard} ${styles.actionCardPrimary}`}
          onClick={() => navigate("/panel/solicitudes")}
        >
          <div className={styles.actionIcon}>📋</div>
          <h3 className={styles.actionTitle}>Solicitudes de Socios</h3>
          <p className={styles.actionDescription}>Revisá, aprobá o rechazá solicitudes pendientes.</p>
          <button className={styles.actionButton}>Ver Solicitudes →</button>
        </div>

        <div
          className={`${styles.actionCard} ${styles.actionCardSecondary}`}
          onClick={() => navigate("/panel/admin-padrones")}
        >
          <div className={styles.actionIcon}>📑</div>
          <h3 className={styles.actionTitle}>Solicitudes de Padrones</h3>
          <p className={styles.actionDescription}>Revisá y gestioná las solicitudes de obras sociales.</p>
          <button className={styles.actionButton}>Ver Padrones →</button>
        </div>

        <div className={styles.actionCard} onClick={() => navigate("/panel/users")}>
          <div className={styles.actionIcon}>👥</div>
          <h3 className={styles.actionTitle}>Usuarios</h3>
          <p className={styles.actionDescription}>Gestioná la base de socios activos.</p>
          <button className={styles.actionButton}>Ver Usuarios →</button>
        </div>
      </div>

      {/* <div className={styles.chartSection}>
        <h2 className={styles.sectionTitle}>Nuevos Socios por Mes</h2>
        <LineChart data={chartData} />
      </div> */}
    </div>
  );
};

export default UsersManagerDashboard;
