"use client";

import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  FaUserPlus,
  FaFileInvoiceDollar,
  FaCheckCircle,
  FaNewspaper,
  FaYoutube,
  FaArrowRight,
} from "react-icons/fa";
import styles from "./Welcome.module.scss";
import Button from "../../../components/UI/Button/Button";

const ETICA_PDF = "https://colegiomedicocorrientes.com/CMC092025.pdf";

type QuickCard = {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
};

const CARDS: QuickCard[] = [
  {
    title: "Recepción y Liquidación de Facturación",
    description: "Ingresá al portal de facturación y liquidación.",
    href: "https://comecorammeco.com/web/",
    icon: <FaFileInvoiceDollar />,
  },
  {
    title: "Médicos Asociados",
    description: "Conocé a nuestros socios y especialidades.",
    href: "/medicos-asociados",
    icon: <FaCheckCircle />,
  },
  {
    title: "Noticias",
    description: "Comunicados, novedades y eventos del Colegio.",
    href: "/noticias",
    icon: <FaNewspaper />,
  },
  {
    title: "Tutoriales para Validar",
    description: "Guías y ayuda para validación y uso del sistema.",
    href: "/contacto",
    icon: <FaYoutube />,
  },
];

function isExternal(href: string) {
  return /^https?:\/\//i.test(href);
}

export default function Welcome() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [openDropdown, setOpenDropdown] = useState<
      null | "nosotros" | "servicios"
    >(null);
    const [mobileOpen, setMobileOpen] = useState({
      nosotros: false,
      servicios: false,
    });
    
    
const closeAll = () => {
    setMenuOpen(false);
    setOpenDropdown(null);
    setMobileOpen({ nosotros: false, servicios: false });
  };

  return (
    <section className={styles.hero}>
      <div className={styles.wrap}>
        <div className={styles.heroCard}>
          <div className={styles.left}>
            <h1 className={styles.title}>
              Donde la <span className={styles.emphasis}>comunidad</span> <br />
              y el <span className={styles.emphasis}>bienestar</span> se unen
            </h1>

            <p className={styles.lead}>
              Si buscás una forma simple y confiable de gestionar tu práctica,
              estamos para acompañarte. Unite al Colegio y accedé a servicios,
              beneficios y soporte que facilitan tu día a día.
            </p>

            <div className={styles.ctaRow}>
              <Link
                        to={`https://wa.me/543794252323?text=${encodeURIComponent(
                          "Hola, quisiera información para asociarme al Colegio Médico de Corrientes, por favor. ¡Gracias!."
                        )}`}
                        className={styles.subLink}
                        onClick={closeAll}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="primary" size="medium">
                  <FaUserPlus className={styles.buttonIcon} />
                  Asociarme
                </Button>
                      </Link>

              <a
                className={styles.ctaLink}
                href={ETICA_PDF}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="default" size="medium">
                  Ver Boletín Informativo
                </Button>
              </a>
            </div>
          </div>

          <div className={styles.right} aria-hidden="true">
            <div className={styles.imageFrame}>
              <img
                src="https://i.pinimg.com/1200x/9e/a1/c9/9ea1c9ea2380bb6da2755458db9021e4.jpg"
                alt=""
                loading="lazy"
                decoding="async"
                className={styles.image}
              />
            </div>
          </div>

          <div className={styles.cardsHeader}>
            <h2 className={styles.cardsTitle}>Accesos rápidos</h2>
          </div>

          <div className={styles.cardsGrid} role="list">
            {CARDS.map((card) => {
              const content = (
                <div className={styles.card}>
                  <div className={styles.cardTop}>
                    <div className={styles.cardIcon} aria-hidden="true">
                      {card.icon}
                    </div>
                    <FaArrowRight className={styles.cardArrow} aria-hidden="true" />
                  </div>

                  <h3 className={styles.cardTitle}>{card.title}</h3>
                  <p className={styles.cardDesc}>{card.description}</p>
                </div>
              );

              return isExternal(card.href) ? (
                <a
                  key={card.title}
                  href={card.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.cardLink}
                  role="listitem"
                >
                  {content}
                </a>
              ) : (
                <Link
                  key={card.title}
                  to={card.href}
                  className={styles.cardLink}
                  role="listitem"
                >
                  {content}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}