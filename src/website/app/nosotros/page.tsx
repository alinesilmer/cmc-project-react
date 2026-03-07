import styles from "./nosotros.module.scss";
import { FaHeart, FaHandshake, FaLightbulb } from "react-icons/fa";
import { FaMagnifyingGlass } from "react-icons/fa6";
import PageHero from "../../components/UI/Hero/Hero";

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

export default function NosotrosPage() {
  return (
    <div className={styles.page}>
      <PageHero
        title="Nosotros"
        subtitle="Conocé nuestra historia, misión, visión y los valores que nos guían."
        backgroundImage="https://res.cloudinary.com/dcfkgepmp/image/upload/v1762131766/usbg_h8pd8r.png"
      />

      <section className={styles.sectionWhite}>
        <div className={styles.wrapNarrow}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.h2}>Historia</h2>
          </div>

          <p className={styles.lead}>
            Desde nuestros inicios, trabajamos para fortalecer la comunidad
            médica de Corrientes, promoviendo el desarrollo profesional y el
            acceso a servicios que faciliten la práctica diaria.
          </p>

          <div className={styles.highlightGrid} role="list">
            <div className={styles.highlightCard} role="listitem">
              <span className={styles.highlightLabel}>Institución</span>
              <span className={styles.highlightValue}>Acompañamiento</span>
              <span className={styles.highlightDesc}>
                Cercanía y soporte para la práctica profesional.
              </span>
            </div>

            <div className={styles.highlightCard} role="listitem">
              <span className={styles.highlightLabel}>Gestión</span>
              <span className={styles.highlightValue}>Servicios</span>
              <span className={styles.highlightDesc}>
                Herramientas y procesos para simplificar trámites.
              </span>
            </div>

            <div className={styles.highlightCard} role="listitem">
              <span className={styles.highlightLabel}>Comunidad</span>
              <span className={styles.highlightValue}>Vínculos</span>
              <span className={styles.highlightDesc}>
                Red profesional y colaboración con el sistema de salud.
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.bandBlue}>
        <div className={styles.wrap}>
          <div className={styles.bandGrid}>
            <div className={styles.bandAside}>
              <span className={styles.bandKicker}>Nuestra misión</span>
              <h3 className={styles.bandHeading}>🎯 En qué trabajamos</h3>
            </div>

            <div className={styles.bandBody}>
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
            </div>
          </div>
        </div>
      </section>

      <section className={styles.bandBlueWithImage}>
        <div className={styles.wrap}>
          <div className={styles.bandGrid}>
            <div className={styles.bandAside}>
              <span className={styles.bandKicker}>Nuestra visión</span>
              <h3 className={styles.bandHeading}>🔭 Hacia dónde vamos</h3>
            </div>

            <div className={styles.bandBody}>
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
            </div>

          
          </div>
        </div>
      </section>

      <section className={styles.sectionWhite}>
        <div className={styles.wrapNarrow}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.h2}>Nuestros valores</h2>
          </div>

          <div className={styles.valuesGrid} role="list">
            {VALUES.map(({ title, description, Icon, tone }) => (
              <article
                key={title}
                className={`${styles.valueCard} ${styles[tone]}`}
                role="listitem"
              >
                <div className={styles.valueIcon} aria-hidden="true">
                  <Icon />
                </div>
                <h3 className={styles.valueTitle}>{title}</h3>
                <p className={styles.valueText}>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}