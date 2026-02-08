"use client";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./Help.module.scss";
import {
  Search,
  BookOpen,
  ClipboardList,
  Receipt,
  Building2,
  Settings,
  Users,
} from "lucide-react";

type Categoria = {
  id: string;
  icono: React.ReactNode;
  titulo: string;
  descripcion: string;
  href: string;
};

const Chip: React.FC<{ label: string; onClick: () => void }> = ({
  label,
  onClick,
}) => (
  <button type="button" className={styles.chip} onClick={onClick}>
    #{label}
  </button>
);

const CategoryCard: React.FC<Categoria> = ({
  icono,
  titulo,
  descripcion,
  href,
}) => (
  <Link to={href} className={styles.card}>
    <div className={styles.cardIcon}>{icono}</div>
    <h3 className={styles.cardTitle}>{titulo}</h3>
    <p className={styles.cardDesc}>{descripcion}</p>
  </Link>
);

const Help: React.FC = () => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const categorias: Categoria[] = [
    {
      id: "inicio",
      icono: <BookOpen size={36} />,
      titulo: "Primeros pasos",
      descripcion:
        "Todo lo necesario para empezar a usar el sistema y registrar médicos.",
      href: "/ayuda/primeros-pasos",
    },
    {
      id: "practicas",
      icono: <ClipboardList size={36} />,
      titulo: "Cargar prácticas",
      descripcion:
        "Ingreso de órdenes y validación con obras sociales (IOSCOR, PAMI, etc.).",
      href: "/ayuda/cargar-practicas",
    },
    {
      id: "facturacion",
      icono: <Receipt size={36} />,
      titulo: "Facturación y liquidación",
      descripcion:
        "Armar lotes, emitir facturas y liquidar honorarios de los médicos.",
      href: "/ayuda/facturacion-liquidacion",
    },
    {
      id: "obras",
      icono: <Building2 size={36} />,
      titulo: "Obras sociales e integraciones",
      descripcion:
        "Configuración de convenios, padrones y conexiones con terceros.",
      href: "/ayuda/obras-sociales",
    },
    {
      id: "cuenta",
      icono: <Settings size={36} />,
      titulo: "Cuenta y ajustes",
      descripcion:
        "Preferencias, seguridad, permisos y datos de la organización.",
      href: "/ayuda/cuenta-ajustes",
    },
    {
      id: "equipo",
      icono: <Users size={36} />,
      titulo: "Gestionar equipo",
      descripcion: "Altas de socios, roles, accesos y auditoría.",
      href: "/ayuda/equipo",
    },
  ];

  const populares = [
    "ioscor",
    "liquidación",
    "padrones",
    "pagos",
    "errores de carga",
  ];

  const onBuscar = () => {
    if (!q.trim()) return;
    navigate(`/ayuda/buscar?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className={styles.wrap}>
      <header className={styles.hero}>
        <h1 className={styles.title}>¿Cómo podemos ayudarte?</h1>

        <div className={styles.searchRow}>
          <div className={styles.search}>
            <Search size={18} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onBuscar()}
              placeholder="Buscá en nuestra base de conocimiento"
              aria-label="Buscar en el centro de ayuda"
            />
            <button onClick={onBuscar} className={styles.searchBtn}>
              Buscar
            </button>
          </div>
        </div>

        <div className={styles.popular}>
          <span>Búsquedas populares</span>
          <div className={styles.chips}>
            {populares.map((t) => (
              <Chip key={t} label={t} onClick={() => setQ(t)} />
            ))}
          </div>
        </div>
      </header>

      <main className={styles.content}>
        <div className={styles.cardsRow}>
          {categorias.map((c) => (
            <CategoryCard key={c.id} {...c} />
          ))}
        </div>
      </main>
    </div>
  );
};

export default Help;
