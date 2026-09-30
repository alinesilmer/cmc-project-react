import { motion, useReducedMotion } from "framer-motion";
import styles from "./Hero.module.scss";

interface HeroProps {
  title: string;
  subtitle: string;
  /** Foto de fondo. Sin ella el hero usa el degradé institucional: así una
   * sección sin imagen propia entra igual, sin inventar una que no existe ni
   * sumar otra descarga pesada. */
  backgroundImage?: string;
}

const EASE = [0.22, 1, 0.36, 1] as const;

const Hero = ({ title, subtitle, backgroundImage }: HeroProps) => {
  const reduced = useReducedMotion();

  const fadeUp = {
    hidden: { opacity: 0, y: reduced ? 0 : 22 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <section className={styles.hero} role="img" aria-label={title}>
      {/* Background isolated so CSS zoom doesn't affect text layout */}
      <div
        className={backgroundImage ? styles.bg : `${styles.bg} ${styles.bgLiso}`}
        style={backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : undefined}
        aria-hidden="true"
      />
      <div className={styles.overlay} aria-hidden="true" />

      <div className={styles.content}>
        <motion.h1
          className={styles.title}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.65, ease: EASE }}
        >
          {title}
        </motion.h1>

        <motion.div
          className={styles.divider}
          aria-hidden="true"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.45, ease: EASE, delay: 0.2 }}
        />

        <motion.p
          className={styles.subtitle}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.65, ease: EASE, delay: 0.28 }}
        >
          {subtitle}
        </motion.p>
      </div>
    </section>
  );
};

export default Hero;
