import type React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Users, DollarSign, Calendar } from "lucide-react";
import styles from "./Sidebar.module.scss";

const Sidebar: React.FC = () => {
  const location = useLocation();

  const menuItems = [
    { path: "/dashboard", icon: Home, label: "Inicio" },
    { path: "/doctors", icon: Users, label: "Lista de Médicos" },
    { path: "/liquidation", icon: DollarSign, label: "Liquidación" },
    { path: "/discounts", icon: Calendar, label: "Descuentos" },
  ];

  return (
    <div className={styles.sidebar}>
      <div className={styles.logo}>
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Captura%20de%20pantalla%202025-08-27%20213736-19MtVGs9R7PVKaN3PTA1TyGpis6tYG.png"
          alt="CMC Logo"
          className={styles.logoImage}
        />
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
