import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiUserCheck,
  FiShield,
  FiBookOpen,
  FiAward,
  FiHeadphones,
  FiUsers,
} from "react-icons/fi";
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
import stethoscopeDeco from "../../../assets/images/stethoscope-deco.png";

const ETICA_PDF = "https://legacy.colegiomedicocorrientes.com/CMC_03_2026.pdf";

// ── 6 institutional benefit cards ─────────────────────────────────────────────
type BenefitCard = { icon: ReactNode; title: string; description: string };

const BENEFITS: BenefitCard[] = [
  {
    icon: <FiUserCheck />,
    title: "Ejercicio legal",
    description: "Matrícula e inscripción con pleno respaldo institucional.",
  },
  {
    icon: <FiShield />,
    title: "Defensa profesional",
    description: "Representación de los intereses y necesidades de los médicos.",
  },
  {
    icon: <FiBookOpen />,
    title: "Formación continua",
    description: "Cursos, jornadas y actualizaciones profesionales permanentes.",
  },
  {
    icon: <FiAward />,
    title: "Ética y calidad",
    description: "Compromiso con la buena práctica médica y la excelencia.",
  },
  {
    icon: <FiHeadphones />,
    title: "Servicios y asesoramiento",
    description: "Apoyo administrativo e institucional a cada colegiado.",
  },
  {
    icon: <FiUsers />,
    title: "Comunidad médica",
    description: "Participación, conexión y pertenencia al Colegio.",
  },
];

// ── 4 quick-access cards ─────────────────────────────────────────────────────
type QuickCard = { title: string; description: string; href: string; icon: ReactNode };

const QUICK_CARDS: QuickCard[] = [
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

const EASE = [0.22, 1, 0.36, 1] as const;

function isExternal(href: string) {
  return /^https?:\/\//i.test(href);
}

export default function Welcome() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>

        {/* ── Section heading + decorative image ─────────────────────────── */}
        <div className={styles.heroSection}>
          <motion.div
            className={styles.header}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-70px" }}
            transition={{ duration: 0.65, ease: EASE }}
          >
            <h2 className={styles.title}>Donde la <i>comunidad</i> y el <i>bienestar</i> se unen</h2>
          </motion.div>

          <motion.img
            src={stethoscopeDeco}
            alt=""
            aria-hidden="true"
            draggable={false}
            className={styles.heroDeco}
            style={{ y: "-50%" }}
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-70px" }}
            transition={{ duration: 0.75, ease: EASE, delay: 0.2 }}
          />
        </div>

        {/* ── 6 benefit cards ─────────────────────────────────────────────── */}
        <div className={styles.benefitsGrid} role="list">
          {BENEFITS.map((b, i) => (
            <motion.div
              key={b.title}
              className={styles.benefitCard}
              role="listitem"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, ease: EASE, delay: i * 0.07 }}
            >
              <div className={styles.benefitIcon} aria-hidden="true">{b.icon}</div>
              <h3 className={styles.benefitTitle}>{b.title}</h3>
              <p className={styles.benefitDesc}>{b.description}</p>
            </motion.div>
          ))}
        </div>

        {/* ── CTA row ─────────────────────────────────────────────────────── */}
        <motion.div
          className={styles.ctaRow}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.55, ease: EASE, delay: 0.15 }}
        >
          <Link to="/socios" className={styles.ctaLink}>
            <Button variant="secondary" size="xlg">
              <FaUserPlus className={styles.buttonIcon} />
              Asociarme
            </Button>
          </Link>
          <a href={ETICA_PDF} className={styles.ctaLink} target="_blank" rel="noopener noreferrer">
            <Button variant="secondary" size="xlg">
              Ver Boletín Informativo
            </Button>
          </a>
        </motion.div>

        {/* ── Quick-access cards ───────────────────────────────────────────── */}
        <motion.div
          className={styles.quickHeader}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55, ease: EASE }}
        >
          <h3 className={styles.quickTitle}>Accesos rápidos</h3>
        </motion.div>

        <div className={styles.quickGrid} role="list">
          {QUICK_CARDS.map((card, i) => {
            const inner = (
              <div className={styles.quickCard}>
                <div className={styles.quickCardTop}>
                  <div className={styles.quickCardIcon} aria-hidden="true">{card.icon}</div>
                  <FaArrowRight className={styles.quickCardArrow} aria-hidden="true" />
                </div>
                <h4 className={styles.quickCardTitle}>{card.title}</h4>
                <p className={styles.quickCardDesc}>{card.description}</p>
              </div>
            );

            const link = isExternal(card.href) ? (
              <a
                href={card.href}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.quickCardLink}
                role="listitem"
              >
                {inner}
              </a>
            ) : (
              <Link to={card.href} className={styles.quickCardLink} role="listitem">
                {inner}
              </Link>
            );

            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, ease: EASE, delay: i * 0.07 }}
              >
                {link}
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
