"use client";

import type React from "react";
import type { LucideIcon } from "lucide-react";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  NotebookText,
  Paperclip,
  ShieldCheck,
  Trophy,
  UserCog,
  Users,
  UserSquare2,
  ExternalLink,
  ArrowRight,
  CircleDashed,
} from "lucide-react";
import { useAuth } from "../../auth/AuthProvider";
import styles from "./Dashboard.module.scss";

type StatCard = {
  label: string;
  value: string;
  tone: "teal" | "purple" | "pink" | "lavender";
};

type QuickAction = {
  icon: LucideIcon;
  title: string;
  description: string;
  link: string;
  accent: "teal" | "purple" | "pink" | "amber" | "blue";
  badge: string;
  external?: boolean;
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  const activePeriod = "202507";
  const periodStatus = "No Liquidado";
  const closingDate = "30/07/2025";
  const whatsappUrl =
    "https://wa.me/5493794532335?text=¡Hola!,%20necesito%20soporte%20con%20el%20sistema%20de%20liquidación";

  const greeting = useMemo(() => {
    const hour = new Date().getHours();

    if (hour < 12) return "Buen día";
    if (hour < 20) return "Buenas tardes";
    return "Buenas noches";
  }, []);

  const userDisplayName = useMemo(() => {
    if (!user || typeof user !== "object") return "";

    const safeUser = user as Record<string, unknown>;

    const candidates = [
      safeUser.nombre,
      safeUser.name,
      safeUser.fullName,
      safeUser.username,
      typeof safeUser.email === "string"
        ? safeUser.email.split("@")[0]
        : "",
    ];

    const found = candidates.find(
      (value) => typeof value === "string" && value.trim().length > 0
    );

    return typeof found === "string" ? found.trim() : "";
  }, [user]);

  

  const mainActions: QuickAction[] = [
    {
      icon: CalendarDays,
      title: "Liquidaciones",
      description:
        "Gestioná períodos, cierres, débitos y recibos desde el módulo principal.",
      link: "/panel/liquidation",
      accent: "teal",
      badge: "Operativo",
    },
    {
      icon: NotebookText,
      title: "Facturación",
      description:
        "Ingresá a carga, listados, cierres y herramientas de facturación.",
      link: "/panel/facturacion",
      accent: "purple",
      badge: "Operativo",
    },
    {
      icon: UserCog,
      title: "Gestión de Socios",
      description:
        "Administrá altas, cambios y seguimiento general de socios.",
      link: "/panel/users-manager",
      accent: "pink",
      badge: "Gestión",
    },
    {
      icon: Users,
      title: "Listado de Socios",
      description:
        "Consultá y revisá rápidamente el padrón completo de socios.",
      link: "/panel/users",
      accent: "amber",
      badge: "Consulta",
    },
    {
      icon: FileText,
      title: "Padrones",
      description:
        "Accedé a padrones y cruces de información por obra social.",
      link: "/panel/afiliadospadron",
      accent: "blue",
      badge: "Datos",
    },
    {
      icon: Trophy,
      title: "Ranking O.S.",
      description:
        "Visualizá comparativas, importes y desempeño por obra social.",
      link: "/panel/boletin",
      accent: "purple",
      badge: "Análisis",
    },
    {
      icon: Paperclip,
      title: "Listado de Prestadores",
      description:
        "Consultá el listado operativo de prestadores y referencias rápidas.",
      link: "/panel/padronsucio",
      accent: "pink",
      badge: "Consulta",
    },
    {
      icon: ShieldCheck,
      title: "Permisos y Roles",
      description:
        "Configurá accesos, permisos y perfiles de uso del sistema.",
      link: "/panel/admin/permissions",
      accent: "amber",
      badge: "Seguridad",
    },
  ];

  const utilityActions: QuickAction[] = [
    {
      icon: LayoutDashboard,
      title: "Sistema Fabián",
      description:
        "Abrí el sistema legado en una nueva pestaña para tareas históricas.",
      link: "https://legacy.colegiomedicocorrientes.com/principal.php",
      accent: "blue",
      badge: "Legacy",
      external: true,
    },
    {
      icon: LifeBuoy,
      title: "Soporte",
      description:
        "Contactá soporte rápido por WhatsApp para resolver incidencias.",
      link: whatsappUrl,
      accent: "teal",
      badge: "Ayuda",
      external: true,
    },
  ];

  const renderActionCard = (action: QuickAction, index: number) => {
    const Icon = action.icon;

    const content = (
      <motion.div
        className={`${styles.actionCard} ${styles[`card${action.accent}`]}`}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay: index * 0.03 }}
      >
        <div className={styles.cardGlow} />
        <div className={styles.cardHeader}>
          <span className={styles.cardBadge}>{action.badge}</span>
          <div className={styles.cardIconWrap}>
            <Icon size={22} className={styles.cardIcon} />
          </div>
        </div>

        <div className={styles.cardBody}>
          <h3 className={styles.cardTitle}>{action.title}</h3>
          <p className={styles.cardDescription}>{action.description}</p>
        </div>

        <div className={styles.cardFooter}>
          <span className={styles.cardLinkText}>Abrir módulo</span>
          {action.external ? (
            <ExternalLink size={18} className={styles.cardArrow} />
          ) : (
            <ArrowRight size={18} className={styles.cardArrow} />
          )}
        </div>

        <div className={styles.cardDecoration} />
      </motion.div>
    );

    if (action.external) {
      return (
        <a
          key={action.title}
          href={action.link}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.actionLink}
        >
          {content}
        </a>
      );
    }

    return (
      <Link key={action.title} to={action.link} className={styles.actionLink}>
        {content}
      </Link>
    );
  };

  return (
    <div className={styles.dashboard}>
      <div className={styles.content}>
        <motion.section
          className={styles.hero}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24 }}
        >
          <div className={styles.heroText}>
            <span className={styles.heroEyebrow}>Panel principal</span>

            <h1 className={styles.welcome}>
              {greeting}
              {userDisplayName ? `, ${userDisplayName}` : ""}.
            </h1>

            <p className={styles.subtitle}>
              Accedé rápido a los módulos más usados del sistema y mantené a la
              vista el estado general del período operativo.
            </p>

            <div className={styles.heroActions}>
              <Link to="/panel/facturacion" className={styles.primaryHeroButton}>
                Ir a Facturación
              </Link>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.secondaryHeroButton}
              >
                Contactar soporte
              </a>
            </div>
          </div>

          <div className={styles.heroVisual} aria-hidden="true">
            <div className={styles.visualOrbLarge} />
            <div className={styles.visualOrbSmall} />
            <div className={styles.visualPanel}>
              <div className={styles.visualPanelTop}>
                <span className={styles.visualDot} />
                <span className={styles.visualDot} />
                <span className={styles.visualDot} />
              </div>

              <div className={styles.visualMockGrid}>
                <div className={styles.mockCardTall} />
                <div className={styles.mockStack}>
                  <div className={styles.mockCardWide} />
                  <div className={styles.mockCardSmall} />
                  <div className={styles.mockCardSmallAlt} />
                </div>
              </div>
            </div>

            
          </div>
        </motion.section>

      

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Módulos principales</h2>
            </div>
          </div>

          <div className={styles.actionsGrid}>
            {mainActions.map((action, index) => renderActionCard(action, index))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Herramientas rápidas</h2>
              <p className={styles.sectionSubtitle}>
                Accesos complementarios para soporte y sistema legado.
              </p>
            </div>
          </div>

          <div className={styles.utilityGrid}>
            {utilityActions.map((action, index) =>
              renderActionCard(action, mainActions.length + index)
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;