import { motion, useReducedMotion } from "framer-motion";
import styles from "./Hero.module.scss";

interface HeroProps {
  title: string;
  subtitle: string;
  backgroundImage: string;
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
        className={styles.bg}
        style={{ backgroundImage: `url(${backgroundImage})` }}
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
