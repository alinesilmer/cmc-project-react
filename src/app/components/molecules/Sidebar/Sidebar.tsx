import type React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  UserLock,
  Home,
  DollarSign,
  Hospital,
  CircleUserRound,
  UserCog,
  ChevronRight,
  ChevronLeft,
  LayoutList
} from "lucide-react";
import styles from "./Sidebar.module.scss";
import { useAuth } from "../../../auth/AuthProvider";

import Logo from "../../../../../public/logoCMC.png";

import Button from "../../atoms/Button/Button";
import { useState } from "react";
import RequirePermission from "../../../auth/RequirePermission";

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [wrapped, setWrapped] = useState(false);
  const base = "/panel";
  const baseItems = [
    { path: `${base}/dashboard`, icon: Home, label: "Inicio" },
    {
      path: `${base}/admin/permissions`,
      icon: UserLock,
      label: "Permisos y roles",
      perms: ["rbac:gestionar"],
    },
    // {
    //   path: `${base}/liquidation`,
    //   icon: DollarSign,
    //   label: "Liquidación",
    //   perms: ["liquidacion:leer", "liquidacion:ver"],
    // },
    // {
    //   path: `${base}/padron-ioscor`,
    //   icon: Hospital,
    //   label: "Padron IOSCOR",
    //   perms: ["facturacion_ioscor:leer"],
    // },
    {
      path: `${base}/users-manager`,
      icon: UserCog,
      label: "Gestión de Usuarios",
      perms: ["medicos:leer"],
    },
    // { path: "/config", icon: Cog, label: "Configuración" },                  // ← COMENTADO (punto 5)
    // { path: "/help", icon: MessageCircleQuestionMark, label: "Ayuda" },       // ← COMENTADO (punto 5)
  ];

  // Agregar “Inicio de Sesión” solo si NO hay user
  const menuItems = !user
    ? [
        ...baseItems,
        {
          path: `${base}/login`,
          icon: CircleUserRound,
          label: "Inicio de Sesión",
        },
      ]
    : baseItems;

  const onClick = async () => {
    try {
      await logout();
    } finally {
      nav(`${base}/login`, { replace: true });
    }
  };
  const isActivePath = (curr: string, target: string) =>
    curr === target || curr.startsWith(target + "/");

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
          const isActive = isActivePath(location.pathname, item.path);

          const linkEl = (
            <Link
              key={item.path}
              to={item.path}
              className={`${styles.navItem} ${isActive ? styles.active : ""}`}
            >
              <Icon size={20} />
              <span className={styles.itemLabel}>{item.label}</span>
            </Link>
          );

          // Si no hay permisos requeridos, render directo
          if (!item.perms || item.perms.length === 0) return linkEl;

          // Si hay permisos, envolver con RequirePermission (anyOf)
          return (
            <RequirePermission key={item.path} anyOf={item.perms}>
              {linkEl}
            </RequirePermission>
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
        <Button variant="danger" className={styles.dangerbtn} onClick={onClick} size="sm">
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
