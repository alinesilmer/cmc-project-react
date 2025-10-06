import type React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Stethoscope, DollarSign, Hospital, CircleUserRound } from "lucide-react";
import styles from "./Sidebar.module.scss";

const Sidebar: React.FC = () => {
  const location = useLocation();

  const menuItems = [
    { path: "/dashboard", icon: Home, label: "Inicio" },
    { path: "/doctors", icon: Stethoscope, label: "Lista de Médicos" },
    { path: "/liquidation", icon: DollarSign, label: "Liquidación" },
    { path: "/padron-ioscor", icon: Hospital, label: "Padron IOSCOR" },
    { path: "/login", icon: CircleUserRound, label: "Inicio de Sesión" }
  ];

  return (
    <div className={styles.sidebar}>
      <div className={styles.logo}>
        <img
          src="https://plus.unsplash.com/premium_photo-1689568126014-06fea9d5d341?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8cHJvZmlsZXxlbnwwfHwwfHx8MA%3D%3D"
          alt="CMC Logo"
          className={styles.logoImage}
        />
        <p className={styles.username}>Nelson Vallejos</p>
      </div>

      <nav className={styles.nav}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`${styles.navItem} ${isActive ? styles.active : ""}`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;
