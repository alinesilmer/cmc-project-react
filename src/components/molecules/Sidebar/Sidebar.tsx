import type React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { UserLock ,Home, DollarSign, Hospital, CircleUserRound, UserCog, ChevronRight, ChevronLeft } from "lucide-react";
import styles from "./Sidebar.module.scss";
import { useAuth } from "../../../auth/AuthProvider";

import Logo from "../../../../public/logoCMC.png";

import Button from "../../atoms/Button/Button";
import { useState } from "react";

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user ,logout } = useAuth();
  const nav = useNavigate();
  const [wrapped, setWrapped] = useState(false);

  const baseItems = [
    { path: "/dashboard", icon: Home, label: "Inicio" },
    { path: "/admin/permissions", icon: UserLock, label: "Permisos y roles" },
    { path: "/liquidation", icon: DollarSign, label: "Liquidación" },
    { path: "/padron-ioscor", icon: Hospital, label: "Padron IOSCOR" },
    // { path: "/config", icon: Cog, label: "Configuración" },                  // ← COMENTADO (punto 5)
    // { path: "/help", icon: MessageCircleQuestionMark, label: "Ayuda" },       // ← COMENTADO (punto 5)
    { path: "/users-manager", icon: UserCog, label: "Gestión de Usuarios"},
  ];

  // Agregar “Inicio de Sesión” solo si NO hay user
  const menuItems = !user
    ? [...baseItems, { path: "/login", icon: CircleUserRound, label: "Inicio de Sesión" }]
    : baseItems;

  const onClick = async () => {
    try {
      await logout();
    } finally {
      nav("/login", { replace: true });
    }
  };

  return (
    <div className={`${styles.sidebar} ${wrapped ? styles.collapsed : ""}`}>
      <div className={styles.toggle}>
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setWrapped((v) => !v)}
          aria-label={wrapped ? "Expandir" : "Contraer"}
        >
          {wrapped ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
      <div className={styles.logoRow}>
        <div className={styles.logo}>
          <img src={Logo} alt="CMC Logo" className={styles.logoImage} />
        </div>
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
              <span className={styles.itemLabel}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.spacer} />
      <div className={styles.config}>
        {/* <Link to="/config" className={styles.configItem}>
          <Cog size={20} />
          <span className={styles.itemLabel}>Configuración</span>
        </Link>
        <Link to="/help" className={styles.configItem}>
          <MessageCircleQuestionMark size={20} />
          <span className={styles.itemLabel}>Ayuda</span>
        </Link> */}
        <Button
          variant="danger"
          onClick={onClick}
          size="sm"
        >
          Cerrar sesión
        </Button>
      </div>

      <footer className={styles.footer}>
        <p className={styles.itemLabel}>
          &copy; 2025 CMC. Todos los <br />
          derechos reservados.
        </p>
      </footer>
    </div>
  );
};

export default Sidebar;
