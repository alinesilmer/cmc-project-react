import { motion } from "framer-motion";
import { FaHeart, FaHandshake, FaLightbulb } from "react-icons/fa";
import { FaMagnifyingGlass } from "react-icons/fa6";
import styles from "./nosotros.module.scss";
import PageHero from "../../components/UI/Hero/Hero";

const EASE = [0.22, 1, 0.36, 1] as const;

const VALUES = [
  {
    title: "Compromiso",
    description: "Con la comunidad y la ética profesional.",
    Icon: FaHeart,
    tone: "warm",
  },
  {
    title: "Transparencia",
    description: "En la gestión y en la comunicación.",
    Icon: FaMagnifyingGlass,
    tone: "cool",
  },
  {
    title: "Colaboración",
    description: "Trabajo colaborativo y enfoque en la mejora continua.",
    Icon: FaHandshake,
    tone: "warm",
  },
  {
    title: "Innovación",
    description: "Para brindar mejores servicios y experiencias.",
    Icon: FaLightbulb,
    tone: "cool",
  },
] as const;

const HIGHLIGHT_CARDS = [
  {
    label: "Institución",
    value: "Acompañamiento",
    desc: "Cercanía y soporte para la práctica profesional.",
  },
  {
    label: "Gestión",
    value: "Servicios",
    desc: "Herramientas y procesos para simplificar trámites.",
  },
  {
    label: "Comunidad",
    value: "Vínculos",
    desc: "Red profesional y colaboración con el sistema de salud.",
  },
] as const;

export default function NosotrosPage() {
  return (
    <div className={styles.page}>
      <PageHero
        title="Nosotros"
        subtitle="Conocé nuestra historia, misión, visión y los valores que nos guían."
        backgroundImage="https://res.cloudinary.com/dcfkgepmp/image/upload/v1762131766/usbg_h8pd8r.png"
      />

      {/* ── Historia ──────────────────────────────────────────────────────── */}
      <section className={styles.sectionWhite}>
        <div className={styles.wrapNarrow}>
          <motion.div
            className={styles.sectionHeader}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <h2 className={styles.h2}>Historia</h2>
          </motion.div>

          <motion.p
            className={styles.lead}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
          >
            Desde nuestros inicios, trabajamos para fortalecer la comunidad
            médica de Corrientes, promoviendo el desarrollo profesional y el
            acceso a servicios que faciliten la práctica diaria.
          </motion.p>

          <div className={styles.highlightGrid} role="list">
            {HIGHLIGHT_CARDS.map(({ label, value, desc }, i) => (
              <motion.div
                key={label}
                className={styles.highlightCard}
                role="listitem"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, ease: EASE, delay: 0.12 + i * 0.08 }}
              >
                <span className={styles.highlightLabel}>{label}</span>
                <span className={styles.highlightValue}>{value}</span>
                <span className={styles.highlightDesc}>{desc}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Misión ───────────────────────────────────────────────────────── */}
      <section className={styles.bandBlue}>
        <div className={styles.wrap}>
          <div className={styles.bandGrid}>
            <motion.div
              className={styles.bandAside}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.65, ease: EASE }}
            >
              <span className={styles.bandKicker}>Nuestra misión</span>
              <h3 className={styles.bandHeading}>🎯 En qué trabajamos</h3>
            </motion.div>

            <motion.div
              className={styles.bandBody}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.65, ease: EASE, delay: 0.1 }}
            >
              <p>
                Acompañar a las y los profesionales de la salud brindando
                herramientas, representación y servicios que potencien su
                crecimiento, con foco en la calidad, la transparencia y el
                compromiso social.
              </p>
              <p>
                Impulsamos iniciativas que mejoren las condiciones del ejercicio
                profesional y promuevan el bienestar de la comunidad.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Visión ───────────────────────────────────────────────────────── */}
      <section className={styles.bandBlueWithImage}>
        <div className={styles.wrap}>
          <div className={styles.bandGrid}>
            <motion.div
              className={styles.bandAside}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.65, ease: EASE }}
            >
              <span className={styles.bandKicker}>Nuestra visión</span>
              <h3 className={styles.bandHeading}>🔭 Hacia dónde vamos</h3>
            </motion.div>

            <motion.div
              className={styles.bandBody}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.65, ease: EASE, delay: 0.1 }}
            >
              <p>
                Ser una institución de referencia en innovación y calidad de
                servicios, fortaleciendo lazos con entidades públicas y privadas
                para generar impacto positivo y sostenido en el sistema de
                salud.
              </p>
              <p>
                Construimos una red colaborativa que fomenta el desarrollo
                continuo y la excelencia.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Valores ──────────────────────────────────────────────────────── */}
      <section className={styles.sectionWhite}>
        <div className={styles.wrapNarrow}>
          <motion.div
            className={styles.sectionHeader}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <h2 className={styles.h2}>Nuestros valores</h2>
          </motion.div>

          <div className={styles.valuesGrid} role="list">
            {VALUES.map(({ title, description, Icon, tone }, i) => (
              <motion.article
                key={title}
                className={`${styles.valueCard} ${styles[tone]}`}
                role="listitem"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, ease: EASE, delay: i * 0.08 }}
              >
                <div className={styles.valueIcon} aria-hidden="true">
                  <Icon />
                </div>
                <h3 className={styles.valueTitle}>{title}</h3>
                <p className={styles.valueText}>{description}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
